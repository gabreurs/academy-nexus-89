import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/AuthProvider";

export function AdminHeader() {
  const { signOut, user } = useAuth();
  return (
    <header
      className="border-b brand-border sticky top-0 z-40 backdrop-blur"
      style={{ background: "color-mix(in oklab, var(--brand-bg) 92%, transparent)" }}
    >
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-xs font-bold"
            style={{ background: "var(--brand-primary)", color: "white" }}
          >
            SL
          </span>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight text-sm">SíndicoLab</p>
            <p className="text-[11px] brand-text-muted uppercase tracking-widest">
              Console de administração
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/inicio" className="px-3 py-1.5 rounded hover:bg-white/5 brand-text-muted">
            Sair do console
          </Link>
          {user?.email && (
            <span className="px-3 py-1.5 brand-text-muted text-xs hidden sm:inline">
              {user.email}
            </span>
          )}
          <button onClick={signOut} className="px-3 py-1.5 rounded hover:bg-white/5 brand-text-muted">
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
}