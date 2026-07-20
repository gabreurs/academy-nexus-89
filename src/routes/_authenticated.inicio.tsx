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
  const [purchased, setPurchased] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!tenant || !session) return;
    (async () => {
      const { data: cat } = await supabase.from("organization_course_catalog")
        .select("course_id").eq("organization_id", tenant.organization.id).eq("is_visible", true);
      const ids = (cat ?? []).map((c: any) => c.course_id);
      const { data: cs } = ids.length
        ? await supabase.from("courses").select("*").in("id", ids).eq("status", "published")
        : { data: [] as any[] };
      setItems((cs as any[]) ?? []);

      const { data: ents } = await supabase.from("course_entitlements")
        .select("course_id").eq("user_id", session.user.id);
      const entIds = Array.from(new Set((ents ?? []).map((e: any) => e.course_id)))
        .filter((id) => !ids.includes(id));
      const { data: pcs } = entIds.length
        ? await supabase.from("courses").select("*").in("id", entIds).eq("status", "published")
        : { data: [] as any[] };
      setPurchased((pcs as any[]) ?? []);

      const { data: pr } = await supabase.from("course_progress").select("*").eq("user_id", session.user.id);
      const map: Record<string, any> = {};
      (pr ?? []).forEach((p: any) => (map[p.course_id] = p));
      setProgress(map);
    })();
  }, [tenant?.organization.id, session?.user?.id]);

  const renderCard = (c: any) => {
    const p = progress[c.id];
    return (
      <Link
        key={c.id}
        to="/curso/$courseSlug"
        params={{ courseSlug: c.slug }}
        className="group rounded-2xl overflow-hidden border player-border player-surface hover:-translate-y-0.5 transition"
      >
        <div className="aspect-video player-surface-2 relative overflow-hidden">
          {c.cover_url ? (
            <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-30 text-5xl">▶</div>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-display text-base">{c.title}</h3>
          <div className="mt-4 h-1 rounded-full player-surface-2 overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${p?.percent ?? 0}%`, background: "var(--tenant-accent)" }}
            />
          </div>
          <p className="mt-2 text-xs player-muted">{p?.percent ?? 0}% concluído</p>
        </div>
      </Link>
    );
  };

  const firstName = session?.user?.email?.split("@")[0] ?? "aluno";
  return (
    <div className="player-shell">
      <SiteHeader />
      <section className="player-hero">
        <div className="container-x pt-14 pb-16 md:pt-20 md:pb-24">
          <p className="text-[11px] uppercase tracking-[0.24em] player-muted">Minha área</p>
          <h1 className="mt-4 font-editorial text-4xl md:text-5xl text-balance max-w-3xl">
            Continue de onde parou, <span className="player-accent">{firstName}</span>.
          </h1>
          <p className="mt-4 max-w-xl player-muted">
            Todos os cursos disponíveis para <strong>{tenant?.organization.name}</strong>{" "}
            reunidos em um único palco de consumo.
          </p>
        </div>
      </section>

      <main className="container-x pb-24">
        <div className="flex items-baseline justify-between mt-4">
          <h2 className="font-display text-xl">Seu catálogo</h2>
          <span className="text-xs uppercase tracking-widest player-muted">{items.length} títulos</span>
        </div>
        <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map(renderCard)}
          {items.length === 0 && (
            <p className="player-muted">Nenhum curso liberado ainda para sua organização.</p>
          )}
        </div>
        {purchased.length > 0 && (
          <>
            <div className="mt-16 flex items-baseline justify-between">
              <h2 className="font-display text-xl">Meus cursos comprados</h2>
              <span className="text-xs uppercase tracking-widest player-muted">acesso avulso</span>
            </div>
            <p className="mt-1 text-sm player-muted">
              Acessos concedidos por compra direta via checkout externo.
            </p>
            <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {purchased.map(renderCard)}
            </div>
          </>
        )}
      </main>
      <TenantDemoSwitcher />
    </div>
  );
}