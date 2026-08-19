import { useTenant } from "@/lib/tenant/TenantProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";

/**
 * Logo real da organização, sempre a partir de organization_branding.
 * A variante é escolhida pela SUPERFÍCIE em que o logo está: `onDark` força
 * a leitura em fundo escuro (player, faixas institucionais), caso contrário
 * seguimos o tema resolvido — light-first. Nunca recolorimos o asset: se a
 * variante necessária não existe, usamos a outra sobre uma placa neutra.
 */
export function TenantLogo({ className = "", onDark = false }: { className?: string; onDark?: boolean }) {
  const { tenant } = useTenant();
  const { resolved } = useTheme();
  const name = tenant?.organization?.name ?? "Academy";
  const forDark = tenant?.branding?.logo_dark_url;
  const forLight = tenant?.branding?.logo_light_url;
  const darkSurface = onDark || resolved === "dark";

  const preferred = darkSurface ? forDark : forLight;
  const fallback = darkSurface ? forLight : forDark;

  if (preferred) return <img src={preferred} alt={name} className={`h-7 w-auto ${className}`} />;
  if (fallback) {
    return (
      <span
        className="inline-flex items-center rounded-lg px-2.5 py-1.5"
        style={{ background: darkSurface ? "#FFFFFF" : "#101014" }}
      >
        <img src={fallback} alt={name} className={`h-5 w-auto ${className}`} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-6 w-6 rounded-md" style={{ background: "var(--tenant-accent)" }} aria-hidden />
      <span className="font-display text-[17px] leading-none" style={{ color: "var(--ax-text)", letterSpacing: "-0.03em" }}>
        {name}
      </span>
    </span>
  );
}
