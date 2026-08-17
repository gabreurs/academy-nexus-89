import { createFileRoute, Link } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";
import { CoursePoster } from "@/components/course/CoursePoster";
import { useMyList } from "@/lib/list/useMyList";

export const Route = createFileRoute("/_authenticated/inicio")({ ssr: false, component: Home });

type Course = {
  id: string; slug: string; title: string; subtitle: string | null;
  description: string | null;
  cover_url: string | null; banner_url: string | null;
  instructor_name: string | null; duration_minutes: number | null;
  category_id: string | null; level: string | null;
  is_featured: boolean | null; is_required: boolean | null;
  trailer_url: string | null; owner_org_id: string | null;
  created_at: string;
};

function Home() {
  const { session } = useAuth();
  const { tenant } = useTenant();
  const [items, setItems] = useState<Course[]>([]);
  const [purchased, setPurchased] = useState<Course[]>([]);
  const [progress, setProgress] = useState<Record<string, { percent: number; updated_at?: string; open_count?: number; last_accessed_at?: string }>>({});
  const { ids: myListIds, toggle: toggleMyList } = useMyList(session?.user?.id, tenant?.organization.id);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [categories, setCategories] = useState<{ id: string; name: string; sort_order: number }[]>([]);

  useEffect(() => {
    supabase.from("course_categories").select("id, name, sort_order").order("sort_order")
      .then(({ data }) => setCategories((data as any[]) ?? []));
  }, []);

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

      // Avaliação real (course_reviews) — nenhuma métrica inventada.
      const allIds = Array.from(new Set([...ids, ...entIds]));
      if (allIds.length) {
        const { data: rv } = await supabase.from("course_reviews").select("course_id, rating").in("course_id", allIds);
        const agg: Record<string, { sum: number; count: number }> = {};
        (rv ?? []).forEach((r: any) => {
          const a = (agg[r.course_id] ??= { sum: 0, count: 0 });
          a.sum += r.rating; a.count += 1;
        });
        setRatings(
          Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, { avg: v.sum / v.count, count: v.count }])),
        );
      }
    })();
  }, [tenant?.organization.id, session?.user?.id]);

  const allCourses = useMemo(() => [...items, ...purchased], [items, purchased]);

  const continueList = useMemo(() => {
    return allCourses
      .filter((c) => {
        const pr = progress[c.id];
        if (!pr) return false;
        // Cursos nativos: percentual real. Cursos por embed externo: não temos
        // progresso interno, então usamos apenas o que sabemos (aberturas).
        const p = pr.percent ?? 0;
        if (p >= 100) return false;
        return p > 0 || (pr.open_count ?? 0) > 0;
      })
      .sort((a, b) =>
        (progress[b.id]?.last_accessed_at ?? progress[b.id]?.updated_at ?? "")
          .localeCompare(progress[a.id]?.last_accessed_at ?? progress[a.id]?.updated_at ?? ""),
      );
  }, [allCourses, progress]);

  const featured = useMemo(() => items.filter((c) => c.is_featured), [items]);
  const required = useMemo(() => items.filter((c) => c.is_required), [items]);
  const newest = useMemo(
    () => [...items].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 12),
    [items],
  );
  const orgOwned = useMemo(
    () => items.filter((c) => c.owner_org_id === tenant?.organization.id),
    [items, tenant?.organization.id],
  );
  const trailers = useMemo(() => allCourses.filter((c) => !!c.trailer_url), [allCourses]);
  const categoryRails = useMemo(
    () =>
      categories
        .map((cat) => ({ cat, list: items.filter((c) => c.category_id === cat.id) }))
        .filter((r) => r.list.length > 0),
    [categories, items],
  );
  const categoryNameById = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [categories]);
  const myList = useMemo(
    () => allCourses.filter((c) => myListIds.has(c.id)),
    [allCourses, myListIds],
  );

  const hero = continueList[0] ?? featured[0] ?? newest[0] ?? items[0] ?? null;
  const heroProgress = hero ? progress[hero.id]?.percent ?? 0 : 0;

  return (
    <div className="player-shell has-hero-header relative">
      <div className="absolute inset-x-0 top-0 z-30">
        <SiteHeader />
      </div>

      {hero ? (
        <Hero course={hero} percent={heroProgress} rating={ratings[hero.id]} inMyList={myListIds.has(hero.id)} onToggleList={toggleMyList} />
      ) : (
        <EmptyHero orgName={tenant?.organization.name ?? ""} />
      )}

      <main className="relative z-10 -mt-8 pb-24 space-y-10 md:space-y-12">
        {continueList.length > 0 && (
          <Rail title="Continue estudando" items={continueList} progress={progress} myListIds={myListIds} onToggleList={toggleMyList} categoryNames={categoryNameById} />
        )}
        {categoryRails.map(({ cat, list }) => (
          <Rail
            key={cat.id}
            title={cat.name}
            items={list}
            categoryName={cat.name}
            progress={progress}
            myListIds={myListIds}
            onToggleList={toggleMyList}
          />
        ))}
        {purchased.length > 0 && (
          <Rail title="Meus cursos comprados" items={purchased} progress={progress} myListIds={myListIds} onToggleList={toggleMyList} categoryNames={categoryNameById} />
        )}
        {myList.length > 0 && (
          <Rail title="Minha lista" items={myList} progress={progress} myListIds={myListIds} onToggleList={toggleMyList} categoryNames={categoryNameById} />
        )}

        {items.length === 0 && purchased.length === 0 && (
          <div className="container-x">
            <div className="rounded-3xl border p-10 text-center player-border player-surface">
              <p className="font-display text-lg">Nenhum título liberado ainda.</p>
              <p className="mt-2 text-sm player-muted">
                Assim que a curadoria publicar cursos, eles aparecem aqui.
              </p>
            </div>
          </div>
        )}
      </main>

      <TenantDemoSwitcher />
    </div>
  );
}

function levelLabel(l?: string | null) {
  if (!l) return null;
  const map: Record<string, string> = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };
  return map[l] ?? l;
}

function fmtDuration(min?: number | null) {
  if (!min) return null;
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m ? ` ${m}min` : ""}` : `${m}min`;
}

function CoverArt({ title, className }: { title: string; className?: string }) {
  return (
    <div className={`cover-art ${className ?? ""}`}>
      <div className="cover-art-title">{title}</div>
    </div>
  );
}

function Hero({
  course, percent, inMyList, onToggleList, rating,
}: {
  course: Course; percent: number; inMyList: boolean;
  onToggleList: (id: string) => void;
  rating?: { avg: number; count: number };
}) {
  const bg = course.banner_url ?? course.cover_url;
  return (
    <section className="relative isolate">
      <div className="relative h-[88vh] min-h-[600px] max-h-[860px] w-full overflow-hidden">
        {bg ? (
          <img src={bg} alt={course.title} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <CoverArt title="" className="absolute inset-0 h-full w-full" />
        )}
        {/* Gradients: strong bottom fade into rails, side vignette for text */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,7,14,.55) 0%, rgba(5,7,14,.15) 25%, rgba(5,7,14,.55) 62%, rgba(5,7,14,1) 100%), linear-gradient(90deg, rgba(5,7,14,.92) 0%, rgba(5,7,14,.4) 45%, rgba(5,7,14,0) 75%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 pb-16 md:pb-20">
          <div className="container-x">
            <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] player-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--tenant-accent)" }} />
              {percent > 0 ? "Continue assistindo" : "Em destaque"}
            </div>
            <h1 className="mt-4 font-editorial text-5xl md:text-7xl leading-[0.95] text-balance">
              {course.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] player-muted">
              {levelLabel(course.level) && (
                <span className="px-2 py-0.5 rounded border player-border">{levelLabel(course.level)}</span>
              )}
              {fmtDuration(course.duration_minutes) && <span>{fmtDuration(course.duration_minutes)}</span>}
              {course.instructor_name && <><span aria-hidden>·</span><span>{course.instructor_name}</span></>}
              {rating && rating.count > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <span style={{ color: "var(--tenant-accent)" }}>★</span>
                    {rating.avg.toFixed(1)}
                    <span className="opacity-70">({rating.count})</span>
                  </span>
                </>
              )}
            </div>
            {(course.subtitle || course.description) && (
              <p className="mt-5 text-[15px] md:text-base leading-relaxed player-muted line-clamp-3 max-w-xl">
                {course.subtitle ?? course.description}
              </p>
            )}
            {percent > 0 && (
              <div className="mt-5 max-w-sm">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(247,250,255,.15)" }}>
                  <div className="h-full" style={{ width: `${percent}%`, background: "var(--tenant-accent)" }} />
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-widest player-muted">{percent}% concluído</p>
              </div>
            )}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/curso/$courseSlug/aprender"
                params={{ courseSlug: course.slug }}
                className="player-cta inline-flex items-center gap-2 text-[15px] px-5 py-3"
              >
                <span aria-hidden>▶</span> {percent > 0 ? "Continuar" : "Começar agora"}
              </Link>
              {course.trailer_url && percent === 0 && (
                <Link
                  to="/curso/$courseSlug"
                  params={{ courseSlug: course.slug }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full border player-border text-sm hover:bg-white/5 transition"
                >
                  Assistir à prévia
                </Link>
              )}
              <Link
                to="/curso/$courseSlug"
                params={{ courseSlug: course.slug }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm transition"
                style={{ background: "rgba(247,250,255,.10)", color: "var(--player-ink)" }}
              >
                <span aria-hidden>ⓘ</span> Mais informações
              </Link>
              <button
                onClick={() => onToggleList(course.id)}
                className="inline-flex items-center justify-center h-11 w-11 rounded-full border player-border hover:bg-white/5 transition"
                aria-label={inMyList ? "Remover da minha lista" : "Adicionar à minha lista"}
                title={inMyList ? "Remover da minha lista" : "Adicionar à minha lista"}
              >
                {inMyList ? "✓" : "+"}
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyHero({ orgName }: { orgName: string }) {
  return (
    <section className="relative h-[70vh] min-h-[480px] w-full overflow-hidden">
      <CoverArt title="" className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,7,14,.6), rgba(5,7,14,1))" }} />
      <div className="relative container-x h-full flex flex-col justify-end pb-16">
        <p className="text-[11px] uppercase tracking-[0.28em] player-muted">Acervo</p>
        <h1 className="mt-3 font-editorial text-4xl md:text-6xl max-w-3xl">
          O acervo de {orgName} está sendo preparado.
        </h1>
      </div>
    </section>
  );
}

const Rail = memo(function Rail({
  title, subtitle, items, progress, myListIds, onToggleList, categoryName, categoryNames,
}: {
  title: string; subtitle?: string;
  items: Course[];
  progress: Record<string, { percent: number }>;
  myListIds: Set<string>;
  onToggleList: (id: string) => void;
  categoryName?: string;
  categoryNames?: Record<string, string>;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current; if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.9), behavior: "smooth" });
  };
  return (
    <section className="group/rail rail-section">
      <div className="container-x flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-base md:text-lg tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-[11px] uppercase tracking-widest player-muted">{subtitle}</p>}
        </div>
        <div className="hidden md:flex items-center gap-2 opacity-0 group-hover/rail:opacity-100 transition">
          <button onClick={() => scrollBy(-1)} className="h-8 w-8 rounded-full border player-border hover:bg-white/10 transition text-sm" aria-label="Anterior">‹</button>
          <button onClick={() => scrollBy(1)} className="h-8 w-8 rounded-full border player-border hover:bg-white/10 transition text-sm" aria-label="Próximo">›</button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="rail-scroller mt-3 flex gap-3 overflow-x-auto snap-x snap-mandatory px-5 md:px-10 pb-8 pt-2"
      >
        {items.map((c) => (
          <RailCard
            key={c.id}
            c={c}
            categoryName={categoryName ?? (c.category_id ? categoryNames?.[c.category_id] : undefined)}
            percent={progress[c.id]?.percent ?? 0}
            inMyList={myListIds.has(c.id)}
            onToggleList={onToggleList}
          />
        ))}
      </div>
    </section>
  );
});

const RailCard = memo(function RailCard({
  c, percent, inMyList, onToggleList, categoryName,
}: { c: Course; percent: number; inMyList: boolean; onToggleList: (id: string) => void; categoryName?: string }) {
  return (
    <div className="rail-card snap-start shrink-0 w-[280px] md:w-[340px] rounded-lg overflow-hidden player-surface relative">
      <Link to="/curso/$courseSlug" params={{ courseSlug: c.slug }} className="block">
        <div className="aspect-video relative overflow-hidden">
          {c.cover_url ? (
            <img src={c.cover_url} alt={c.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <CoursePoster title={c.title} category={categoryName} className="absolute inset-0 h-full w-full" />
          )}
          {percent > 0 && (
            <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: "rgba(0,0,0,.55)" }}>
              <div className="h-full" style={{ width: `${percent}%`, background: "var(--tenant-accent)" }} />
            </div>
          )}
          {c.is_required && (
            <span
              className="absolute top-2 left-2 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded"
              style={{ background: "var(--tenant-accent)", color: "var(--tenant-accent-ink)" }}
            >Obrigatório</span>
          )}
          {c.trailer_url && (
            <span className="absolute top-2 right-2 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border player-border bg-black/40">
              Prévia
            </span>
          )}
        </div>
      </Link>
      <div className="rail-card-reveal absolute inset-x-0 bottom-0 p-3 pointer-events-none">
        <div className="rounded-md p-3 pointer-events-auto" style={{ background: "linear-gradient(180deg, rgba(11,15,28,.0) 0%, rgba(11,15,28,.92) 40%, rgba(11,15,28,1) 100%)" }}>
          <h3 className="font-display text-sm leading-snug line-clamp-2">{c.title}</h3>
          <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest player-muted">
            {levelLabel(c.level) && <span>{levelLabel(c.level)}</span>}
            {fmtDuration(c.duration_minutes) && <span>· {fmtDuration(c.duration_minutes)}</span>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Link
              to="/curso/$courseSlug/aprender" params={{ courseSlug: c.slug }}
              className="player-cta text-[12px] px-3 py-1.5 inline-flex items-center gap-1"
            >▶ {percent > 0 ? "Continuar" : "Assistir"}</Link>
            <button
              onClick={(e) => { e.preventDefault(); onToggleList(c.id); }}
              className="h-8 w-8 inline-flex items-center justify-center rounded-full border player-border hover:bg-white/10 transition text-sm"
              aria-label={inMyList ? "Remover da minha lista" : "Adicionar à minha lista"}
              title={inMyList ? "Remover da minha lista" : "Adicionar à minha lista"}
            >{inMyList ? "✓" : "+"}</button>
          </div>
        </div>
      </div>
    </div>
  );
});
