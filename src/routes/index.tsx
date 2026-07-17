import { createFileRoute, Link } from "@tanstack/react-router";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";

export const Route = createFileRoute("/")({
  ssr: false,
  component: LandingPage,
});

function LandingPage() {
  const { tenant, loading } = useTenant();
  const { session } = useAuth();

  if (loading) return <FullScreenLoading />;

  const welcomeTitle = tenant?.branding?.welcome_title ?? tenant?.organization.name;
  const welcomeMsg = tenant?.branding?.welcome_message ?? "Capacitação contínua para o mercado condominial.";

  return (
    <div className="min-h-screen" style={{ background: "var(--brand-bg)", color: "var(--brand-text)" }}>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-widest brand-accent mb-4">{tenant?.branding?.environment_name ?? "Academy"}</p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">{welcomeTitle}</h1>
          <p className="mt-6 text-lg brand-text-muted max-w-2xl">{welcomeMsg}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/catalogo" className="rounded-lg px-6 py-3 font-medium brand-btn">Ver catálogo</Link>
            {session ? (
              <Link to="/inicio" className="rounded-lg px-6 py-3 font-medium border brand-border">Ir para minha área</Link>
            ) : (
              <Link to="/login" className="rounded-lg px-6 py-3 font-medium border brand-border">Entrar</Link>
            )}
          </div>
        </div>

        <section className="mt-20 grid gap-6 md:grid-cols-3">
          <FeatureCard title="White label real" body="Cada organização com sua marca, cores, logotipo e catálogo próprio — sobre um único produto." />
          <FeatureCard title="Trilhas condominiais" body="Cursos práticos para porteiros, síndicos, gestores e equipes de atendimento." />
          <FeatureCard title="Progresso persistente" body="Continue de onde parou, em qualquer dispositivo, com histórico e certificações." />
        </section>
      </main>
      <TenantDemoSwitcher />
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="brand-surface rounded-xl p-6 border brand-border">
      <h3 className="font-medium text-lg">{title}</h3>
      <p className="mt-2 text-sm brand-text-muted">{body}</p>
    </div>
  );
}

function FullScreenLoading() {
  return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--brand-bg)" }}>
    <div className="text-sm brand-text-muted">Carregando ambiente…</div>
  </div>;
}
