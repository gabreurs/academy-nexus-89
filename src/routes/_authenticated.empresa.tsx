import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";
import { BrandingEditor } from "@/components/branding/BrandingEditor";
import { ConsoleShell, type ConsoleNavGroup } from "@/components/console/ConsoleShell";
import {
  Badge, Button, Card, ConfirmAction, EmptyState, Field, Input, PageHeader,
  SaveState, SearchInput, Select, Stat, TableSkeleton, TableWrap,
} from "@/components/console/ui";

export const Route = createFileRoute("/_authenticated/empresa")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel da Academy — SíndicoLab" },
      { name: "description", content: "Gerencie membros, convites, catálogo e marca da Academy da sua empresa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmpresaPage,
});

type Member = {
  id: string; user_id: string;
  role: "student" | "org_admin" | "platform_admin";
  is_active: boolean; created_at: string;
  profiles?: { email: string | null; full_name: string | null } | null;
};
type Invite = {
  id: string; email: string; role: "student" | "org_admin";
  status: "pending" | "accepted" | "revoked" | "expired";
  created_at: string; expires_at: string | null;
};
type AccessRequest = {
  id: string; full_name: string; email: string; phone: string | null;
  affiliation: string | null; message: string | null;
  status: "pending" | "approved" | "rejected";
  review_note: string | null; reviewed_at: string | null; created_at: string;
};
type CatalogRow = {
  course_id: string; is_required: boolean; auto_enroll: boolean;
  courses?: { title: string; slug: string; status: string } | null;
};

const NAV: ConsoleNavGroup[] = [
  { label: "Academy", items: [
    { id: "visao", label: "Visão geral" },
    { id: "catalogo", label: "Cursos publicados" },
  ] },
  { label: "Pessoas", items: [
    { id: "membros", label: "Membros" },
    { id: "convites", label: "Convites" },
    { id: "solicitacoes", label: "Solicitações de acesso" },
    { id: "importar", label: "Importar CSV" },
  ] },
  { label: "Configuração", items: [
    { id: "marca", label: "Marca da Academy" },
    { id: "config", label: "Domínio e ambiente" },
  ] },
];

function EmpresaPage() {
  const { session, memberships, isPlatformAdmin, loading: authLoading } = useAuth();
  const { tenant } = useTenant();
  const [section, setSection] = useState("visao");

  const adminOrgIds = useMemo(
    () => memberships.filter((m) => m.role === "org_admin").map((m) => m.organization_id),
    [memberships],
  );
  const orgId = tenant?.organization?.id && (adminOrgIds.includes(tenant.organization.id) || isPlatformAdmin)
    ? tenant.organization.id
    : adminOrgIds[0] ?? null;

  const [org, setOrg] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [domains, setDomains] = useState<{ id: string; hostname: string; is_primary: boolean }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [reqFilter, setReqFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [reqBusyId, setReqBusyId] = useState<string | null>(null);
  const [reqMessage, setReqMessage] = useState<null | { kind: "ok" | "err" | "busy"; text: string }>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "org_admin">("student");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<null | { kind: "ok" | "err" | "busy"; text: string }>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberRole, setMemberRole] = useState<"all" | "student" | "org_admin">("all");

  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvProgress, setCsvProgress] = useState<{ done: number; total: number } | null>(null);
  const [csvReport, setCsvReport] = useState<null | {
    sent: number; limitReached: number; invalid: number; duplicated: number;
    otherErrors: number; errors: { email: string; reason: string }[];
  }>(null);

  const canAccess = isPlatformAdmin || adminOrgIds.length > 0;

  const refresh = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [{ data: o }, { data: b }, { data: doms }, { data: mems }, { data: invs }, { data: cat }, { data: reqs }] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
      supabase.from("organization_branding").select("*").eq("organization_id", orgId).maybeSingle(),
      supabase.from("organization_domains").select("id, hostname, is_primary").eq("organization_id", orgId),
      supabase.from("organization_memberships")
        .select("id, user_id, role, is_active, created_at")
        .eq("organization_id", orgId).order("created_at", { ascending: false }),
      supabase.from("organization_invites")
        .select("id, email, role, status, created_at, expires_at")
        .eq("organization_id", orgId).order("created_at", { ascending: false }),
      supabase.from("organization_course_catalog")
        .select("course_id, is_required, auto_enroll, courses(title, slug, status)")
        .eq("organization_id", orgId).eq("is_visible", true),
      supabase.from("access_requests")
        .select("id, full_name, email, phone, affiliation, message, status, review_note, reviewed_at, created_at")
        .eq("organization_id", orgId).order("created_at", { ascending: false }),
    ]);
    setOrg(o); setBranding(b); setDomains(doms ?? []);
    const rows = (mems ?? []) as Omit<Member, "profiles">[];
    const userIds = rows.map((r) => r.user_id);
    const profileMap: Record<string, { email: string | null; full_name: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", userIds);
      (profs ?? []).forEach((p: any) => { profileMap[p.id] = { email: p.email, full_name: p.full_name }; });
    }
    setMembers(rows.map((r) => ({ ...r, profiles: profileMap[r.user_id] ?? null })));
    setInvites((invs as Invite[]) ?? []);
    setCatalog((cat as any as CatalogRow[]) ?? []);
    setRequests((reqs as any as AccessRequest[]) ?? []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { if (orgId) refresh(); }, [orgId, refresh]);

  if (authLoading) {
    return (
      <ConsoleShell kicker="Painel da Academy" title="SíndicoLab" nav={NAV} active="visao" onNavigate={() => {}}>
        <TableSkeleton rows={5} cols={4} />
      </ConsoleShell>
    );
  }
  if (!canAccess) return <Navigate to="/inicio" />;
  if (!orgId) {
    return (
      <ConsoleShell kicker="Painel da Academy" title="SíndicoLab" nav={NAV} active="visao" onNavigate={() => {}}>
        <EmptyState title="Nenhuma organização vinculada" description="Sua conta ainda não administra uma Academy." />
      </ConsoleShell>
    );
  }

  const activeSeats = members.filter((m) => m.is_active && m.role !== "platform_admin").length;
  const pendingSeats = invites.filter((i) => i.status === "pending").length;
  const seatsUsed = activeSeats + pendingSeats;
  const seatsLimit = org?.user_limit ?? null;
  const seatsLeft = seatsLimit != null ? seatsLimit - seatsUsed : null;
  const admins = members.filter((m) => m.role === "org_admin" && m.is_active).length;

  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const visibleRequests = reqFilter === "all" ? requests : requests.filter((r) => r.status === reqFilter);

  const filteredMembers = members.filter((m) => {
    const q = memberQuery.trim().toLowerCase();
    const matchesQ = !q || (m.profiles?.email ?? "").toLowerCase().includes(q) || (m.profiles?.full_name ?? "").toLowerCase().includes(q);
    return matchesQ && (memberRole === "all" || m.role === memberRole);
  });

  const invite = async () => {
    if (!session || !orgId) return;
    setBusy(true); setMessage({ kind: "busy", text: "" });
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: { organization_id: orgId, email: email.trim().toLowerCase(), role },
    });
    setBusy(false);
    if (error) {
      const ctx = (error as any).context;
      let text = error.message;
      if (ctx && typeof ctx.json === "function") {
        try { const j = await ctx.json(); text = j?.message ?? j?.error ?? text; } catch { /* corpo não-JSON */ }
      }
      setMessage({ kind: "err", text });
      return;
    }
    setMessage({ kind: "ok", text: (data as any)?.invited_by_email
      ? `Convite enviado para ${email}.`
      : `${email} já existia — vinculado à Academy.` });
    setEmail("");
    await refresh();
  };

  const decideRequest = async (req: AccessRequest, decision: "approved" | "rejected", note?: string) => {
    if (!orgId) return;
    setReqBusyId(req.id); setReqMessage({ kind: "busy", text: "" });
    try {
      if (decision === "approved") {
        // Usa o fluxo legítimo de convite/assento da organização.
        const { error } = await supabase.functions.invoke("invite-user", {
          body: { organization_id: orgId, email: req.email, role: "student" },
        });
        if (error) {
          const ctx = (error as any).context;
          let text = error.message;
          if (ctx && typeof ctx.json === "function") {
            try { const j = await ctx.json(); text = j?.message ?? j?.error ?? text; } catch { /* corpo não-JSON */ }
          }
          setReqMessage({ kind: "err", text });
          return;
        }
      }
      const { error: upErr } = await supabase.from("access_requests")
        .update({
          status: decision,
          review_note: note ?? null,
          reviewed_by: session?.user.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", req.id);
      if (upErr) { setReqMessage({ kind: "err", text: upErr.message }); return; }
      setReqMessage({
        kind: "ok",
        text: decision === "approved" ? `Acesso liberado para ${req.email}.` : `Solicitação de ${req.email} recusada.`,
      });
      await refresh();
    } finally {
      setReqBusyId(null);
    }
  };

  const parseCsv = (text: string): { email: string; role: "student" | "org_admin" }[] => {
    const rows: { email: string; role: "student" | "org_admin" }[] = [];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return rows;
    const delim = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
    const header = lines[0].toLowerCase().split(delim).map((c) => c.trim());
    const hasHeader = header.includes("email");
    const emailIdx = hasHeader ? header.indexOf("email") : 0;
    const roleIdx = hasHeader ? header.indexOf("role") : 1;
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const seen = new Set<string>();
    for (const line of dataLines) {
      const cols = line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
      const mail = (cols[emailIdx] ?? "").toLowerCase();
      if (!mail || seen.has(mail)) continue;
      const roleRaw = (roleIdx >= 0 ? cols[roleIdx] : "")?.toLowerCase();
      seen.add(mail);
      rows.push({ email: mail, role: roleRaw === "org_admin" || roleRaw === "admin" ? "org_admin" : "student" });
    }
    return rows;
  };

  const importCsv = async (file: File) => {
    if (!session || !orgId) return;
    setCsvBusy(true); setCsvReport(null); setCsvProgress(null);
    const rows = parseCsv(await file.text());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const report = { sent: 0, limitReached: 0, invalid: 0, duplicated: 0, otherErrors: 0, errors: [] as { email: string; reason: string }[] };
    setCsvProgress({ done: 0, total: rows.length });
    for (let i = 0; i < rows.length; i++) {
      const { email: mail, role: r } = rows[i];
      if (!emailRegex.test(mail)) {
        report.invalid++; report.errors.push({ email: mail, reason: "E-mail inválido" });
        setCsvProgress({ done: i + 1, total: rows.length });
        continue;
      }
      const { error } = await supabase.functions.invoke("invite-user", {
        body: { organization_id: orgId, email: mail, role: r },
      });
      if (error) {
        const ctx = (error as any).context;
        let parsed: any = null;
        if (ctx && typeof ctx.json === "function") { try { parsed = await ctx.json(); } catch { /* corpo não-JSON */ } }
        const code = parsed?.error ?? "";
        const text = parsed?.message ?? parsed?.error ?? error.message;
        if (code === "user_limit_reached") report.limitReached++;
        else if (/duplicat|already/i.test(text)) report.duplicated++;
        else report.otherErrors++;
        report.errors.push({ email: mail, reason: text });
      } else {
        report.sent++;
      }
      setCsvProgress({ done: i + 1, total: rows.length });
    }
    setCsvReport(report);
    setCsvBusy(false);
    await refresh();
  };

  const brandMark = {
    name: org?.name ?? "Academy",
    logoUrl: branding?.logo_light_url ?? branding?.logo_dark_url ?? null,
    accent: branding?.accent_color ?? null,
  };

  const seatTone = seatsLeft != null && seatsLeft <= 0 ? "danger" : seatsLeft != null && seatsLeft <= 3 ? "warn" : undefined;

  return (
    <ConsoleShell
      kicker="Painel da Academy"
      title={org?.name ?? "Academy"}
      nav={NAV}
      active={section}
      onNavigate={setSection}
      brand={brandMark}
      footer={<p>Você administra apenas esta organização. Os dados de outras Academies são inacessíveis.</p>}
    >
      {section === "visao" && (
        <>
          <PageHeader
            title="Visão geral"
            description="Como está a Academy da sua empresa hoje."
            actions={
              <>
                <Button size="sm" onClick={refresh}>Atualizar</Button>
                <Button size="sm" variant="primary" onClick={() => setSection("convites")}>Convidar pessoa</Button>
              </>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Stat
              label="Assentos"
              value={`${seatsUsed}${seatsLimit != null ? ` / ${seatsLimit}` : ""}`}
              tone={seatTone as any}
              hint={seatsLeft == null ? "Sem limite definido" : seatsLeft > 0 ? `${seatsLeft} disponível(is)` : "Limite atingido"}
            />
            <Stat label="Membros ativos" value={activeSeats} hint={`${admins} admin(s) da empresa`} />
            <Stat label="Convites pendentes" value={pendingSeats} tone={pendingSeats ? "warn" : undefined} hint={pendingSeats ? "Ocupam assento" : "Nada pendente"} />
            <Stat label="Solicitações pendentes" value={pendingRequests} tone={pendingRequests ? "warn" : undefined} hint="Aguardando aprovação" />
            <Stat label="Cursos publicados" value={catalog.length} hint="Visíveis para seus alunos" />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card title="Últimos membros" padded={false} actions={<Button size="sm" variant="ghost" onClick={() => setSection("membros")}>Ver todos</Button>}>
              {loading ? <TableSkeleton /> : members.length === 0 ? (
                <EmptyState title="Nenhum membro ainda" description="Convide sua equipe para começar." action={<Button variant="primary" size="sm" onClick={() => setSection("convites")}>Convidar</Button>} />
              ) : (
                <TableWrap>
                  <table className="c-table">
                    <thead><tr><th>Pessoa</th><th>Papel</th><th>Status</th></tr></thead>
                    <tbody>
                      {members.slice(0, 6).map((m) => (
                        <tr key={m.id}>
                          <td>
                            <span className="font-medium">{m.profiles?.full_name ?? m.profiles?.email ?? "—"}</span>
                            <span className="ml-2 text-xs c-muted">{m.profiles?.email}</span>
                          </td>
                          <td>{m.role === "platform_admin" ? "Plataforma" : m.role === "org_admin" ? "Admin" : "Aluno"}</td>
                          <td>{m.is_active ? <Badge tone="ok">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Card>

            <Card title="Identidade da Academy" description="O que seus alunos veem hoje." >
              <div className="flex items-center gap-3">
                {brandMark.logoUrl ? (
                  <img src={brandMark.logoUrl} alt={`Logo ${brandMark.name}`} className="h-9 w-auto max-w-[140px] object-contain" />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-md text-xs" style={{ background: brandMark.accent ?? "var(--c-surface-2)" }} aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{branding?.environment_name || brandMark.name}</p>
                  <p className="truncate text-xs c-muted">{domains.find((d) => d.is_primary)?.hostname ?? domains[0]?.hostname ?? "sem domínio próprio"}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setSection("marca")}>Editar marca</Button>
                {org?.slug && <a className="c-btn" data-variant="ghost" data-size="sm" href={`/demo/${org.slug}`}>Ver Academy</a>}
              </div>
            </Card>
          </div>
        </>
      )}

      {section === "catalogo" && (
        <>
          <PageHeader
            title="Cursos publicados"
            description="Cursos liberados pela plataforma para a sua Academy. Para incluir novos cursos, fale com a SíndicoLab."
          />
          <Card padded={false}>
            {loading ? <TableSkeleton /> : catalog.length === 0 ? (
              <EmptyState title="Nenhum curso publicado" description="Sua Academy ainda não tem cursos liberados." />
            ) : (
              <TableWrap>
                <table className="c-table">
                  <thead><tr><th>Curso</th><th>Status</th><th>Obrigatório</th><th>Matrícula automática</th></tr></thead>
                  <tbody>
                    {catalog.map((c) => (
                      <tr key={c.course_id}>
                        <td className="font-medium">{c.courses?.title ?? c.course_id}</td>
                        <td><Badge tone={c.courses?.status === "published" ? "ok" : undefined}>{c.courses?.status ?? "—"}</Badge></td>
                        <td>{c.is_required ? <Badge tone="info">Sim</Badge> : <span className="c-muted">Não</span>}</td>
                        <td>{c.auto_enroll ? "Sim" : <span className="c-muted">Não</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </>
      )}

      {section === "membros" && (
        <>
          <PageHeader
            title="Membros"
            description="Quem tem acesso à Academy da empresa."
            actions={
              <>
                <SearchInput value={memberQuery} onChange={setMemberQuery} placeholder="Buscar por nome ou e-mail" className="w-60" />
                <Select value={memberRole} onChange={(e) => setMemberRole(e.target.value as any)} className="!mt-0 w-40">
                  <option value="all">Todos os papéis</option>
                  <option value="student">Alunos</option>
                  <option value="org_admin">Admins</option>
                </Select>
              </>
            }
          />
          <Card padded={false}>
            {loading ? <TableSkeleton rows={6} cols={5} /> : filteredMembers.length === 0 ? (
              <EmptyState title="Nenhum membro encontrado" description="Ajuste a busca ou convide novas pessoas." />
            ) : (
              <TableWrap>
                <table className="c-table">
                  <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Desde</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {filteredMembers.map((m) => (
                      <tr key={m.id}>
                        <td className="font-medium">{m.profiles?.full_name ?? "—"}</td>
                        <td className="c-muted">{m.profiles?.email ?? "—"}</td>
                        <td>{m.role === "platform_admin" ? "Plataforma" : m.role === "org_admin" ? "Admin" : "Aluno"}</td>
                        <td className="c-muted">{new Date(m.created_at).toLocaleDateString("pt-BR")}</td>
                        <td>{m.is_active ? <Badge tone="ok">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                        <td className="text-right">
                          {m.role !== "platform_admin" && (
                            m.is_active ? (
                              <ConfirmAction
                                label="Desativar"
                                question="Revogar acesso deste membro?"
                                confirmLabel="Desativar"
                                onConfirm={async () => {
                                  await supabase.from("organization_memberships").update({ is_active: false }).eq("id", m.id);
                                  refresh();
                                }}
                              />
                            ) : (
                              <Button size="sm" onClick={async () => {
                                await supabase.from("organization_memberships").update({ is_active: true }).eq("id", m.id);
                                refresh();
                              }}>Reativar</Button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </>
      )}

      {section === "convites" && (
        <>
          <PageHeader title="Convites" description="Cada convite pendente ocupa um assento até ser aceito ou revogado." />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card title="Convites pendentes" padded={false}>
              {loading ? <TableSkeleton /> : invites.filter((i) => i.status === "pending").length === 0 ? (
                <EmptyState title="Nenhum convite pendente" description="Convide alguém no painel ao lado." />
              ) : (
                <TableWrap>
                  <table className="c-table">
                    <thead><tr><th>E-mail</th><th>Papel</th><th>Enviado</th><th /></tr></thead>
                    <tbody>
                      {invites.filter((i) => i.status === "pending").map((i) => (
                        <tr key={i.id}>
                          <td className="font-medium">{i.email}</td>
                          <td>{i.role === "org_admin" ? "Admin" : "Aluno"}</td>
                          <td className="c-muted">{new Date(i.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="text-right">
                            <ConfirmAction
                              label="Revogar"
                              question="Revogar convite e liberar o assento?"
                              onConfirm={async () => {
                                await supabase.from("organization_invites").update({ status: "revoked" }).eq("id", i.id);
                                refresh();
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Card>

            <Card title="Convidar pessoa" description="Enviamos um e-mail para o convidado definir a senha.">
              <div className="grid gap-3">
                <Field label="E-mail">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" />
                </Field>
                <Field label="Papel">
                  <Select value={role} onChange={(e) => setRole(e.target.value as any)}>
                    <option value="student">Aluno</option>
                    <option value="org_admin">Admin da empresa</option>
                  </Select>
                </Field>
                <div className="flex items-center gap-3">
                  <Button variant="primary" onClick={invite} disabled={busy || !email}>Enviar convite</Button>
                  <SaveState state={message} />
                </div>
                {seatsLeft != null && seatsLeft <= 0 && (
                  <p className="text-xs" style={{ color: "var(--c-danger)" }}>Limite de assentos atingido — libere um assento antes de convidar.</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {section === "solicitacoes" && (
        <>
          <PageHeader
            title="Solicitações de acesso"
            description="Pedidos enviados por quem acessou a Academy sem ter acesso liberado."
            actions={
              <>
                <Select value={reqFilter} onChange={(e) => setReqFilter(e.target.value as any)} className="!mt-0 w-44">
                  <option value="pending">Pendentes</option>
                  <option value="approved">Aprovadas</option>
                  <option value="rejected">Recusadas</option>
                  <option value="all">Todas</option>
                </Select>
                <Button size="sm" onClick={refresh}>Atualizar</Button>
              </>
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Pendentes" value={pendingRequests} tone={pendingRequests ? "warn" : undefined} hint="Aguardando decisão" />
            <Stat label="Aprovadas" value={requests.filter((r) => r.status === "approved").length} hint="Viraram convite/assento" />
            <Stat label="Assentos livres" value={seatsLeft ?? "sem limite"} tone={seatTone as any} hint="Aprovar consome assento" />
          </div>

          <div className="mt-4 flex justify-end"><SaveState state={reqMessage} /></div>

          <Card padded={false}>
            {loading ? <TableSkeleton rows={5} cols={5} /> : visibleRequests.length === 0 ? (
              <EmptyState
                title="Nenhuma solicitação"
                description="Quando alguém pedir acesso pela sua Academy, o pedido aparece aqui."
              />
            ) : (
              <TableWrap>
                <table className="c-table">
                  <thead>
                    <tr><th>Pessoa</th><th>Vínculo</th><th>Enviado em</th><th>Status</th><th /></tr>
                  </thead>
                  <tbody>
                    {visibleRequests.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className="font-medium">{r.full_name}</span>
                          <span className="block text-xs c-muted">{r.email}{r.phone ? ` · ${r.phone}` : ""}</span>
                          {r.message && <span className="mt-1 block max-w-[46ch] text-xs c-muted">“{r.message}”</span>}
                        </td>
                        <td className="c-muted">{r.affiliation ?? "—"}</td>
                        <td className="c-muted">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                        <td>
                          {r.status === "pending" ? <Badge tone="warn">Pendente</Badge>
                            : r.status === "approved" ? <Badge tone="ok">Aprovada</Badge>
                            : <Badge tone="danger">Recusada</Badge>}
                        </td>
                        <td className="text-right">
                          {r.status === "pending" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={reqBusyId === r.id || (seatsLeft != null && seatsLeft <= 0)}
                                onClick={() => decideRequest(r, "approved")}
                              >
                                Aprovar acesso
                              </Button>
                              <ConfirmAction
                                label="Recusar"
                                question="Recusar esta solicitação?"
                                confirmLabel="Recusar"
                                onConfirm={() => decideRequest(r, "rejected")}
                              />
                            </div>
                          ) : (
                            <span className="text-xs c-muted">
                              {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString("pt-BR") : "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>

          <p className="mt-3 text-xs c-muted">
            Aprovar usa o fluxo oficial de convite da Academy: a pessoa recebe o e-mail para definir a senha e passa a ocupar um assento.
            Cobrança e venda avulsa de assento ainda não fazem parte do sistema.
          </p>
        </>
      )}

      {section === "importar" && (
        <>
          <PageHeader title="Importar CSV" description="Convide várias pessoas de uma vez usando a mesma regra de assentos." />
          <Card
            title="Arquivo"
            description="Colunas aceitas: email (obrigatório) e role (student ou org_admin, padrão student)."
            actions={
              <>
                <input
                  ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); }}
                />
                <Button variant="primary" disabled={csvBusy} onClick={() => csvInputRef.current?.click()}>
                  {csvBusy ? "Importando…" : "Selecionar arquivo"}
                </Button>
              </>
            }
          >
            {csvBusy && csvProgress && (
              <div>
                <p className="text-xs c-muted">Processando {csvProgress.done} de {csvProgress.total}…</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: "var(--c-surface-2)" }}>
                  <div className="h-full" style={{ width: `${(csvProgress.done / Math.max(1, csvProgress.total)) * 100}%`, background: "var(--c-focus)" }} />
                </div>
              </div>
            )}
            {!csvBusy && !csvReport && (
              <p className="text-sm c-muted">Nenhuma importação executada nesta sessão.</p>
            )}
            {csvReport && (
              <div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Convidados" value={csvReport.sent} />
                  <Stat label="Bloqueados por limite" value={csvReport.limitReached} tone={csvReport.limitReached ? "warn" : undefined} />
                  <Stat label="Falhas" value={csvReport.invalid + csvReport.duplicated + csvReport.otherErrors} />
                </div>
                {csvReport.errors.length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs c-muted">Ver detalhes ({csvReport.errors.length})</summary>
                    <ul className="mt-2 max-h-56 space-y-1 overflow-auto text-xs">
                      {csvReport.errors.map((e, idx) => (
                        <li key={idx} className="c-muted"><span style={{ color: "var(--c-danger)" }}>{e.email}</span> — {e.reason}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {section === "marca" && (
        <>
          <PageHeader
            title="Marca da Academy"
            description="Controle o white-label visto pelos seus alunos. O preview usa exatamente os tokens do frontend."
          />
          <Card><BrandingEditor organizationId={orgId} /></Card>
        </>
      )}

      {section === "config" && (
        <>
          <PageHeader title="Domínio e ambiente" description="Informações operacionais da sua organização." />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card title="Domínios" padded={false} description="Configurados pela plataforma.">
              {domains.length === 0 ? (
                <EmptyState title="Sem domínio próprio" description="Sua Academy é acessada pelo endereço padrão da plataforma." />
              ) : (
                <TableWrap>
                  <table className="c-table">
                    <thead><tr><th>Hostname</th><th>Tipo</th></tr></thead>
                    <tbody>
                      {domains.map((d) => (
                        <tr key={d.id}>
                          <td className="font-medium">{d.hostname}</td>
                          <td>{d.is_primary ? <Badge tone="info">primário</Badge> : <Badge>alias</Badge>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Card>
            <div className="grid gap-4">
              <Stat label="Organização" value={org?.name ?? "—"} hint={`slug ${org?.slug ?? "—"}`} />
              <Stat label="Status" value={org?.status === "active" ? "Ativa" : "Suspensa"} tone={org?.status === "active" ? undefined : "danger"} />
              <Stat label="Limite de assentos" value={seatsLimit ?? "sem limite"} hint="Definido pela plataforma" />
            </div>
          </div>
        </>
      )}

      <TenantDemoSwitcher />
    </ConsoleShell>
  );
}
