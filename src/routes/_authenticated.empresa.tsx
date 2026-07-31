import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";
import { BrandingEditor } from "@/components/branding/BrandingEditor";

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

  // CSV bulk import
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvProgress, setCsvProgress] = useState<{ done: number; total: number } | null>(null);
  const [csvReport, setCsvReport] = useState<null | {
    sent: number;
    limitReached: number;
    invalid: number;
    duplicated: number;
    otherErrors: number;
    errors: { email: string; reason: string }[];
  }>(null);

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
  if (!canAccess) return <Navigate to="/inicio" />;
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

  const parseCsv = (text: string): { email: string; role: "student" | "org_admin" }[] => {
    const rows: { email: string; role: "student" | "org_admin" }[] = [];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return rows;
    // Detect delimiter (comma or semicolon)
    const delim = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
    const header = lines[0].toLowerCase().split(delim).map((c) => c.trim());
    const hasHeader = header.includes("email");
    const emailIdx = hasHeader ? header.indexOf("email") : 0;
    const roleIdx = hasHeader ? header.indexOf("role") : 1;
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const seen = new Set<string>();
    for (const line of dataLines) {
      const cols = line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
      const email = (cols[emailIdx] ?? "").toLowerCase();
      if (!email) continue;
      const roleRaw = (roleIdx >= 0 ? cols[roleIdx] : "")?.toLowerCase();
      const role: "student" | "org_admin" = roleRaw === "org_admin" || roleRaw === "admin" ? "org_admin" : "student";
      if (seen.has(email)) continue;
      seen.add(email);
      rows.push({ email, role });
    }
    return rows;
  };

  const importCsv = async (file: File) => {
    if (!session || !orgId) return;
    setCsvBusy(true);
    setCsvReport(null);
    setCsvProgress(null);
    const text = await file.text();
    const rows = parseCsv(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const report = { sent: 0, limitReached: 0, invalid: 0, duplicated: 0, otherErrors: 0, errors: [] as { email: string; reason: string }[] };
    setCsvProgress({ done: 0, total: rows.length });

    for (let i = 0; i < rows.length; i++) {
      const { email, role: r } = rows[i];
      if (!emailRegex.test(email)) {
        report.invalid++;
        report.errors.push({ email, reason: "E-mail inválido" });
        setCsvProgress({ done: i + 1, total: rows.length });
        continue;
      }
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { organization_id: orgId, email, role: r },
      });
      if (error) {
        const ctx = (error as any).context;
        let parsed: any = null;
        if (ctx && typeof ctx.json === "function") {
          try { parsed = await ctx.json(); } catch {}
        }
        const code = parsed?.error ?? "";
        const msg = parsed?.message ?? parsed?.error ?? error.message;
        if (code === "user_limit_reached") report.limitReached++;
        else if (/duplicat|already/i.test(msg)) report.duplicated++;
        else report.otherErrors++;
        report.errors.push({ email, reason: msg });
      } else {
        // Existing user attached — treat as success but flag as duplicate context.
        if ((data as any)?.invited_by_email === false) {
          report.sent++;
        } else {
          report.sent++;
        }
      }
      setCsvProgress({ done: i + 1, total: rows.length });
    }

    setCsvBusy(false);
    setCsvReport(report);
    if (csvInputRef.current) csvInputRef.current.value = "";
    await refresh();
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

        <div className="mt-6 pt-6 border-t brand-border">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-medium">Importar CSV</h3>
              <p className="text-xs brand-text-muted mt-1">
                Colunas aceitas: <code>email</code> (obrigatório) e <code>role</code> (opcional: <code>student</code> ou <code>org_admin</code>, padrão <code>student</code>).
                Cada linha usa a mesma função de convite — respeita o limite de assentos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importCsv(f);
                }}
              />
              <button
                type="button"
                disabled={csvBusy}
                onClick={() => csvInputRef.current?.click()}
                className="rounded-lg px-4 py-2 brand-surface-2 border brand-border text-sm hover:opacity-90 disabled:opacity-50"
              >
                {csvBusy ? "Importando…" : "Importar CSV"}
              </button>
            </div>
          </div>
          {csvBusy && csvProgress && (
            <p className="mt-3 text-xs brand-text-muted">
              Processando {csvProgress.done} de {csvProgress.total}…
            </p>
          )}
          {csvReport && (
            <div className="mt-4 rounded-lg brand-surface-2 border brand-border p-4 text-sm">
              <p className="font-medium">Resumo da importação</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li className="text-emerald-400">✓ {csvReport.sent} convite(s) enviado(s) / vinculado(s)</li>
                <li>• {csvReport.limitReached} bloqueado(s) por limite de assentos</li>
                <li>• {csvReport.invalid} e-mail(is) inválido(s)</li>
                <li>• {csvReport.duplicated} duplicado(s) / já existente(s)</li>
                <li>• {csvReport.otherErrors} outro(s) erro(s)</li>
              </ul>
              {csvReport.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer brand-text-muted text-xs">Ver detalhes de falhas ({csvReport.errors.length})</summary>
                  <ul className="mt-2 space-y-1 text-xs max-h-48 overflow-auto">
                    {csvReport.errors.map((e, idx) => (
                      <li key={idx} className="brand-text-muted">
                        <span className="text-red-400">{e.email}</span> — {e.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
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

      <section className="mt-10">
        <h2 className="text-lg font-medium">Marca da empresa</h2>
        <p className="text-sm brand-text-muted mt-1">
          Ajustes aqui aparecem apenas para os alunos desta organização. Você só consegue
          editar a marca da sua própria empresa — o banco recusa qualquer outra tentativa.
        </p>
        <div className="mt-4 brand-surface rounded-xl border brand-border p-6">
          <BrandingEditor organizationId={orgId} />
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-console">
      <AdminHeader subtitle="Gestão da empresa" />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <TenantDemoSwitcher />
    </div>
  );
}