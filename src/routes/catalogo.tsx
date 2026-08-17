import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";
import { Reveal } from "@/components/motion/Reveal";
import { CursorGlow } from "@/components/motion/CursorGlow";
import { CoursePoster } from "@/components/course/CoursePoster";

const SmoothScroll = lazy(() =>
  import("@/components/motion/SmoothScroll").then((m) => ({ default: m.SmoothScroll })),
);

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
    <>
      <Suspense fallback={null}><SmoothScroll /></Suspense>
      <div className="min-h-screen" style={{ background: "var(--brand-bg)", color: "var(--brand-text)" }}>
        <SiteHeader />
        <main className="container-x py-14 md:py-20">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.22em] brand-text-muted">Catálogo</p>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mt-4 font-editorial text-4xl md:text-6xl text-balance max-w-3xl">
              Conteúdo curado para{" "}
              <span className="text-gradient-lab">{tenant?.organization.name}</span>.
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 max-w-2xl brand-text-muted">
              Cursos publicados no plano da sua organização. Novos títulos entram
              conforme a curadoria da administradora.
            </p>
          </Reveal>

          {loading ? (
            <p className="mt-16 brand-text-muted">Carregando catálogo…</p>
          ) : courses.length === 0 ? (
            <div
              className="mt-16 rounded-3xl border p-10 text-center"
              style={{ borderColor: "var(--brand-border)", background: "var(--brand-surface)" }}
            >
              <p className="font-display text-xl">Ainda sem títulos por aqui.</p>
              <p className="mt-2 text-sm brand-text-muted">
                A curadoria desta organização está em preparação.
              </p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((c, i) => (
                <Reveal key={c.id} delay={i * 60}>
                  <CursorGlow className="h-full rounded-3xl overflow-hidden">
                    <Link
                      to="/curso/$courseSlug"
                      params={{ courseSlug: c.slug }}
                      className="block h-full border rounded-3xl overflow-hidden transition hover:-translate-y-0.5"
                      style={{ background: "var(--brand-surface)", borderColor: "var(--brand-border)" }}
                    >
                      <div className="aspect-video relative overflow-hidden" style={{ background: "var(--brand-surface-2)" }}>
                        {c.cover_url ? (
                          <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover" />
                        ) : (
                          <CoursePoster title={c.title} tone="brand" showTitle={false} className="absolute inset-0 h-full w-full" />
                        )}
                        {c.visibility === "exclusive" && (
                          <span
                            className="absolute top-3 right-3 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                            style={{ background: "var(--tenant-accent)", color: "var(--tenant-accent-ink)" }}
                          >
                            Exclusivo
                          </span>
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="font-display text-lg leading-snug">{c.title}</h3>
                        {c.subtitle && (
                          <p className="mt-2 text-sm brand-text-muted line-clamp-2">{c.subtitle}</p>
                        )}
                        <div className="mt-5 flex items-center gap-3 text-[11px] uppercase tracking-widest brand-text-muted">
                          {c.instructor_name && <span>{c.instructor_name}</span>}
                          {c.duration_minutes ? <span>· {Math.round(c.duration_minutes / 60)}h</span> : null}
                        </div>
                      </div>
                    </Link>
                  </CursorGlow>
                </Reveal>
              ))}
            </div>
          )}
        </main>
        <TenantDemoSwitcher />
      </div>
    </>
  );
}