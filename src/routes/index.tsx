import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";
import { Reveal } from "@/components/motion/Reveal";
import { CursorGlow } from "@/components/motion/CursorGlow";

const SmoothScroll = lazy(() =>
  import("@/components/motion/SmoothScroll").then((m) => ({ default: m.SmoothScroll })),
);

export const Route = createFileRoute("/")({ ssr: false, component: LandingPage });

type Course = {
  id: string; slug: string; title: string; subtitle: string | null;
  cover_url: string | null; instructor_name: string | null;
  duration_minutes: number | null; category: string | null;
};

const TOPICS = [
  { k: "Gestão condominial", d: "Rotinas do síndico, assembleias, prestação de contas." },
  { k: "Portaria & atendimento", d: "Recepção, controle de acesso, comunicação com moradores." },
  { k: "Manutenção predial", d: "Elevadores, hidráulica, elétrica, prevenção." },
  { k: "Jurídico & compliance", d: "Convenção, regimento, LGPD, boas práticas." },
];

function LandingPage() {
  const { tenant, loading } = useTenant();
  const { session } = useAuth();
  const [featured, setFeatured] = useState<Course[]>([]);

  useEffect(() => {
    if (!tenant) return;
    (async () => {
      const { data: cat } = await supabase
        .from("organization_course_catalog")
        .select("course_id")
        .eq("organization_id", tenant.organization.id)
        .eq("is_visible", true);
      const ids = (cat ?? []).map((c: any) => c.course_id);
      if (!ids.length) { setFeatured([]); return; }
      const { data } = await supabase.from("courses")
        .select("*").in("id", ids).eq("status", "published").limit(6);
      setFeatured((data as Course[]) ?? []);
    })();
  }, [tenant?.organization.id]);

  if (loading) return <FullScreenLoading />;

  const orgName = tenant?.organization.name ?? "SíndicoLab";
  const envName = tenant?.branding?.environment_name ?? "Portal de conhecimento condominial";
  const welcomeTitle =
    tenant?.branding?.welcome_title ??
    "Conhecimento vivo para quem faz o condomínio funcionar.";
  const welcomeMsg =
    tenant?.branding?.welcome_message ??
    "Trilhas, aulas e materiais produzidos para síndicos, porteiros, zeladores e equipes de administradora — atualizados constantemente pela curadoria.";

  return (
    <>
      <Suspense fallback={null}><SmoothScroll /></Suspense>
      <div style={{ background: "var(--brand-bg)", color: "var(--brand-text)" }}>
        <SiteHeader />

        {/* HERO — portal editorial, sem copy comercial */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pattern-grid pointer-events-none opacity-70" />
          <div
            aria-hidden
            className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full opacity-40"
            style={{ background: "var(--gradient-lab)", filter: "blur(120px)" }}
          />
          <div className="container-x relative pt-16 pb-20 md:pt-28 md:pb-32">
            <Reveal>
              <div
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] px-3 py-1 rounded-full border"
                style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--tenant-accent)" }} />
                {envName}
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1
                className="mt-6 font-editorial text-[clamp(2.6rem,6.2vw,5.4rem)] text-balance max-w-5xl"
                style={{ color: "var(--brand-text)" }}
              >
                {welcomeTitle}
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-8 text-lg md:text-xl max-w-2xl leading-relaxed brand-text-muted">
                {welcomeMsg}
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                {session ? (
                  <Link to="/inicio" className="btn-primary">
                    Continuar assistindo <span className="btn-arrow">→</span>
                  </Link>
                ) : (
                  <Link to="/login" className="btn-primary">
                    Acessar a plataforma <span className="btn-arrow">→</span>
                  </Link>
                )}
                <Link to="/catalogo" className="btn-ghost">
                  Ver catálogo <span className="btn-arrow">→</span>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* EM DESTAQUE — capas reais do catálogo do tenant */}
        {featured.length > 0 && (
          <section className="border-t" style={{ borderColor: "var(--brand-border)" }}>
            <div className="container-x py-20 md:py-24">
              <div className="flex items-end justify-between gap-6 flex-wrap">
                <Reveal>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] brand-text-muted">Em destaque</p>
                    <h2 className="mt-3 font-editorial text-3xl md:text-4xl max-w-2xl text-balance">
                      Conteúdo publicado no acervo de {orgName}
                    </h2>
                  </div>
                </Reveal>
                <Link to="/catalogo" className="text-sm brand-text-muted hover:opacity-80">
                  Ver catálogo completo →
                </Link>
              </div>
              <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featured.map((c, i) => (
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
                            <div className="absolute inset-0 flex items-center justify-center opacity-30 text-5xl">▶</div>
                          )}
                        </div>
                        <div className="p-6">
                          <h3 className="font-display text-lg leading-snug">{c.title}</h3>
                          {c.subtitle && (
                            <p className="mt-2 text-sm brand-text-muted line-clamp-2">{c.subtitle}</p>
                          )}
                          <div className="mt-5 flex items-center gap-3 text-[11px] uppercase tracking-widest brand-text-muted">
                            {c.instructor_name && <span>{c.instructor_name}</span>}
                            {c.duration_minutes && <span>· {Math.round(c.duration_minutes / 60)}h</span>}
                          </div>
                        </div>
                      </Link>
                    </CursorGlow>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TÓPICOS — o que se aprende aqui */}
        <section className="border-t" style={{ borderColor: "var(--brand-border)" }}>
          <div className="container-x py-20 md:py-24">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.22em] brand-text-muted">O que você aprende</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 font-editorial text-4xl md:text-5xl max-w-3xl text-balance">
                Formação prática, do dia a dia da <span className="text-gradient-lab">portaria à assembleia</span>.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {TOPICS.map((t, i) => (
                <Reveal key={t.k} delay={i * 70}>
                  <CursorGlow className="h-full rounded-3xl">
                    <div
                      className="rounded-3xl p-6 h-full border"
                      style={{ background: "var(--brand-surface)", borderColor: "var(--brand-border)" }}
                    >
                      <div
                        className="h-8 w-8 rounded-full mb-5"
                        style={{ background: "var(--gradient-lab)" }}
                      />
                      <h3 className="font-display text-base">{t.k}</h3>
                      <p className="mt-2 text-sm brand-text-muted leading-relaxed">{t.d}</p>
                    </div>
                  </CursorGlow>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* MARQUEE editorial */}
        <section className="border-t overflow-hidden" style={{ borderColor: "var(--brand-border)" }}>
          <div className="py-10 flex whitespace-nowrap animate-marquee">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-14 pr-14 font-editorial text-4xl md:text-6xl">
                <span>síndicos</span><span className="text-gradient-lab">porteiros</span>
                <span>zeladores</span><span className="text-gradient-lab">administradoras</span>
                <span>conselheiros</span><span className="text-gradient-lab">gestores</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t" style={{ borderColor: "var(--brand-border)" }}>
          <div className="container-x py-10 flex flex-wrap items-center justify-between gap-4 text-sm brand-text-muted">
            <span>© {new Date().getFullYear()} {orgName}. Powered by SíndicoLab.</span>
            <span className="font-mono text-[11px] uppercase tracking-widest">v0.1 · MVP demo</span>
          </div>
        </footer>

        <TenantDemoSwitcher />
      </div>
    </>
  );
}

function FullScreenLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--brand-bg)" }}
    >
      <div className="text-sm brand-text-muted">Carregando ambiente…</div>
    </div>
  );
}