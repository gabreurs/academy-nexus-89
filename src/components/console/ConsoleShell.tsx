import type { ReactNode } from "react";
import { SindicoLabMark } from "@/components/brand/SindicoLabMark";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";

export type ConsoleNavGroup = {
  label: string;
  items: { id: string; label: string; hint?: string }[];
};

/**
 * Shell dos consoles (/admin e /empresa).
 * Identidade neutra fixa: a marca do tenant só aparece como marca d'água
 * discreta (logo + nome) quando explicitamente fornecida por /empresa.
 */
export function ConsoleShell({
  kicker,
  title,
  nav,
  active,
  onNavigate,
  brand,
  children,
  footer,
}: {
  kicker: string;
  title: string;
  nav: ConsoleNavGroup[];
  active: string;
  onNavigate: (id: string) => void;
  brand?: { name: string; logoUrl?: string | null; accent?: string | null } | null;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { signOut, user } = useAuth();
  const { resolved, setChoice } = useTheme();

  const navList = (
    <nav className="space-y-5">
      {nav.map((group) => (
        <div key={group.label}>
          <p className="px-2 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.09em] c-muted">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="c-nav-item"
                data-active={active === item.id}
                aria-current={active === item.id ? "page" : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="admin-console">
      <header
        className="sticky top-0 z-40 border-b backdrop-blur"
        style={{ borderColor: "var(--c-border-soft)", background: "color-mix(in oklab, var(--c-surface) 88%, transparent)" }}
      >
        <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SindicoLabMark className="h-7 w-auto shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="truncate text-[11px] uppercase tracking-[0.1em] c-muted">{kicker}</p>
            </div>
            {brand && (
              <span
                className="ml-2 hidden items-center gap-2 rounded-full border px-2.5 py-1 md:inline-flex"
                style={{ borderColor: "var(--c-border-soft)" }}
              >
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt="" className="h-4 w-auto max-w-[72px] object-contain" />
                ) : (
                  <span className="h-2 w-2 rounded-full" style={{ background: brand.accent ?? "var(--c-focus)" }} />
                )}
                <span className="max-w-[160px] truncate text-xs c-muted">{brand.name}</span>
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={resolved === "dark" ? "Usar tema claro" : "Usar tema escuro"}
              className="c-btn min-h-11 min-w-11"
              data-variant="ghost"
              onClick={() => setChoice(resolved === "dark" ? "light" : "dark")}
            >
              {resolved === "dark" ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z" />
                </svg>
              )}
            </button>
            {user?.email && <span className="hidden max-w-[200px] truncate px-2 text-xs c-muted lg:inline">{user.email}</span>}
            <Link to="/inicio" className="c-btn" data-variant="ghost" data-size="sm">Ir para a Academy</Link>
            <button onClick={signOut} className="c-btn" data-variant="secondary" data-size="sm">Sair</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-7 sm:px-6 lg:grid-cols-[228px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[68px] lg:h-fit">
          {navList}
          {footer && <div className="mt-6 border-t c-divide pt-4 text-xs c-muted">{footer}</div>}
        </aside>
        <main className="min-w-0 pb-16">{children}</main>
      </div>
    </div>
  );
}
