import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";

export const Route = createFileRoute("/_authenticated/inicio")({ ssr: false, component: Home });

function Home() {
  const { session } = useAuth();
  const { tenant } = useTenant();
  const [items, setItems] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!tenant || !session) return;
    (async () => {
      const { data: cat } = await supabase.from("organization_course_catalog")
        .select("course_id").eq("organization_id", tenant.organization.id).eq("is_visible", true);
      const ids = (cat ?? []).map((c: any) => c.course_id);
      const { data: cs } = await supabase.from("courses").select("*").in("id", ids).eq("status", "published");
      setItems((cs as any[]) ?? []);
      const { data: pr } = await supabase.from("course_progress").select("*").eq("user_id", session.user.id);
      const map: Record<string, any> = {};
      (pr ?? []).forEach((p: any) => (map[p.course_id] = p));
      setProgress(map);
    })();
  }, [tenant?.organization.id, session?.user?.id]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Olá 👋</h1>
        <p className="brand-text-muted mt-1">Continue de onde parou ou explore seu catálogo.</p>
        <h2 className="mt-10 text-xl font-medium">Seu catálogo</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const p = progress[c.id];
            return (
              <Link key={c.id} to="/curso/$courseSlug" params={{ courseSlug: c.slug }}
                className="brand-surface rounded-xl overflow-hidden border brand-border hover:border-white/20">
                <div className="aspect-video brand-surface-2 flex items-center justify-center opacity-40 text-4xl">▶</div>
                <div className="p-4">
                  <h3 className="font-medium">{c.title}</h3>
                  <div className="mt-3 h-1.5 rounded-full brand-surface-2 overflow-hidden">
                    <div className="h-full brand-btn" style={{ width: `${p?.percent ?? 0}%` }} />
                  </div>
                  <p className="mt-2 text-xs brand-text-muted">{p?.percent ?? 0}% concluído</p>
                </div>
              </Link>
            );
          })}
          {items.length === 0 && <p className="brand-text-muted">Nenhum curso liberado ainda.</p>}
        </div>
      </main>
      <TenantDemoSwitcher />
    </div>
  );
}