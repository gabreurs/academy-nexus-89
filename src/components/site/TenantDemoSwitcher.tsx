import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { useAuth } from "@/lib/auth/AuthProvider";

type Org = { id: string; slug: string; name: string };

export function TenantDemoSwitcher() {
  const { tenant, overrideSlug } = useTenant();
  const { isPlatformAdmin, loading } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    supabase.from("organizations").select("id, slug, name").eq("status", "active").order("name")
      .then(({ data }) => setOrgs((data as Org[]) ?? []));
  }, [isPlatformAdmin]);

  if (loading || !isPlatformAdmin) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 brand-surface border brand-border rounded-lg p-3 w-64 shadow-2xl">
          <p className="text-xs brand-text-muted mb-2 uppercase tracking-wider">Demo — trocar white label</p>
          <div className="space-y-1">
            {orgs.map((o) => (
              <button key={o.id} onClick={() => { overrideSlug(o.slug); setOpen(false); }}
                className={"w-full text-left text-sm px-2 py-1.5 rounded hover:bg-white/5 " + (tenant?.organization.slug === o.slug ? "brand-accent font-medium" : "")}>
                {o.name}
              </button>
            ))}
            <button onClick={() => { overrideSlug(null); setOpen(false); }}
              className="w-full text-left text-xs brand-text-muted px-2 py-1.5 rounded hover:bg-white/5 mt-2 border-t brand-border pt-2">
              Limpar (usar hostname)
            </button>
          </div>
          <p className="mt-3 text-[10px] brand-text-muted leading-snug">
            O seletor só troca a visualização. RLS continua governando o que cada usuário pode acessar.
          </p>
        </div>
      )}
      <button onClick={() => setOpen(!open)}
        className="brand-surface border brand-border rounded-full px-4 py-2 text-xs shadow-lg hover:opacity-90">
        {tenant?.organization.name ?? "…"} · demo
      </button>
    </div>
  );
}