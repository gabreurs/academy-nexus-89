import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenantIdentity } from "@/lib/tenant/useTenantIdentity";
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="academy-header"
      data-transparent={transparent && !scrolled ? "true" : "false"}
      data-scrolled={scrolled ? "true" : "false"}
    >
      <div className="academy-container flex h-full items-center justify-between gap-4">
        <Link to={showAuthed ? "/inicio" : "/"} className="flex shrink-0 items-center" aria-label="Início">
          <TenantLogo />
        </Link>

        <nav className="flex min-w-0 items-center gap-1">
          <Link to="/catalogo" className="academy-nav-link" activeProps={{ "data-active": "true" } as any}>
            Catálogo
          </Link>
          {showAuthed ? (
            <>
              <Link
                to="/inicio"
                className="academy-nav-link hidden sm:inline-flex"
                activeProps={{ "data-active": "true" } as any}
              >
                Minha área
              </Link>
              <AccountMenu
                email={visibleSession?.user?.email ?? ""}
                isOrgAdmin={isOrgAdmin()}
                isPlatformAdmin={isPlatformAdmin}
                onSignOut={signOut}
              />
            </>
          ) : (
            <Link to="/login" search={{ next: "/inicio" }} className="academy-cta ml-1">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
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
    <div className="relative ml-1" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Conta"
        className="grid h-10 w-10 place-items-center rounded-full text-[15px] font-semibold"
        style={{
          background: "var(--tenant-accent)",
          color: "var(--tenant-accent-contrast)",
        }}
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] w-60 overflow-hidden rounded-2xl border p-1.5"
          style={{
            background: "#151515",
            borderColor: "rgba(255,255,255,.12)",
            boxShadow: "0 24px 60px rgba(0,0,0,.6)",
          }}
        >
          <p className="truncate px-3 py-2 text-[12px]" style={{ color: "#737373" }}>
            {email}
          </p>
          <MenuLink to="/inicio" onClick={() => setOpen(false)}>Minha área</MenuLink>
          <MenuLink to="/catalogo" onClick={() => setOpen(false)}>Catálogo</MenuLink>
          {isOrgAdmin && <MenuLink to="/empresa" onClick={() => setOpen(false)}>Minha empresa</MenuLink>}
          {isPlatformAdmin && <MenuLink to="/admin" onClick={() => setOpen(false)}>Console de administração</MenuLink>}
          <button
            role="menuitem"
            onClick={() => { setOpen(false); void onSignOut(); }}
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-[14px] transition hover:bg-white/8"
            style={{ color: "#D4D4D4" }}
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to as any}
      role="menuitem"
      onClick={onClick}
      className="block rounded-xl px-3 py-2 text-[14px] transition hover:bg-white/8"
      style={{ color: "#F5F5F5" }}
    >
      {children}
    </Link>
  );
}