import { useTenant } from "@/lib/tenant/TenantProvider";

/**
 * Logo real da organização, sempre a partir de organization_branding.
 * Em superfície escura preferimos a variante clara oficial (logo_dark_url =
 * "logo para fundo escuro"); se a organização só cadastrou a variante para
 * fundo claro, usamos uma placa discreta em vez de recolorir o asset.
 * Wordmark só existe quando a organização ainda NÃO tem logo cadastrado.
 */
export function TenantLogo({ className = "" }: { className?: string }) {
  const { tenant } = useTenant();
  const name = tenant?.organization?.name ?? "Academy";
  const onDark = tenant?.branding?.logo_dark_url;
  const onLight = tenant?.branding?.logo_light_url;

  if (onDark) {
    return <img src={onDark} alt={name} className={`h-7 w-auto ${className}`} />;
  }
  if (onLight) {
    return (
      <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1.5">
        <img src={onLight} alt={name} className={`h-5 w-auto ${className}`} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-6 w-6 rounded-md"
        style={{ background: "var(--tenant-accent)" }}
        aria-hidden
      />
      <span
        className="font-display text-[17px] leading-none"
        style={{ color: "#F5F5F5", letterSpacing: "-0.03em" }}
      >
        {name}
      </span>
    </span>
  );
}