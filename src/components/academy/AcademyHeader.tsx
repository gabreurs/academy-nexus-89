import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Building2, LogOut, Monitor, Moon, Search, Shield, Sun, User } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenantIdentity } from "@/lib/tenant/useTenantIdentity";
import { useTheme, type ThemeChoice } from "@/lib/theme/ThemeProvider";
import { TenantLogo } from "./TenantLogo";

/**
 * Header global da Academy — compartilhado por todos os tenants.
 * Estrutura, altura, contraste e comportamento são fixos; o tenant entra
 * apenas pelo logo e pelo accent do CTA.
 */
export function AcademyHeader({ transparent = false }: { transparent?: boolean }) {
  const { isOrgAdmin, signOut } = useAuth();
  const { visibleSession, hasTenantAccess, isPlatformAdmin } = useTenantIdentity();
  const showAuthed = !!visibleSession && hasTenantAccess;
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="ax-header" data-transparent={transparent && !scrolled ? "true" : "false"}>
      <div className="ax-container flex h-full items-center gap-3 md:gap-6">
        <Link to={showAuthed ? "/inicio" : "/"} className="flex shrink-0 items-center" aria-label="Início">
          <TenantLogo />
        </Link>

        <nav className="hidden min-w-0 items-center gap-0.5 md:flex">
          {showAuthed && (
            <Link to="/inicio" className="ax-navlink" activeProps={{ "data-active": "true" } as any}>
              Meus estudos
            </Link>
          )}
          <Link to="/catalogo" className="ax-navlink" activeProps={{ "data-active": "true" } as any}>
            Catálogo
          </Link>
        </nav>

        <form
          className="ax-search ml-auto w-full max-w-[120px] sm:max-w-[240px] lg:max-w-[320px]"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/catalogo", search: { q: q.trim() || undefined } });
          }}
          role="search"
        >
          <Search size={15} className="shrink-0" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cursos"
            aria-label="Buscar cursos"
          />
        </form>

        {showAuthed ? (
          <AccountMenu
            email={visibleSession?.user?.email ?? ""}
            isOrgAdmin={isOrgAdmin()}
            isPlatformAdmin={isPlatformAdmin}
            onSignOut={signOut}
          />
        ) : (
          <>
            <ThemeToggle />
            <Link to="/login" search={{ next: "/inicio" }} className="ax-btn shrink-0" data-variant="primary">
              Entrar
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

/** Alternância de tema: claro é o padrão, escuro é preferência do usuário. */
function ThemeToggle({ full = false }: { full?: boolean }) {
  const { choice, setChoice } = useTheme();
  const options: { value: ThemeChoice; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Claro", icon: <Sun size={14} /> },
    { value: "dark", label: "Escuro", icon: <Moon size={14} /> },
    { value: "system", label: "Sistema", icon: <Monitor size={14} /> },
  ];
  return (
    <div
      className={`${full ? "flex w-full" : "hidden sm:flex"} shrink-0 items-center gap-0.5 rounded-full p-0.5`}
      style={{ background: "var(--ax-veil)" }}
      role="group"
      aria-label="Tema da interface"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setChoice(o.value)}
          aria-pressed={choice === o.value}
          title={o.label}
          className={`inline-flex ${full ? "flex-1 justify-center" : ""} items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] transition`}
          style={
            choice === o.value
              ? { background: "var(--ax-surface)", color: "var(--ax-text)", boxShadow: "var(--ax-shadow-sm)" }
              : { color: "var(--ax-text-tertiary)" }
          }
        >
          {o.icon}
          {full && o.label}
        </button>
      ))}
    </div>
  );
}

function AccountMenu({
  email,
  isOrgAdmin,
  isPlatformAdmin,
  onSignOut,
}: {
  email: string;
  isOrgAdmin: boolean;
  isPlatformAdmin: boolean;
  onSignOut: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const initial = (email?.[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Conta"
        className="grid h-10 w-10 place-items-center rounded-full text-[15px] font-semibold"
        style={{ background: "var(--tenant-accent)", color: "var(--tenant-accent-contrast)" }}
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="ax-panel-raised absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden p-1.5"
          style={{ boxShadow: "var(--ax-shadow-lg)" }}
        >
          <p className="ax-meta truncate px-3 py-2">{email}</p>
          <div className="ax-divider my-1" />
          <div className="px-1.5 pb-1.5 pt-0.5">
            <ThemeToggle full />
          </div>
          <div className="ax-divider my-1" />
          <MenuLink to="/inicio" onClick={() => setOpen(false)} icon={<User size={15} />}>
            Meus estudos
          </MenuLink>
          <MenuLink to="/catalogo" onClick={() => setOpen(false)} icon={<Search size={15} />}>
            Catálogo
          </MenuLink>
          {isOrgAdmin && (
            <MenuLink to="/empresa" onClick={() => setOpen(false)} icon={<Building2 size={15} />}>
              Minha empresa
            </MenuLink>
          )}
          {isPlatformAdmin && (
            <MenuLink to="/admin" onClick={() => setOpen(false)} icon={<Shield size={15} />}>
              Console de administração
            </MenuLink>
          )}
          <div className="ax-divider my-1" />
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void onSignOut();
            }}
            className="ax-menuitem flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[14px] transition"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  to,
  onClick,
  icon,
  children,
}: {
  to: string;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to as any}
      role="menuitem"
      onClick={onClick}
      className="ax-menuitem flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14px] transition"
      style={{ color: "var(--ax-text)" }}
    >
      {icon}
      {children}
    </Link>
  );
}
