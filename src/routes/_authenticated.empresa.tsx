import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";

export const Route = createFileRoute("/_authenticated/empresa")({
  ssr: false,
  component: EmpresaPage,
});

type Member = {
  id: string;
  user_id: string;
  role: "student" | "org_admin" | "platform_admin";
  is_active: boolean;
  created_at: string;
  profiles?: { email: string | null; full_name: string | null } | null;
};

type Invite = {
  id: string;
  email: string;
  role: "student" | "org_admin";
  status: "pending" | "accepted" | "revoked" | "expired";
  created_at: string;
  expires_at: string | null;
};

function EmpresaPage() {
  const { session, memberships, isPlatformAdmin, loading: authLoading } = useAuth();
  const { tenant } = useTenant();

  // Choose which org this admin is managing (falls back to first org_admin membership).
  const adminOrgIds = useMemo(
    () => memberships.filter((m) => m.role === "org_admin").map((m) => m.organization_id),
    [memberships],
  );
  const orgId = tenant?.organization?.id && (adminOrgIds.includes(tenant.organization.id) || isPlatformAdmin)
    ? tenant.organization.id
    : adminOrgIds[0] ?? null;

  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "org_admin">("student");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const canAccess = isPlatformAdmin || adminOrgIds.length > 0;

  const refresh = async () => {
    if (!orgId) return;
    setLoading(true);
    const { data: o } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();
    setOrg(o);
    const { data: mems } = await supabase.from("organization_memberships")
      .select("id, user_id, role, is_active, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    const rows = (mems ?? []) as Omit<Member, "profiles">[];
    const userIds = rows.map((r) => r.user_id);
    let profileMap: Record<string, { email: string | null; full_name: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("id, email, full_name").in("id", userIds);
      (profs ?? []).forEach((p: any) => { profileMap[p.id] = { email: p.email, full_name: p.full_name }; });
    }
    setMembers(rows.map((r) => ({ ...r, profiles: profileMap[r.user_id] ?? null })));
    const { data: invs } = await supabase.from("organization_invites")
      .select("id, email, role, status, created_at, expires_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    setInvites((invs as Invite[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (orgId) refresh(); }, [orgId]);

  if (authLoading) return <Shell><p className="brand-text-muted">Carregando…</p></Shell>;
  if (!canAccess) {
    throw redirect({ to: "/inicio" });
  }
  if (!orgId) return <Shell><p className="brand-text-muted">Nenhuma organização vinculada.</p></Shell>;

  const activeSeats = members.filter((m) => m.is_active && m.role !== "platform_admin").length;
  const pendingSeats = invites.filter((i) => i.status === "pending").length;
  const seatsUsed = activeSeats + pendingSeats;
  const seatsLimit = org?.user_limit ?? null;
  const seatsLeft = seatsLimit != null ? seatsLimit - seatsUsed : null;

  const invite = async () => {
    if (!session || !orgId) return;
    setBusy(true); setMessage(null);
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: { organization_id: orgId, email: email.trim().toLowerCase(), role },
    });
    setBusy(false);
    if (error) {
      const ctx = (error as any).context;
      let text = error.message;
      if (ctx && typeof ctx.json === "function") {
        try { const j = await ctx.json(); text = j?.message ?? j?.error ?? text; } catch {}
      }
      setMessage({ kind: "err", text });
      return;
    }
    setMessage({ kind: "ok", text: (data as any)?.invited_by_email
      ? `Convite enviado para ${email}.`
      : `${email} já existia — vinculado à organização.` });
    setEmail("");
    await refresh();
  };

  const revoke = async (id: string) => {
    await supabase.from("organization_invites").update({ status: "revoked" }).eq("id", id);
    refresh();
  };

  const deactivate = async (m: Member) => {
    await supabase.from("organization_memberships").update({ is_active: !m.is_active }).eq("id", m.id);
    refresh();
  };

  return (
    <Shell>
      <div className="flex items-baseline justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Empresa</h1>
          <p className="brand-text-muted mt-1">{org?.name}</p>
        </div>
        <div className="brand-surface rounded-xl border brand-border px-5 py-3">
          <p className="text-xs brand-text-muted uppercase tracking-widest">Assentos</p>
          <p className="text-2xl font-semibold mt-1">
            {seatsUsed}{seatsLimit != null ? ` / ${seatsLimit}` : ""}
          </p>
          {seatsLeft != null && (
            <p className="text-xs brand-text-muted mt-1">
              {seatsLeft > 0 ? `${seatsLeft} disponível(is)` : "Limite atingido"}
            </p>
          )}
        </div>
      </div>

      <section className="mt-8 brand-surface rounded-xl border brand-border p-6">
        <h2 className="text-lg font-medium">Convidar usuário</h2>
        <p className="text-sm brand-text-muted mt-1">
          Enviaremos um e-mail para o convidado definir a senha. Novos convites contam nos assentos.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@empresa.com"
            className="rounded-lg px-4 py-2.5 brand-surface-2 border brand-border"
          />
          <select value={role} onChange={(e) => setRole(e.target.value as any)}
            className="rounded-lg px-3 py-2.5 brand-surface-2 border brand-border">
            <option value="student">Aluno</option>
            <option value="org_admin">Admin da empresa</option>
          </select>
          <button onClick={invite} disabled={busy || !email}
            className="rounded-lg px-5 py-2.5 brand-btn font-medium disabled:opacity-50">
            {busy ? "Enviando…" : "Convidar"}
          </button>
        </div>
        {message && (
          <p className={`mt-3 text-sm ${message.kind === "err" ? "text-red-400" : "text-emerald-400"}`}>
            {message.text}
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Convites pendentes</h2>
        <div className="mt-3 brand-surface rounded-xl border brand-border overflow-hidden">
          {loading ? <p className="p-4 brand-text-muted text-sm">Carregando…</p> :
            invites.filter((i) => i.status === "pending").length === 0 ? (
              <p className="p-4 brand-text-muted text-sm">Nenhum convite pendente.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs brand-text-muted uppercase">
                  <tr><th className="px-4 py-2">E-mail</th><th className="px-4 py-2">Papel</th><th className="px-4 py-2">Enviado</th><th /></tr>
                </thead>
                <tbody>
                  {invites.filter((i) => i.status === "pending").map((i) => (
                    <tr key={i.id} className="border-t brand-border">
                      <td className="px-4 py-2.5">{i.email}</td>
                      <td className="px-4 py-2.5">{i.role === "org_admin" ? "Admin" : "Aluno"}</td>
                      <td className="px-4 py-2.5 brand-text-muted">{new Date(i.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => revoke(i.id)} className="text-xs brand-text-muted hover:text-white">Revogar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Membros</h2>
        <div className="mt-3 brand-surface rounded-xl border brand-border overflow-hidden">
          {members.length === 0 ? (
            <p className="p-4 brand-text-muted text-sm">Ainda não há membros.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs brand-text-muted uppercase">
                <tr><th className="px-4 py-2">Nome</th><th className="px-4 py-2">E-mail</th><th className="px-4 py-2">Papel</th><th className="px-4 py-2">Status</th><th /></tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t brand-border">
                    <td className="px-4 py-2.5">{m.profiles?.full_name ?? "—"}</td>
                    <td className="px-4 py-2.5">{m.profiles?.email ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {m.role === "platform_admin" ? "Plataforma" : m.role === "org_admin" ? "Admin" : "Aluno"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={m.is_active ? "text-emerald-400" : "brand-text-muted"}>
                        {m.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {m.role !== "platform_admin" && (
                        <button onClick={() => deactivate(m)} className="text-xs brand-text-muted hover:text-white">
                          {m.is_active ? "Desativar" : "Reativar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <TenantDemoSwitcher />
    </div>
  );
}