// Invites a user to an organization by email.
//
// Auth: requires an authenticated caller who is either:
//   - platform_admin, or
//   - org_admin of the target organization
//
// Enforces `organizations.user_limit`: active memberships (student + org_admin,
// excluding platform_admin) + pending invites must remain <= user_limit.
//
// Payload (POST JSON):
//   { organization_id: uuid, email: string, role?: "student"|"org_admin", full_name?: string }
//
// Flow:
//   1. Validate caller & permissions.
//   2. Check user_limit capacity.
//   3. Insert organization_invites row (idempotent per org+email pending).
//   4. If profile exists → attach membership immediately.
//      Else → auth.admin.inviteUserByEmail so user sets password on first login.
//   5. Audit log.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  organization_id?: string;
  email?: string;
  role?: "student" | "org_admin";
  full_name?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Missing bearer token" }, 401);
  }

  // Client that respects the caller's JWT (used to identify who is calling).
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userRes, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "Invalid session" }, 401);
  const caller = userRes.user;

  let body: Payload;
  try { body = (await req.json()) as Payload; } catch { return json({ error: "Invalid JSON" }, 400); }

  const organizationId = (body.organization_id ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role ?? "student";
  if (!organizationId || !email) return json({ error: "organization_id and email are required" }, 400);
  if (role !== "student" && role !== "org_admin") return json({ error: "invalid role" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "invalid email" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Verify caller permission via SECURITY DEFINER helpers.
  const { data: isPlatformAdmin } = await admin.rpc("is_platform_admin", { _user_id: caller.id });
  const { data: isOrgAdmin } = await admin.rpc("has_org_role", {
    _user_id: caller.id, _org_id: organizationId, _role: "org_admin",
  });
  if (!isPlatformAdmin && !isOrgAdmin) return json({ error: "Forbidden" }, 403);

  // Load organization + user_limit.
  const { data: org, error: orgErr } = await admin
    .from("organizations").select("id, name, user_limit, status").eq("id", organizationId).maybeSingle();
  if (orgErr) return json({ error: orgErr.message }, 500);
  if (!org) return json({ error: "Organization not found" }, 404);
  if (org.status !== "active") return json({ error: "Organization is not active" }, 400);

  // Count active seats (exclude platform_admin) + pending invites.
  const { count: memberCount } = await admin
    .from("organization_memberships")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .in("role", ["student", "org_admin"]);
  const { count: pendingCount } = await admin
    .from("organization_invites")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  const seatsUsed = (memberCount ?? 0) + (pendingCount ?? 0);
  if (org.user_limit != null && seatsUsed >= org.user_limit) {
    return json({
      error: "user_limit_reached",
      message: `Limite de usuários atingido (${seatsUsed}/${org.user_limit}) para ${org.name}.`,
      seats_used: seatsUsed, user_limit: org.user_limit,
    }, 409);
  }

  // Resolve existing profile by email (if user already exists in the platform).
  const { data: existingProfile } = await admin
    .from("profiles").select("id").eq("email", email).maybeSingle();

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

  // Idempotency: reuse a pending invite for the same org+email if present.
  const { data: existingInvite } = await admin
    .from("organization_invites")
    .select("id, status")
    .eq("organization_id", organizationId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  let inviteId = existingInvite?.id ?? null;
  if (!inviteId) {
    const { data: inv, error: invErr } = await admin.from("organization_invites").insert({
      organization_id: organizationId,
      email,
      role,
      token,
      status: "pending",
      invited_by: caller.id,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    }).select("id").single();
    if (invErr) return json({ error: invErr.message }, 500);
    inviteId = inv.id;
  }

  let userId: string | null = existingProfile?.id ?? null;
  let invitedByEmail = false;

  if (userId) {
    // Attach membership right away for existing users.
    const { error: memErr } = await admin.from("organization_memberships").upsert(
      { organization_id: organizationId, user_id: userId, role, is_active: true },
      { onConflict: "organization_id,user_id" },
    );
    if (memErr) return json({ error: memErr.message }, 500);
    await admin.from("organization_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", inviteId);
  } else {
    // Send invite email via Supabase Auth (user sets password on first access).
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: body.full_name ?? null, organization_id: organizationId, role },
    });
    if (inviteErr || !invited?.user) {
      return json({ error: `Could not send invite email: ${inviteErr?.message ?? "unknown"}` }, 500);
    }
    userId = invited.user.id;
    invitedByEmail = true;
    // Membership will be attached when the user finishes signup (or via a
    // trigger). We optimistically create it so seats reflect immediately.
    const { error: memErr } = await admin.from("organization_memberships").upsert(
      { organization_id: organizationId, user_id: userId, role, is_active: true },
      { onConflict: "organization_id,user_id" },
    );
    if (memErr) return json({ error: memErr.message }, 500);
    // Mark the invite accepted so it does not double-count against the seat
    // limit (the optimistic membership above already counts as 1 seat).
    await admin.from("organization_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", inviteId);
  }

  await admin.from("audit_logs").insert({
    actor_user_id: caller.id,
    action: "invite_user",
    entity_type: "organization_invite",
    entity_id: inviteId,
    metadata: { organization_id: organizationId, email, role, invited_by_email: invitedByEmail },
  });

  return json({
    ok: true,
    invite_id: inviteId,
    user_id: userId,
    invited_by_email: invitedByEmail,
    seats_used: seatsUsed + (existingInvite ? 0 : 1),
    user_limit: org.user_limit,
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}