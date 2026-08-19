import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { AcademyHeader } from "./AcademyHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";

/**
 * Shell único da plataforma (Camada 1).
 * Toda superfície tenant-facing — storefront, área logada, catálogo,
 * detalhe de curso — vive dentro deste shell. O tenant entra apenas pelo
 * logo do header e pelo accent; a estrutura nunca muda.
 */
export function AcademyShell({
  children,
  transparentHeader = false,
  footer = true,
}: {
  children: ReactNode;
  transparentHeader?: boolean;
  footer?: boolean;
}) {
  const { tenant } = useTenant();
  const orgName = tenant?.organization?.name ?? "Academy";

  return (
    <div className="academy flex min-h-screen flex-col">
      <AcademyHeader transparent={transparentHeader} />

      <main className="flex-1">{children}</main>

      {footer && (
        <footer className="ax-footer mt-16">
          <div className="ax-container flex flex-wrap items-center justify-between gap-4 py-8">
            <span>
              © {new Date().getFullYear()} {orgName} · Academy operada por SíndicoLab
            </span>
            <nav className="flex items-center gap-4">
              <Link to="/catalogo" className="hover:opacity-80">
                Catálogo
              </Link>
              <Link to="/login" search={{ next: "/inicio" }} className="hover:opacity-80">
                Acessar
              </Link>
            </nav>
          </div>
        </footer>
      )}

      <TenantDemoSwitcher />
    </div>
  );
}
