import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";
import { Reveal } from "@/components/motion/Reveal";
import { CursorGlow } from "@/components/motion/CursorGlow";

// Lenis + framer só nas rotas de marketing → dynamic import
const SmoothScroll = lazy(() =>
  import("@/components/motion/SmoothScroll").then((m) => ({ default: m.SmoothScroll })),
);

export const Route = createFileRoute("/")({
  ssr: false,
  component: LandingPage,
});

const PILLARS = [
  {
    kicker: "01 — Multi-tenant real",
    title: "White label profundo",
    body: "Cada organização com sua marca, domínio, catálogo e assentos — sobre um único produto compartilhado.",
  },
  {
    kicker: "02 — Trilhas condominiais",
    title: "Formação por função",
    body: "Conteúdo prático para porteiros, síndicos, administradoras e equipes de atendimento — modular e certificável.",
  },
  {
    kicker: "03 — Streaming-first",
    title: "Consumo sem atrito",
    body: "Player Vimeo com progresso persistente, comentários e reviews. Continua de onde parou, em qualquer aparelho.",
  },
];

function LandingPage() {
  const { tenant, loading } = useTenant();
  const { session } = useAuth();

  if (loading) return <FullScreenLoading />;

  const orgName = tenant?.organization.name ?? "SíndicoLab";
  const envName = tenant?.branding?.environment_name ?? "SíndicoLab Academy";
  const welcomeTitle =
    tenant?.branding?.welcome_title ?? "Educação para o mercado condominial";
  const welcomeMsg =
    tenant?.branding?.welcome_message ??
    "Formação contínua para administradoras, síndicos, porteiros e equipes condominiais — em um único ecossistema.";

  return (
    <>
      <Suspense fallback={null}><SmoothScroll /></Suspense>
      <div style={{ background: "var(--brand-bg)", color: "var(--brand-text)" }}>
        <SiteHeader />

        {/* HERO editorial */}
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
                className="mt-6 font-editorial text-[clamp(2.8rem,6.4vw,5.6rem)] text-balance max-w-5xl"
                style={{ color: "var(--brand-text)" }}
              >
                {welcomeTitle}{" "}
                <span className="text-gradient-lab">sem intermediário.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-8 text-lg md:text-xl max-w-2xl leading-relaxed brand-text-muted">
                {welcomeMsg}
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link to="/catalogo" className="btn-primary">
                  Ver catálogo <span className="btn-arrow">→</span>
                </Link>
                {session ? (
                  <Link to="/inicio" className="btn-ghost">
                    Ir para minha área <span className="btn-arrow">→</span>
                  </Link>
                ) : (
                  <Link to="/login" className="btn-ghost">
                    Entrar <span className="btn-arrow">→</span>
                  </Link>
                )}
              </div>
            </Reveal>

            <Reveal delay={320}>
              <dl className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl">
                {[
                  ["+12", "Cursos ativos"],
                  ["3", "Empresas na rede"],
                  ["98%", "Taxa de conclusão"],
                  ["24/7", "Streaming"],
                ].map(([k, v]) => (
                  <div key={v}>
                    <dt className="font-editorial text-3xl md:text-4xl" style={{ color: "var(--brand-text)" }}>{k}</dt>
                    <dd className="mt-2 text-xs uppercase tracking-widest brand-text-muted">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>

        {/* PILARES */}
        <section className="border-t" style={{ borderColor: "var(--brand-border)" }}>
          <div className="container-x py-20 md:py-28">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.22em] brand-text-muted">O que a Academy entrega</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 font-editorial text-4xl md:text-5xl max-w-3xl text-balance">
                Um <span className="text-gradient-lab">ecossistema editorial</span>{" "}
                para formar quem mantém o condomínio de pé.
              </h2>
            </Reveal>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {PILLARS.map((p, i) => (
                <Reveal key={p.title} delay={i * 90}>
                  <CursorGlow
                    className="h-full rounded-3xl p-8 border transition"
                  >
                    <div
                      className="rounded-3xl h-full"
                      style={{ background: "var(--brand-surface)", borderColor: "var(--brand-border)" }}
                    >
                      <div
                        className="rounded-3xl p-8 h-full border"
                        style={{ borderColor: "var(--brand-border)", background: "var(--brand-surface)" }}
                      >
                        <p className="text-[11px] uppercase tracking-[0.22em] brand-text-muted">{p.kicker}</p>
                        <h3 className="mt-4 font-display text-2xl" style={{ color: "var(--brand-text)" }}>{p.title}</h3>
                        <p className="mt-3 text-sm leading-relaxed brand-text-muted">{p.body}</p>
                      </div>
                    </div>
                  </CursorGlow>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* MARQUEE — assinatura editorial */}
        <section className="border-t overflow-hidden" style={{ borderColor: "var(--brand-border)" }}>
          <div className="py-10 flex whitespace-nowrap animate-marquee">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-14 pr-14 font-editorial text-4xl md:text-6xl">
                <span>{orgName}</span><span className="text-gradient-lab">Academy</span>
                <span>white label</span><span className="text-gradient-lab">multi-tenant</span>
                <span>streaming</span><span className="text-gradient-lab">editorial</span>
                <span>Studio Marqo</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t" style={{ borderColor: "var(--brand-border)" }}>
          <div className="container-x py-20 md:py-28">
            <div
              className="rounded-3xl p-10 md:p-16 relative overflow-hidden border"
              style={{ background: "var(--brand-surface)", borderColor: "var(--brand-border)" }}
            >
              <div
                aria-hidden
                className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full opacity-50"
                style={{ background: "var(--gradient-lab)", filter: "blur(100px)" }}
              />
              <Reveal>
                <p className="text-xs uppercase tracking-[0.22em] brand-text-muted">Comece agora</p>
              </Reveal>
              <Reveal delay={80}>
                <h2 className="mt-4 font-editorial text-4xl md:text-5xl max-w-2xl text-balance">
                  Ative a Academy da sua administradora em minutos.
                </h2>
              </Reveal>
              <Reveal delay={160}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/catalogo" className="btn-primary">
                    Explorar catálogo <span className="btn-arrow">→</span>
                  </Link>
                  <Link to="/login" className="btn-ghost">
                    {session ? "Entrar na minha área" : "Criar conta"} <span className="btn-arrow">→</span>
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Footer minimal */}
        <footer className="border-t" style={{ borderColor: "var(--brand-border)" }}>
          <div className="container-x py-10 flex flex-wrap items-center justify-between gap-4 text-sm brand-text-muted">
            <span>© {new Date().getFullYear()} {orgName}. Academy powered by SíndicoLab.</span>
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
