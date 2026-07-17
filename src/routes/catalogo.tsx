import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";

export const Route = createFileRoute("/catalogo")({ ssr: false, component: Catalog });

type Course = {
  id: string; slug: string; title: string; subtitle: string | null;
  cover_url: string | null; instructor_name: string | null;
  duration_minutes: number | null; visibility: string;
};

function Catalog() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    (async () => {
      setLoading(true);
      const { data: cat } = await supabase
        .from("organization_course_catalog")
        .select("course_id")
        .eq("organization_id", tenant.organization.id)
        .eq("is_visible", true);
      const ids = (cat ?? []).map((c: any) => c.course_id);
      if (!ids.length) { setCourses([]); setLoading(false); return; }
      const { data } = await supabase.from("courses").select("*").in("id", ids).eq("status", "published");
      setCourses((data as Course[]) ?? []);
      setLoading(false);
    })();
  }, [tenant?.organization.id]);

  if (tenantLoading) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Catálogo — {tenant?.organization.name}</h1>
        <p className="brand-text-muted mt-2">Conteúdos disponíveis para sua organização.</p>
        {loading ? (
          <p className="mt-10 brand-text-muted">Carregando…</p>
        ) : courses.length === 0 ? (
          <p className="mt-10 brand-text-muted">Nenhum curso disponível ainda para esta organização.</p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Link key={c.id} to="/curso/$courseSlug" params={{ courseSlug: c.slug }}
                className="group brand-surface rounded-xl overflow-hidden border brand-border hover:border-white/20 transition">
                <div className="aspect-video brand-surface-2 relative overflow-hidden">
                  {c.cover_url ? (
                    <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-40 text-4xl">▶</div>
                  )}
                  {c.visibility === "exclusive" && (
                    <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded brand-btn">Exclusivo</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium leading-snug">{c.title}</h3>
                  {c.subtitle && <p className="text-xs brand-text-muted mt-1 line-clamp-2">{c.subtitle}</p>}
                  <div className="flex items-center gap-3 mt-3 text-[11px] brand-text-muted">
                    {c.instructor_name && <span>{c.instructor_name}</span>}
                    {c.duration_minutes && <span>· {Math.round(c.duration_minutes / 60)}h</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <TenantDemoSwitcher />
    </div>
  );
}