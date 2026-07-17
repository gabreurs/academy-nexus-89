// Public webhook: grants course_entitlement to a buyer identified by email.
//
// STATUS: generic payload — ready to be wired to Kiwify (or Hotmart/Eduzz/Stripe)
// as soon as the real credentials are available. See INTEGRATION_GUIDE.md.
//
// Expected payload (POST JSON):
//   {
//     "event": "purchase.approved",   // only this event is honored today
//     "email": "buyer@example.com",   // required
//     "full_name": "Buyer Name",      // optional — used when creating the profile
//     "course_slug": "atendimento-guarida", // required — resolves the course
//     "external_order_id": "kw_123",  // optional — stored for auditing/idempotency
//     "source": "kiwify"              // optional — e.g. "kiwify" | "hotmart" | "manual"
//   }
//
// SECURITY: expects a shared secret in the "x-webhook-secret" header,
// matched against the CHECKOUT_WEBHOOK_SECRET env var. When Kiwify credentials
// arrive, replace this with the real HMAC signature check they document.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  event?: string;
  email?: string;
  full_name?: string;
  course_slug?: string;
  external_order_id?: string;
  source?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const expected = Deno.env.get("CHECKOUT_WEBHOOK_SECRET");
  const provided = req.headers.get("x-webhook-secret");
  if (expected && provided !== expected) {
    return json({ error: "Invalid webhook secret" }, 401);
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const event = body.event ?? "purchase.approved";
  if (event !== "purchase.approved") {
    // Acknowledge non-actionable events so the provider stops retrying.
    return json({ ok: true, ignored: event });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const courseSlug = (body.course_slug ?? "").trim();
  if (!email || !courseSlug) {
    return json({ error: "email and course_slug are required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1. Resolve course.
  const { data: course, error: courseErr } = await admin
    .from("courses").select("id, title").eq("slug", courseSlug).maybeSingle();
  if (courseErr) return json({ error: courseErr.message }, 500);
  if (!course) return json({ error: `Course not found: ${courseSlug}` }, 404);

  // 2. Resolve or invite user by email.
  let userId: string | null = null;
  const { data: existingProfile } = await admin
    .from("profiles").select("id").eq("email", email).maybeSingle();
  if (existingProfile) {
    userId = existingProfile.id;
  } else {
    // Send an invite email — user sets password on first access.
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: body.full_name ?? null },
    });
    if (inviteErr || !invited?.user) {
      // Fallback: create the user directly (still requires a password reset).
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: body.full_name ?? null },
      });
      if (createErr || !created?.user) {
        return json({ error: `Could not provision user: ${inviteErr?.message ?? createErr?.message}` }, 500);
      }
      userId = created.user.id;
    } else {
      userId = invited.user.id;
    }
  }

  // 3. Grant entitlement (idempotent on user_id + course_id).
  const { error: entErr } = await admin.from("course_entitlements").upsert(
    {
      user_id: userId,
      course_id: course.id,
      source: body.source ?? "external_checkout",
    },
    { onConflict: "user_id,course_id" },
  );
  if (entErr) return json({ error: entErr.message }, 500);

  // 4. Audit trail (external order id lives here for traceability).
  await admin.from("audit_logs").insert({
    actor_user_id: null,
    action: "checkout_webhook.grant_entitlement",
    entity_type: "course_entitlement",
    entity_id: course.id,
    metadata: {
      email,
      course_slug: courseSlug,
      external_order_id: body.external_order_id ?? null,
      source: body.source ?? null,
    },
  });

  return json({ ok: true, user_id: userId, course_id: course.id });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}