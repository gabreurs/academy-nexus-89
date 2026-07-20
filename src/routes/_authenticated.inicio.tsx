import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";

export const Route = createFileRoute("/_authenticated/inicio")({ ssr: false, component: Home });

type Course = {
  id: string; slug: string; title: string; subtitle: string | null;
  cover_url: string | null; banner_url: string | null;
  instructor_name: string | null; duration_minutes: number | null;
  category_id: string | null; created_at: string;
};

function Home() {
  const { session } = useAuth();
  const { tenant } = useTenant();
  const [items, setItems] = useState<Course[]>([]);
  const [purchased, setPurchased] = useState<Course[]>([]);
  const [progress, setProgress] = useState<Record<string, { percent: number; updated_at?: string }>>({});

  useEffect(() => {
    if (!tenant || !session) return;
    (async () => {
      const { data: cat } = await supabase.from("organization_course_catalog")
        .select("course_id").eq("organization_id", tenant.organization.id).eq("is_visible", true);
      const ids = (cat ?? []).map((c: any) => c.course_id);
      const { data: cs } = ids.length
        ? await supabase.from("courses").select("*").in("id", ids).eq("status", "published")
        : { data: [] as any[] };
      setItems((cs as Course[]) ?? []);

      const { data: ents } = await supabase.from("course_entitlements")
        .select("course_id").eq("user_id", session.user.id);
      const entIds = Array.from(new Set((ents ?? []).map((e: any) => e.course_id)))
        .filter((id) => !ids.includes(id));
      const { data: pcs } = entIds.length
        ? await supabase.from("courses").select("*").in("id", entIds).eq("status", "published")
        : { data: [] as any[] };
      setPurchased((pcs as Course[]) ?? []);

      const { data: pr } = await supabase.from("course_progress").select("*").eq("user_id", session.user.id);
      const map: Record<string, any> = {};
      (pr ?? []).forEach((p: any) => (map[p.course_id] = p));
      setProgress(map);
    })();
  }, [tenant?.organization.id, session?.user?.id]);

  const allCourses = useMemo(() => [...items, ...purchased], [items, purchased]);

  // Rail: continue assistindo (progresso > 0 e < 100)
  const continueList = useMemo(() => {
    return allCourses
      .filter((c) => {
        const p = progress[c.id]?.percent ?? 0;
        return p > 0 && p < 100;
      })
      .sort((a, b) => {
        const ta = progress[a.id]?.updated_at ?? "";
        const tb = progress[b.id]?.updated_at ?? "";
        return tb.localeCompare(ta);
      });
  }, [allCourses, progress]);

  // Rail: novos (por created_at)
  const newest = useMemo(
    () => [...items].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 10),
    [items],
  );

  // Destaque: primeiro em "continuar" ou primeiro do catálogo
  const hero = continueList[0] ?? items[0] ?? null;
  const heroProgress = hero ? progress[hero.id]?.percent ?? 0 : 0;

  const firstName = session?.user?.email?.split("@")[0] ?? "aluno";

  return (
    <div className="player-shell">
      <SiteHeader />

      {/* HERO cinemático — capa do curso em destaque */}
      <section className="relative overflow-hidden" style={{ background: "var(--player-bg)" }}>
        <div className="relative h-[62vh] min-h-[420px] max-h-[640px] w-full">
          {hero?.banner_url || hero?.cover_url ? (
            <img
              src={hero.banner_url ?? hero.cover_url ?? ""}
              alt={hero.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0" style={{
              background: "radial-gradient(ellipse at 25% 30%, color-mix(in oklab, var(--tenant-accent) 30%, transparent), transparent 55%), var(--player-bg)",
            }} />
          )}
          {/* Vinheta escura para legibilidade */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(5,7,14,.35) 0%, rgba(5,7,14,.55) 45%, rgba(5,7,14,.95) 100%), linear-gradient(90deg, rgba(5,7,14,.85) 0%, rgba(5,7,14,.15) 60%)",
            }}
          />
          <div className="relative container-x h-full flex flex-col justify-end pb-14 md:pb-16">
            <p className="text-[11px] uppercase tracking-[0.28em] player-muted">
              {continueList.length > 0 ? "Continue assistindo" : `Oi, ${firstName}`}
            </p>
            {hero ? (
              <>
                <h1 className="mt-4 font-editorial text-4xl md:text-6xl max-w-3xl text-balance">
                  {hero.title}
                </h1>
                {hero.subtitle && (
                  <p className="mt-4 max-w-xl text-sm md:text-base player-muted">
                    {hero.subtitle}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    to="/curso/$courseSlug/aprender"
                    params={{ courseSlug: hero.slug }}
                    className="player-cta inline-flex items-center gap-2"
                  >
                    ▶ {heroProgress > 0 ? "Retomar" : "Assistir agora"}
                  </Link>
                  <Link
                    to="/curso/$courseSlug"
                    params={{ courseSlug: hero.slug }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border player-border text-sm hover:bg-white/5 transition"
                  >
                    Detalhes do curso
                  </Link>
                </div>
                {heroProgress > 0 && (
                  <div className="mt-6 max-w-md">
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(247,250,255,.15)" }}>
                      <div
                        className="h-full"
                        style={{ width: `${heroProgress}%`, background: "var(--tenant-accent)" }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] uppercase tracking-widest player-muted">
                      {heroProgress}% concluído
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="mt-4 font-editorial text-4xl md:text-6xl max-w-3xl">
                  Bem-vindo, {firstName}.
                </h1>
                <p className="mt-3 max-w-md player-muted">
                  Ainda não há títulos liberados para <strong>{tenant?.organization.name}</strong>.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <main className="container-x pb-24 -mt-8 md:-mt-10 relative">
        {continueList.length > 0 && (
          <Rail title="Continue assistindo" items={continueList} progress={progress} />
        )}
        {newest.length > 0 && (
          <Rail title="Novos no acervo" items={newest} progress={progress} />
        )}
        {items.length > 0 && (
          <Rail
            title={`Catálogo de ${tenant?.organization.name ?? "sua organização"}`}
            items={items}
            progress={progress}
          />
        )}
        {purchased.length > 0 && (
          <Rail
            title="Meus cursos comprados"
            subtitle="Acessos avulsos concedidos via checkout externo"
            items={purchased}
            progress={progress}
          />
        )}
        {items.length === 0 && purchased.length === 0 && (
          <div
            className="mt-10 rounded-3xl border p-10 text-center player-border player-surface"
          >
            <p className="font-display text-lg">Nenhum título liberado ainda.</p>
            <p className="mt-2 text-sm player-muted">
              Assim que a curadoria publicar cursos, eles aparecem aqui.
            </p>
          </div>
        )}
      </main>

      <TenantDemoSwitcher />
    </div>
  );
}

function Rail({
  title,
  subtitle,
  items,
  progress,
}: {
  title: string;
  subtitle?: string;
  items: Course[];
  progress: Record<string, { percent: number }>;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <section className="mt-12 first:mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-lg md:text-xl">{title}</h2>
          {subtitle && <p className="mt-1 text-xs player-muted">{subtitle}</p>}
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scrollBy(-1)}
            className="h-9 w-9 rounded-full border player-border hover:bg-white/5 transition text-sm"
            aria-label="Anterior"
          >‹</button>
          <button
            onClick={() => scrollBy(1)}
            className="h-9 w-9 rounded-full border player-border hover:bg-white/5 transition text-sm"
            aria-label="Próximo"
          >›</button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="mt-4 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3"
        style={{ scrollbarWidth: "thin" }}
      >
        {items.map((c) => (
          <RailCard key={c.id} c={c} percent={progress[c.id]?.percent ?? 0} />
        ))}
      </div>
    </section>
  );
}

function RailCard({ c, percent }: { c: Course; percent: number }) {
  return (
    <Link
      to="/curso/$courseSlug"
      params={{ courseSlug: c.slug }}
      className="group snap-start shrink-0 w-[260px] md:w-[300px] rounded-xl overflow-hidden border player-border player-surface hover:-translate-y-0.5 transition"
    >
      <div className="aspect-video player-surface-2 relative overflow-hidden">
        {c.cover_url ? (
          <img
            src={c.cover_url}
            alt={c.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30 text-4xl">▶</div>
        )}
        {percent > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: "rgba(0,0,0,.4)" }}>
            <div className="h-full" style={{ width: `${percent}%`, background: "var(--tenant-accent)" }} />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-sm leading-snug line-clamp-2">{c.title}</h3>
        <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-widest player-muted">
          <span>{c.instructor_name ?? "SíndicoLab"}</span>
          {c.duration_minutes ? <span>{Math.round(c.duration_minutes / 60)}h</span> : null}
        </div>
      </div>
    </Link>
  );
}