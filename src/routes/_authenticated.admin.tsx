import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  component: AdminPage,
});

type Org = {
  id: string; slug: string; name: string; status: "active" | "suspended" | "archived";
  user_limit: number | null; is_platform: boolean; created_at: string;
};
type Course = { id: string; slug: string; title: string; status: string; visibility: string };

function AdminPage() {
  const { isPlatformAdmin, loading: authLoading } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newOrg, setNewOrg] = useState({ slug: "", name: "", user_limit: "50" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [{ data: os }, { data: cs }] = await Promise.all([
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, slug, title, status, visibility").order("title"),
    ]);
    setOrgs((os as Org[]) ?? []);
    setCourses((cs as Course[]) ?? []);

    // Count seats per org.
    const { data: mems } = await supabase.from("organization_memberships")
      .select("organization_id, role, is_active");
    const counts: Record<string, number> = {};
    (mems ?? []).forEach((m: any) => {
      if (!m.is_active || m.role === "platform_admin") return;
      counts[m.organization_id] = (counts[m.organization_id] ?? 0) + 1;
    });
    setSeatCounts(counts);
    setLoading(false);
  };

  useEffect(() => { if (isPlatformAdmin) refresh(); }, [isPlatformAdmin]);

  useEffect(() => {
    if (!selectedOrg) { setCatalog(new Set()); return; }
    (async () => {
      const { data } = await supabase.from("organization_course_catalog")
        .select("course_id").eq("organization_id", selectedOrg).eq("is_visible", true);
      setCatalog(new Set((data ?? []).map((d: any) => d.course_id)));
    })();
  }, [selectedOrg]);

  if (authLoading) return <Shell><p className="brand-text-muted">Carregando…</p></Shell>;
  if (!isPlatformAdmin) throw redirect({ to: "/inicio" });

  const createOrg = async () => {
    setBusy(true); setMsg(null);
    const slug = newOrg.slug.trim().toLowerCase();
    const limit = parseInt(newOrg.user_limit || "0", 10);
    if (!slug || !newOrg.name) { setBusy(false); setMsg("Slug e nome são obrigatórios."); return; }
    const { data: org, error } = await supabase.from("organizations").insert({
      slug, name: newOrg.name.trim(), user_limit: limit || null, status: "active",
    }).select().single();
    if (error) { setBusy(false); setMsg(error.message); return; }
    // Default branding
    await supabase.from("organization_branding").insert({
      organization_id: org.id,
      primary_color: "#1e40af", secondary_color: "#0ea5e9", accent_color: "#f59e0b",
      background_color: "#0b1220", surface_color: "#111a2e", text_color: "#e5e7eb",
      environment_name: org.name,
    });
    setNewOrg({ slug: "", name: "", user_limit: "50" });
    setBusy(false); setMsg(`Organização "${org.name}" criada.`);
    refresh();
  };

  const updateLimit = async (orgId: string, value: string) => {
    const n = parseInt(value, 10);
    await supabase.from("organizations").update({ user_limit: isNaN(n) ? null : n }).eq("id", orgId);
    refresh();
  };

  const setStatus = async (orgId: string, status: Org["status"]) => {
    await supabase.from("organizations").update({ status }).eq("id", orgId);
    refresh();
  };

  const toggleCatalog = async (courseId: string) => {
    if (!selectedOrg) return;
    const isIn = catalog.has(courseId);
    if (isIn) {
      await supabase.from("organization_course_catalog")
        .delete().eq("organization_id", selectedOrg).eq("course_id", courseId);
      const next = new Set(catalog); next.delete(courseId); setCatalog(next);
    } else {
      await supabase.from("organization_course_catalog").insert({
        organization_id: selectedOrg, course_id: courseId, is_visible: true,
      });
      const next = new Set(catalog); next.add(courseId); setCatalog(next);
    }
  };

  return (
    <Shell>
      <h1 className="text-3xl font-semibold tracking-tight">Admin da plataforma</h1>
      <p className="brand-text-muted mt-1">Organizações, limites e catálogo global.</p>

      <section className="mt-8 brand-surface rounded-xl border brand-border p-6">
        <h2 className="text-lg font-medium">Nova organização</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input placeholder="slug (ex: acme)" value={newOrg.slug}
            onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value })}
            className="rounded-lg px-4 py-2.5 brand-surface-2 border brand-border" />
          <input placeholder="Nome" value={newOrg.name}
            onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
            className="rounded-lg px-4 py-2.5 brand-surface-2 border brand-border" />
          <input type="number" placeholder="Limite" value={newOrg.user_limit}
            onChange={(e) => setNewOrg({ ...newOrg, user_limit: e.target.value })}
            className="w-28 rounded-lg px-4 py-2.5 brand-surface-2 border brand-border" />
          <button onClick={createOrg} disabled={busy}
            className="rounded-lg px-5 py-2.5 brand-btn font-medium disabled:opacity-50">Criar</button>
        </div>
        {msg && <p className="mt-3 text-sm brand-text-muted">{msg}</p>}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Organizações</h2>
        <div className="mt-3 brand-surface rounded-xl border brand-border overflow-hidden">
          {loading ? <p className="p-4 brand-text-muted text-sm">Carregando…</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs brand-text-muted uppercase">
                <tr>
                  <th className="px-4 py-2">Organização</th>
                  <th className="px-4 py-2">Slug</th>
                  <th className="px-4 py-2">Assentos</th>
                  <th className="px-4 py-2">Limite</th>
                  <th className="px-4 py-2">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id} className="border-t brand-border">
                    <td className="px-4 py-2.5">
                      <button onClick={() => setSelectedOrg(o.id)}
                        className={`font-medium hover:underline ${selectedOrg === o.id ? "text-emerald-400" : ""}`}>
                        {o.name}
                      </button>
                      {o.is_platform && <span className="ml-2 text-xs brand-text-muted">(plataforma)</span>}
                    </td>
                    <td className="px-4 py-2.5 brand-text-muted">{o.slug}</td>
                    <td className="px-4 py-2.5">{seatCounts[o.id] ?? 0}</td>
                    <td className="px-4 py-2.5">
                      <input type="number" defaultValue={o.user_limit ?? ""} onBlur={(e) => updateLimit(o.id, e.target.value)}
                        className="w-20 rounded px-2 py-1 brand-surface-2 border brand-border text-sm" />
                    </td>
                    <td className="px-4 py-2.5">
                      <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value as any)}
                        className="rounded px-2 py-1 brand-surface-2 border brand-border text-sm">
                        <option value="active">Ativa</option>
                        <option value="suspended">Suspensa</option>
                        <option value="archived">Arquivada</option>
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <a href={`/demo/${o.slug}`} className="text-xs brand-text-muted hover:text-white">Abrir</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {selectedOrg && (
        <section className="mt-8">
          <h2 className="text-lg font-medium">
            Catálogo — {orgs.find((o) => o.id === selectedOrg)?.name}
          </h2>
          <p className="brand-text-muted mt-1 text-sm">Marque os cursos disponíveis para esta organização.</p>
          <div className="mt-3 brand-surface rounded-xl border brand-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-xs brand-text-muted uppercase">
                <tr><th className="px-4 py-2">Curso</th><th className="px-4 py-2">Visibilidade</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">No catálogo</th></tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-t brand-border">
                    <td className="px-4 py-2.5">{c.title}</td>
                    <td className="px-4 py-2.5 brand-text-muted">{c.visibility}</td>
                    <td className="px-4 py-2.5 brand-text-muted">{c.status}</td>
                    <td className="px-4 py-2.5 text-right">
                      <input type="checkbox" checked={catalog.has(c.id)} onChange={() => toggleCatalog(c.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
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