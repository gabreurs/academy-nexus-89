import { Link } from "@tanstack/react-router";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenantIdentity } from "@/lib/tenant/useTenantIdentity";

export function SiteHeader() {
  const { tenant } = useTenant();
  const { isOrgAdmin, signOut } = useAuth();
  const { visibleSession, hasTenantAccess, isPlatformAdmin } = useTenantIdentity();
  const org = tenant?.organization;
  const logoLight = tenant?.branding?.logo_light_url; // para fundos claros
  const logoDark = tenant?.branding?.logo_dark_url;   // para fundos escuros (player)
  // Only show authenticated chrome when the session actually belongs on this
  // tenant. On a foreign tenant, present the visitor experience.
  const showAuthed = !!visibleSession && hasTenantAccess;

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{
        borderColor: "var(--brand-border)",
        background: "color-mix(in oklab, var(--brand-bg) 82%, transparent)",
      }}
    >
      <div className="container-x h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          {logoLight || logoDark ? (
            <>
              {logoLight && (
                <img
                  src={logoLight}
                  alt={org?.name ?? ""}
                  className="h-6 md:h-7 logo-on-light"
                />
              )}
              {logoDark && (
                <img
                  src={logoDark}
                  alt={org?.name ?? ""}
                  className="h-6 md:h-7 logo-on-dark"
                />
              )}
            </>
          ) : (
            <span className="font-display text-lg" style={{ color: "var(--brand-text)" }}>
              {org?.name ?? "Academy"}
            </span>
          )}
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/catalogo" className="px-3 py-1.5 rounded-full hover:opacity-80 transition"
                style={{ color: "var(--brand-text)" }}>Catálogo</Link>
          {showAuthed ? (
            <>
              <Link to="/inicio" className="px-3 py-1.5 rounded-full hover:opacity-80 transition"
                    style={{ color: "var(--brand-text)" }}>Minha área</Link>
              {isOrgAdmin() && (
                <Link to="/empresa" className="px-3 py-1.5 rounded-full hover:opacity-80 transition"
                      style={{ color: "var(--brand-text)" }}>Empresa</Link>
              )}
              {isPlatformAdmin && (
                <Link to="/admin" className="px-3 py-1.5 rounded-full hover:opacity-80 transition"
                      style={{ color: "var(--brand-text)" }}>Admin</Link>
              )}
              <button onClick={signOut} className="px-3 py-1.5 rounded-full transition brand-text-muted hover:opacity-80">
                Sair
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary">
              Entrar <span className="btn-arrow">→</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}