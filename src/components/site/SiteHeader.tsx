import { Link } from "@tanstack/react-router";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenantIdentity } from "@/lib/tenant/useTenantIdentity";

export function SiteHeader() {
  const { tenant } = useTenant();
  const { isOrgAdmin, signOut } = useAuth();
  const { visibleSession, hasTenantAccess, isPlatformAdmin } = useTenantIdentity();
  const org = tenant?.organization;
  const logo = tenant?.branding?.logo_light_url;
  // Only show authenticated chrome when the session actually belongs on this
  // tenant. On a foreign tenant, present the visitor experience.
  const showAuthed = !!visibleSession && hasTenantAccess;

  return (
    <header className="border-b brand-border sticky top-0 z-40 backdrop-blur" style={{ background: "color-mix(in oklab, var(--brand-bg) 90%, transparent)" }}>
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt={org?.name ?? ""} className="h-8" />
          ) : (
            <span className="font-semibold tracking-tight text-lg">{org?.name ?? "Academy"}</span>
          )}
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/catalogo" className="px-3 py-1.5 rounded hover:bg-white/5">Catálogo</Link>
          {showAuthed ? (
            <>
              <Link to="/inicio" className="px-3 py-1.5 rounded hover:bg-white/5">Minha área</Link>
              {isOrgAdmin() && <Link to="/empresa" className="px-3 py-1.5 rounded hover:bg-white/5">Empresa</Link>}
              {isPlatformAdmin && <Link to="/admin" className="px-3 py-1.5 rounded hover:bg-white/5">Admin</Link>}
              <button onClick={signOut} className="px-3 py-1.5 rounded hover:bg-white/5 brand-text-muted">Sair</button>
            </>
          ) : (
            <Link to="/login" className="px-3 py-1.5 rounded brand-btn">Entrar</Link>
          )}
        </nav>
      </div>
    </header>
  );
}