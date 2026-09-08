import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";
import { CourseManager } from "@/components/admin/CourseManager";
import { BrandingEditor } from "@/components/branding/BrandingEditor";
import { ConsoleShell, type ConsoleNavGroup } from "@/components/console/ConsoleShell";
import {
  Badge, Button, Card, ConfirmAction, EmptyState, Field, Input, PageHeader,
  SaveState, SearchInput, Select, Stat, TableSkeleton, TableWrap,
} from "@/components/console/ui";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Console da plataforma — SíndicoLab" },
      { name: "description", content: "Gestão de organizações, domínios, catálogo global e marca das Academies." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Org = {
  id: string; slug: string; name: string; status: "active" | "suspended";
  user_limit: number | null; is_platform: boolean; created_at: string;
};
type Course = { id: string; slug: string; title: string; status: string; visibility: string };
type Invite = { id: string; email: string; role: string; status: string; created_at: string; organization_id: string };
type Domain = { id: string; hostname: string; is_primary: boolean; organization_id: string };
type Membership = { organization_id: string; role: string; is_active: boolean };

const NAV: ConsoleNavGroup[] = [
  { label: "Plataforma", items: [
    { id: "visao", label: "Visão geral" },
    { id: "orgs", label: "Organizações" },
    { id: "dominios", label: "Domínios" },
  ] },
  { label: "Conteúdo", items: [
    { id: "catalogo", label: "Catálogo global" },
    { id: "distribuicao", label: "Distribuição por org" },
  ] },
  { label: "Pessoas", items: [
    { id: "acessos", label: "Usuários e permissões" },
    { id: "convites", label: "Convites" },
  ] },
  { label: "Configuração", items: [
    { id: "marca", label: "Marca das Academies" },
    { id: "operacional", label: "Operacional" },
  ] },
];

function AdminPage() {
  const { isPlatformAdmin, loading: authLoading } = useAuth();
  const [section, setSection] = useState("visao");

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Set<string>>(new Set());
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [orgQuery, setOrgQuery] = useState("");
  const [orgStatus, setOrgStatus] = useState<"all" | "active" | "suspended">("all");
  const [courseQuery, setCourseQuery] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"all" | "pending" | "accepted" | "revoked" | "expired">("pending");

  const [newOrg, setNewOrg] = useState({ slug: "", name: "", user_limit: "50" });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<null | { kind: "ok" | "err" | "busy"; text: string }>(null);
  const [newDomain, setNewDomain] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: os }, { data: cs }, { data: mems }, { data: invs }, { data: doms }] = await Promise.all([
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, slug, title, status, visibility").order("title"),
      supabase.from("organization_memberships").select("organization_id, role, is_active"),
      supabase.from("organization_invites").select("id, email, role, status, created_at, organization_id").order("created_at", { ascending: false }),
      supabase.from("organization_domains").select("id, hostname, is_primary, organization_id").order("hostname"),
    ]);
    setOrgs((os as Org[]) ?? []);
    setCourses((cs as Course[]) ?? []);
    setMemberships((mems as Membership[]) ?? []);
    setInvites((invs as Invite[]) ?? []);
    setDomains((doms as Domain[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (isPlatformAdmin) refresh(); }, [isPlatformAdmin, refresh]);

  useEffect(() => {
    if (!selectedOrg) { setCatalog(new Set()); return; }
    let cancelled = false;
    setCatalogLoading(true);
    (async () => {
      const { data } = await supabase.from("organization_course_catalog")
        .select("course_id").eq("organization_id", selectedOrg).eq("is_visible", true);
      if (cancelled) return;
      setCatalog(new Set((data ?? []).map((d: any) => d.course_id)));
      setCatalogLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedOrg]);

  const seatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    memberships.forEach((m) => {
      if (!m.is_active || m.role === "platform_admin") return;
      counts[m.organization_id] = (counts[m.organization_id] ?? 0) + 1;
    });
    return counts;
  }, [memberships]);

  const orgById = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);
  const current = selectedOrg ? orgById[selectedOrg] : null;

  const filteredOrgs = useMemo(() => {
    const q = orgQuery.trim().toLowerCase();
    return orgs.filter((o) =>
      (orgStatus === "all" || o.status === orgStatus) &&
      (!q || o.name.toLowerCase().includes(q) || o.slug.includes(q)));
  }, [orgs, orgQuery, orgStatus]);

  const filteredCourses = useMemo(() => {
    const q = courseQuery.trim().toLowerCase();
    return q ? courses.filter((c) => c.title.toLowerCase().includes(q) || c.slug.includes(q)) : courses;
  }, [courses, courseQuery]);

  if (authLoading) {
    return (
      <ConsoleShell kicker="Console da plataforma" title="SíndicoLab" nav={NAV} active="visao" onNavigate={() => {}}>
        <TableSkeleton rows={5} cols={4} />
      </ConsoleShell>
    );
  }
  if (!isPlatformAdmin) return <Navigate to="/inicio" replace />;

  const createOrg = async () => {
    const slug = newOrg.slug.trim().toLowerCase();
    if (!slug || !newOrg.name.trim()) { setMsg({ kind: "err", text: "Slug e nome são obrigatórios." }); return; }
    setCreating(true); setMsg({ kind: "busy", text: "" });
    const limit = parseInt(newOrg.user_limit || "0", 10);
    const { data: org, error } = await supabase.from("organizations").insert({
      slug, name: newOrg.name.trim(), user_limit: limit || undefined, status: "active",
    }).select().single();
    if (error) { setCreating(false); setMsg({ kind: "err", text: error.message }); return; }
    await supabase.from("organization_branding").insert({
      organization_id: org.id,
      primary_color: "#111114", secondary_color: "#6B6B72", accent_color: "#2563EB",
      background_color: "#FFFFFF", surface_color: "#FFFFFF", text_color: "#121214",
      dark_background_color: "#0B0B0E", dark_surface_color: "#141418", dark_text_color: "#F3F3F5",
      environment_name: org.name,
    });
    setNewOrg({ slug: "", name: "", user_limit: "50" });
    setCreating(false); setMsg({ kind: "ok", text: `“${org.name}” criada.` });
    refresh();
  };

  type OrgPatch = Partial<Pick<Org, "name" | "slug" | "status">> & { user_limit?: number | null };

  const updateOrg = async (orgId: string, patch: OrgPatch) => {
    setMsg({ kind: "busy", text: "" });
    const { error } = await supabase.from("organizations").update(patch as never).eq("id", orgId);
    setMsg(error ? { kind: "err", text: error.message } : { kind: "ok", text: "Alterações salvas." });
    refresh();
  };

  const toggleCatalog = async (courseId: string) => {
    if (!selectedOrg) return;
    const isIn = catalog.has(courseId);
    const next = new Set(catalog);
    if (isIn) {
      next.delete(courseId); setCatalog(next);
      await supabase.from("organization_course_catalog").delete()
        .eq("organization_id", selectedOrg).eq("course_id", courseId);
    } else {
      next.add(courseId); setCatalog(next);
      await supabase.from("organization_course_catalog").insert({
        organization_id: selectedOrg, course_id: courseId, is_visible: true,
      });
    }
    setMsg({ kind: "ok", text: "Catálogo atualizado." });
  };

  const addDomain = async () => {
    if (!selectedOrg || !newDomain.trim()) return;
    const { error } = await supabase.from("organization_domains").insert({
      organization_id: selectedOrg, hostname: newDomain.trim().toLowerCase(), is_primary: false,
    });
    setMsg(error ? { kind: "err", text: error.message } : { kind: "ok", text: "Domínio adicionado." });
    setNewDomain("");
    refresh();
  };

  const totals = {
    orgs: orgs.length,
    active: orgs.filter((o) => o.status === "active").length,
    suspended: orgs.filter((o) => o.status === "suspended").length,
    published: courses.filter((c) => c.status === "published").length,
    seats: Object.values(seatCounts).reduce((a, b) => a + b, 0),
    pending: invites.filter((i) => i.status === "pending").length,
  };

  const openOrg = (id: string) => { setSelectedOrg(id); setSection("orgs"); };

  return (
    <ConsoleShell
      kicker="Console da plataforma"
      title="SíndicoLab"
      nav={NAV}
      active={section}
      onNavigate={(id) => { setSection(id); if (id === "orgs") setSelectedOrg(null); }}
      footer={<p>Ambiente global. Alterações aqui afetam todas as Academies.</p>}
    >
      {section === "visao" && (
        <>
          <PageHeader
            title="Visão geral"
            description="Estado operacional da plataforma multi-tenant."
            actions={<Button variant="secondary" size="sm" onClick={refresh}>Atualizar</Button>}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Organizações" value={totals.orgs} hint={`${totals.active} ativas · ${totals.suspended} suspensas`} />
            <Stat label="Assentos em uso" value={totals.seats} hint="Memberships ativos (exclui plataforma)" />
            <Stat label="Cursos publicados" value={totals.published} hint={`${courses.length} no catálogo global`} />
            <Stat label="Convites pendentes" value={totals.pending} tone={totals.pending ? "warn" : undefined} hint={totals.pending ? "Aguardando aceite" : "Nada pendente"} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card title="Organizações recentes" padded={false}>
              {loading ? <TableSkeleton /> : orgs.length === 0 ? (
                <EmptyState title="Nenhuma organização" description="Crie a primeira Academy corporativa." />
              ) : (
                <TableWrap>
                  <table className="c-table">
                    <thead><tr><th>Organização</th><th>Assentos</th><th>Status</th><th /></tr></thead>
                    <tbody>
                      {orgs.slice(0, 6).map((o) => (
                        <tr key={o.id}>
                          <td>
                            <button onClick={() => openOrg(o.id)} className="font-medium hover:underline">{o.name}</button>
                            <span className="ml-2 text-xs c-muted">{o.slug}</span>
                          </td>
                          <td className="tabular-nums">{seatCounts[o.id] ?? 0}{o.user_limit ? ` / ${o.user_limit}` : ""}</td>
                          <td><Badge tone={o.status === "active" ? "ok" : "danger"}>{o.status === "active" ? "Ativa" : "Suspensa"}</Badge></td>
                          <td className="text-right"><Button size="sm" variant="ghost" onClick={() => openOrg(o.id)}>Gerenciar</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Card>

            <Card title="Nova organização" description="Cria a org e o registro de marca padrão.">
              <div className="grid gap-3">
                <Field label="Nome"><Input value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} placeholder="Administradora Acme" /></Field>
                <Field label="Slug" hint="Usado em URLs e na resolução por hostname.">
                  <Input value={newOrg.slug} onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value })} placeholder="acme" />
                </Field>
                <Field label="Limite de assentos"><Input type="number" value={newOrg.user_limit} onChange={(e) => setNewOrg({ ...newOrg, user_limit: e.target.value })} /></Field>
                <div className="flex items-center gap-3">
                  <Button variant="primary" onClick={createOrg} disabled={creating}>Criar organização</Button>
                  <SaveState state={msg} />
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {section === "orgs" && !current && (
        <>
          <PageHeader
            title="Organizações"
            description="Cada organização é uma Academy isolada, com catálogo, membros e marca próprios."
            actions={
              <>
                <SearchInput value={orgQuery} onChange={setOrgQuery} placeholder="Buscar por nome ou slug" className="w-56" />
                <Select value={orgStatus} onChange={(e) => setOrgStatus(e.target.value as any)} className="!mt-0 w-36">
                  <option value="all">Todos os status</option>
                  <option value="active">Ativas</option>
                  <option value="suspended">Suspensas</option>
                </Select>
              </>
            }
          />
          <Card padded={false}>
            {loading ? <TableSkeleton rows={6} cols={6} /> : filteredOrgs.length === 0 ? (
              <EmptyState title="Nenhuma organização encontrada" description="Ajuste a busca ou os filtros." />
            ) : (
              <TableWrap>
                <table className="c-table">
                  <thead>
                    <tr><th>Organização</th><th>Slug</th><th>Assentos</th><th>Domínios</th><th>Status</th><th /></tr>
                  </thead>
                  <tbody>
                    {filteredOrgs.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <button onClick={() => setSelectedOrg(o.id)} className="font-medium hover:underline">{o.name}</button>
                          {o.is_platform && <span className="ml-2"><Badge tone="info">plataforma</Badge></span>}
                        </td>
                        <td className="c-muted">{o.slug}</td>
                        <td className="tabular-nums">{seatCounts[o.id] ?? 0}{o.user_limit ? ` / ${o.user_limit}` : ""}</td>
                        <td className="c-muted">{domains.filter((d) => d.organization_id === o.id).length}</td>
                        <td><Badge tone={o.status === "active" ? "ok" : "danger"}>{o.status === "active" ? "Ativa" : "Suspensa"}</Badge></td>
                        <td className="text-right"><Button size="sm" onClick={() => setSelectedOrg(o.id)}>Gerenciar</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </>
      )}

      {section === "orgs" && current && (
        <OrgDetail
          org={current}
          seats={seatCounts[current.id] ?? 0}
          domains={domains.filter((d) => d.organization_id === current.id)}
          courses={filteredCourses}
          catalog={catalog}
          catalogLoading={catalogLoading}
          courseQuery={courseQuery}
          setCourseQuery={setCourseQuery}
          onToggleCatalog={toggleCatalog}
          onBack={() => setSelectedOrg(null)}
          onUpdate={(patch) => updateOrg(current.id, patch)}
          newDomain={newDomain}
          setNewDomain={setNewDomain}
          onAddDomain={addDomain}
          onRemoveDomain={async (id) => {
            await supabase.from("organization_domains").delete().eq("id", id);
            setMsg({ kind: "ok", text: "Domínio removido." });
            refresh();
          }}
          onSetPrimary={async (id) => {
            await supabase.from("organization_domains").update({ is_primary: false }).eq("organization_id", current.id);
            await supabase.from("organization_domains").update({ is_primary: true }).eq("id", id);
            refresh();
          }}
          msg={msg}
        />
      )}

      {section === "dominios" && (
        <>
          <PageHeader title="Domínios" description="Hostnames que resolvem cada Academy. O domínio primário define a marca padrão." />
          <Card padded={false}>
            {loading ? <TableSkeleton /> : domains.length === 0 ? (
              <EmptyState title="Nenhum domínio cadastrado" description="Adicione hostnames dentro da organização." />
            ) : (
              <TableWrap>
                <table className="c-table">
                  <thead><tr><th>Hostname</th><th>Organização</th><th>Tipo</th><th /></tr></thead>
                  <tbody>
                    {domains.map((d) => (
                      <tr key={d.id}>
                        <td className="font-medium">{d.hostname}</td>
                        <td className="c-muted">{orgById[d.organization_id]?.name ?? "—"}</td>
                        <td>{d.is_primary ? <Badge tone="info">primário</Badge> : <Badge>alias</Badge>}</td>
                        <td className="text-right"><Button size="sm" variant="ghost" onClick={() => openOrg(d.organization_id)}>Abrir organização</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </>
      )}

      {section === "catalogo" && (
        <>
          <PageHeader title="Catálogo global" description="Cursos, módulos e aulas disponíveis para distribuição." />
          <Card padded={false} className="p-5">
            <CourseManager orgs={orgs} />
          </Card>
        </>
      )}

      {section === "distribuicao" && (
        <>
          <PageHeader
            title="Distribuição por organização"
            description="Quantos cursos cada Academy enxerga hoje."
          />
          <Card padded={false}>
            {loading ? <TableSkeleton /> : (
              <TableWrap>
                <table className="c-table">
                  <thead><tr><th>Organização</th><th>Assentos</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {orgs.map((o) => (
                      <tr key={o.id}>
                        <td className="font-medium">{o.name}</td>
                        <td className="tabular-nums">{seatCounts[o.id] ?? 0}</td>
                        <td><Badge tone={o.status === "active" ? "ok" : "danger"}>{o.status === "active" ? "Ativa" : "Suspensa"}</Badge></td>
                        <td className="text-right"><Button size="sm" onClick={() => openOrg(o.id)}>Editar catálogo</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </>
      )}

      {section === "acessos" && (
        <>
          <PageHeader title="Usuários e permissões" description="Distribuição de papéis por organização. Papéis vivem em organization_memberships — nunca no perfil." />
          <Card padded={false}>
            <TableWrap>
              <table className="c-table">
                <thead><tr><th>Organização</th><th>Alunos</th><th>Admins da org</th><th>Admins da plataforma</th><th>Inativos</th></tr></thead>
                <tbody>
                  {orgs.map((o) => {
                    const rows = memberships.filter((m) => m.organization_id === o.id);
                    const count = (role: string) => rows.filter((m) => m.role === role && m.is_active).length;
                    return (
                      <tr key={o.id}>
                        <td className="font-medium">{o.name}</td>
                        <td className="tabular-nums">{count("student")}</td>
                        <td className="tabular-nums">{count("org_admin")}</td>
                        <td className="tabular-nums">{count("platform_admin")}</td>
                        <td className="tabular-nums c-muted">{rows.filter((m) => !m.is_active).length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </>
      )}

      {section === "convites" && (
        <>
          <PageHeader
            title="Convites"
            description="Convites emitidos por todas as organizações."
            actions={
              <Select value={inviteStatus} onChange={(e) => setInviteStatus(e.target.value as any)} className="!mt-0 w-44">
                <option value="pending">Pendentes</option>
                <option value="accepted">Aceitos</option>
                <option value="revoked">Revogados</option>
                <option value="expired">Expirados</option>
                <option value="all">Todos</option>
              </Select>
            }
          />
          <Card padded={false}>
            {loading ? <TableSkeleton /> : (() => {
              const rows = invites.filter((i) => inviteStatus === "all" || i.status === inviteStatus);
              if (!rows.length) return <EmptyState title="Nada por aqui" description="Nenhum convite com esse status." />;
              return (
                <TableWrap>
                  <table className="c-table">
                    <thead><tr><th>E-mail</th><th>Organização</th><th>Papel</th><th>Enviado</th><th>Status</th><th /></tr></thead>
                    <tbody>
                      {rows.map((i) => (
                        <tr key={i.id}>
                          <td className="font-medium">{i.email}</td>
                          <td className="c-muted">{orgById[i.organization_id]?.name ?? "—"}</td>
                          <td>{i.role === "org_admin" ? "Admin da org" : "Aluno"}</td>
                          <td className="c-muted">{new Date(i.created_at).toLocaleDateString("pt-BR")}</td>
                          <td><Badge tone={i.status === "pending" ? "warn" : i.status === "accepted" ? "ok" : undefined}>{i.status}</Badge></td>
                          <td className="text-right">
                            {i.status === "pending" && (
                              <ConfirmAction
                                label="Revogar"
                                question="Revogar convite?"
                                onConfirm={async () => {
                                  await supabase.from("organization_invites").update({ status: "revoked" }).eq("id", i.id);
                                  refresh();
                                }}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              );
            })()}
          </Card>
        </>
      )}

      {section === "marca" && (
        <>
          <PageHeader
            title="Marca das Academies"
            description="Selecione a organização para editar tokens, logos e mensagens do white-label."
            actions={
              <Select value={selectedOrg ?? ""} onChange={(e) => setSelectedOrg(e.target.value || null)} className="!mt-0 w-64">
                <option value="">Escolher organização…</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
            }
          />
          {selectedOrg ? (
            <Card><BrandingEditor organizationId={selectedOrg} /></Card>
          ) : (
            <Card padded={false}><EmptyState title="Nenhuma organização selecionada" description="Escolha uma Academy para abrir o editor de marca." /></Card>
          )}
        </>
      )}

      {section === "operacional" && (
        <>
          <PageHeader title="Operacional" description="Informações de ambiente e atalhos de verificação." />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Orgs suspensas" value={totals.suspended} tone={totals.suspended ? "warn" : undefined} hint={totals.suspended ? "Alunos bloqueados" : "Tudo ativo"} />
            <Stat label="Cursos rascunho" value={courses.filter((c) => c.status === "draft").length} hint="Não visíveis para alunos" />
            <Stat label="Cursos exclusivos" value={courses.filter((c) => c.visibility === "exclusive").length} hint="Restritos a uma org dona" />
            <Stat label="Domínios ativos" value={domains.length} hint="Resolução por hostname" />
          </div>
          <Card className="mt-5" title="Pré-visualizar Academies" description="Abre a experiência do aluno com o tenant forçado.">
            <div className="flex flex-wrap gap-2">
              {orgs.map((o) => (
                <a key={o.id} href={`/demo/${o.slug}`} className="c-btn" data-variant="secondary" data-size="sm">{o.name}</a>
              ))}
            </div>
          </Card>
        </>
      )}

      <TenantDemoSwitcher />
    </ConsoleShell>
  );
}

function OrgDetail({
  org, seats, domains, courses, catalog, catalogLoading, courseQuery, setCourseQuery,
  onToggleCatalog, onBack, onUpdate, newDomain, setNewDomain, onAddDomain, onRemoveDomain, onSetPrimary, msg,
}: {
  org: Org; seats: number; domains: Domain[]; courses: Course[]; catalog: Set<string>;
  catalogLoading: boolean; courseQuery: string; setCourseQuery: (v: string) => void;
  onToggleCatalog: (id: string) => void; onBack: () => void; onUpdate: (patch: { name?: string; slug?: string; status?: Org["status"]; user_limit?: number | null }) => void;
  newDomain: string; setNewDomain: (v: string) => void; onAddDomain: () => void;
  onRemoveDomain: (id: string) => void; onSetPrimary: (id: string) => void;
  msg: null | { kind: "ok" | "err" | "busy"; text: string };
}) {
  const [tab, setTab] = useState<"perfil" | "catalogo" | "dominios" | "marca">("perfil");
  const [form, setForm] = useState({ name: org.name, slug: org.slug, user_limit: String(org.user_limit ?? "") });
  useEffect(() => { setForm({ name: org.name, slug: org.slug, user_limit: String(org.user_limit ?? "") }); }, [org.id]);

  const tabs = [
    ["perfil", "Perfil"], ["catalogo", "Catálogo"], ["dominios", "Domínios"], ["marca", "Marca"],
  ] as const;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Organizações", onClick: onBack }, { label: org.name }]}
        title={org.name}
        description={`${seats} assento(s) em uso${org.user_limit ? ` de ${org.user_limit}` : ""} · slug ${org.slug}`}
        actions={
          <>
            <a href={`/demo/${org.slug}`} className="c-btn" data-variant="secondary" data-size="sm">Ver Academy</a>
            {org.status === "active" ? (
              <ConfirmAction label="Suspender" question="Bloquear o acesso dos alunos?" confirmLabel="Suspender" onConfirm={() => onUpdate({ status: "suspended" })} />
            ) : (
              <Button size="sm" variant="primary" onClick={() => onUpdate({ status: "active" })}>Reativar</Button>
            )}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1 border-b c-divide">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="-mb-px border-b-2 px-3 py-2 text-sm"
            style={{
              borderColor: tab === id ? "var(--c-text)" : "transparent",
              color: tab === id ? "var(--c-text)" : "var(--c-muted)",
              fontWeight: tab === id ? 500 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "perfil" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Card title="Identificação" description="Nome exibido e slug de resolução.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
              <Field label="Limite de assentos" hint="Convites pendentes também ocupam assento.">
                <Input type="number" value={form.user_limit} onChange={(e) => setForm({ ...form, user_limit: e.target.value })} />
              </Field>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="primary"
                onClick={() => onUpdate({
                  name: form.name.trim(), slug: form.slug.trim().toLowerCase(),
                  user_limit: form.user_limit ? parseInt(form.user_limit, 10) : null,
                })}
              >
                Salvar alterações
              </Button>
              <SaveState state={msg} />
            </div>
          </Card>
          <div className="grid gap-4">
            <Stat label="Assentos" value={`${seats}${org.user_limit ? ` / ${org.user_limit}` : ""}`} hint="Membros ativos" />
            <Stat label="Status" value={org.status === "active" ? "Ativa" : "Suspensa"} tone={org.status === "active" ? undefined : "danger"} />
            <Stat label="Criada em" value={new Date(org.created_at).toLocaleDateString("pt-BR")} />
          </div>
        </div>
      )}

      {tab === "catalogo" && (
        <Card
          title="Cursos disponíveis para esta organização"
          description="Marque os cursos que aparecem na Academy desta empresa."
          actions={<SearchInput value={courseQuery} onChange={setCourseQuery} placeholder="Buscar curso" className="w-56" />}
          padded={false}
        >
          {catalogLoading ? <TableSkeleton /> : courses.length === 0 ? (
            <EmptyState title="Nenhum curso encontrado" />
          ) : (
            <TableWrap>
              <table className="c-table">
                <thead><tr><th>Curso</th><th>Visibilidade</th><th>Status</th><th className="text-right">No catálogo</th></tr></thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.title}</td>
                      <td className="c-muted">{c.visibility}</td>
                      <td><Badge tone={c.status === "published" ? "ok" : undefined}>{c.status}</Badge></td>
                      <td className="text-right">
                        <input
                          type="checkbox"
                          aria-label={`Incluir ${c.title} no catálogo`}
                          checked={catalog.has(c.id)}
                          onChange={() => onToggleCatalog(c.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === "dominios" && (
        <Card title="Domínios" description="Hostnames que resolvem esta Academy." padded={false}>
          <div className="flex flex-wrap items-end gap-2 border-b c-divide p-5">
            <Field label="Novo hostname" className="min-w-[240px] flex-1">
              <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="academy.empresa.com.br" />
            </Field>
            <Button variant="primary" onClick={onAddDomain} disabled={!newDomain.trim()}>Adicionar</Button>
          </div>
          {domains.length === 0 ? (
            <EmptyState title="Sem domínios" description="A Academy ainda é acessada apenas pelo slug." />
          ) : (
            <TableWrap>
              <table className="c-table">
                <thead><tr><th>Hostname</th><th>Tipo</th><th /></tr></thead>
                <tbody>
                  {domains.map((d) => (
                    <tr key={d.id}>
                      <td className="font-medium">{d.hostname}</td>
                      <td>{d.is_primary ? <Badge tone="info">primário</Badge> : <Badge>alias</Badge>}</td>
                      <td className="text-right">
                        {!d.is_primary && <Button size="sm" variant="ghost" onClick={() => onSetPrimary(d.id)}>Tornar primário</Button>}
                        <ConfirmAction label="Remover" question="Remover domínio?" onConfirm={() => onRemoveDomain(d.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === "marca" && (
        <Card><BrandingEditor organizationId={org.id} /></Card>
      )}
    </>
  );
}
