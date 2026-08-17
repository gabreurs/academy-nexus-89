import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { AcademyHeader } from "@/components/academy/AcademyHeader";
import { CourseCard } from "@/components/academy/CourseCard";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";
import { useAcademyCatalog } from "@/lib/academy/useCatalog";
import { useMyList } from "@/lib/list/useMyList";

export const Route = createFileRoute("/catalogo")({ ssr: false, component: Catalog });

function Catalog() {
  const { tenant, loading: tenantLoading } = useTenant();
  const { session } = useAuth();
  const { loading, courses, categories, categoryNameById, progress } = useAcademyCatalog(
    tenant?.organization.id,
    session?.user?.id,
  );
  const { ids: myListIds, toggle: toggleMyList } = useMyList(session?.user?.id, tenant?.organization.id);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const usedCategories = useMemo(
    () => categories.filter((cat) => courses.some((c) => c.category_id === cat.id)),
    [categories, courses],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (catFilter && c.category_id !== catFilter) return false;
      if (!q) return true;
      return `${c.title} ${c.subtitle ?? ""} ${c.instructor_name ?? ""}`.toLowerCase().includes(q);
    });
  }, [courses, catFilter, query]);

  if (tenantLoading) return <div className="academy" />;

  return (
    <div className="academy">
      <AcademyHeader />

      <main className="academy-container pb-24 pt-10 md:pt-14">
        <p className="text-[12px] uppercase tracking-[0.2em]" style={{ color: "#A3A3A3" }}>
          Catálogo
        </p>
        <h1 className="mt-3 text-[30px] font-semibold leading-tight md:text-[42px]" style={{ letterSpacing: "-0.03em" }}>
          Todo o acervo disponível para você
        </h1>
        <p className="academy-muted mt-3 max-w-2xl text-[15px]">
          {courses.length} {courses.length === 1 ? "título liberado" : "títulos liberados"} no plano da sua organização.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, tema ou instrutor"
            aria-label="Buscar cursos"
            className="w-full max-w-md px-4 py-3 text-[15px]"
          />
          {usedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCatFilter(null)}
                className="academy-chip"
                data-tone={catFilter === null ? "solid" : undefined}
              >
                Todos
              </button>
              {usedCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCatFilter(cat.id)}
                  className="academy-chip"
                  data-tone={catFilter === cat.id ? "solid" : undefined}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="academy-skeleton aspect-video rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="academy-surface academy-border mt-12 rounded-2xl border p-10 text-center">
            <p className="text-lg font-semibold">Nenhum título encontrado.</p>
            <p className="academy-muted mt-2 text-sm">Ajuste a busca ou escolha outra categoria.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                variant="grid"
                categoryName={c.category_id ? categoryNameById[c.category_id] : undefined}
                percent={progress[c.id]?.percent ?? 0}
                inMyList={myListIds.has(c.id)}
                onToggleList={session ? toggleMyList : undefined}
              />
            ))}
          </div>
        )}
      </main>

      <TenantDemoSwitcher />
    </div>
  );
}

function Catalog() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    (async () => {
      setLoading(true);
      const { data: cat } = await supabase
        .from("organization_course_catalog")
        .select("course_id")
        .eq("organization_id", tenant.organization.id)
        .eq("is_visible", true);
      const ids = (cat ?? []).map((c: any) => c.course_id);
      if (!ids.length) { setCourses([]); setLoading(false); return; }
      const { data } = await supabase.from("courses").select("*").in("id", ids).eq("status", "published");
      setCourses((data as Course[]) ?? []);
      setLoading(false);
    })();
  }, [tenant?.organization.id]);

  if (tenantLoading) return null;

  return (
    <>
      <Suspense fallback={null}><SmoothScroll /></Suspense>
      <div className="min-h-screen" style={{ background: "var(--brand-bg)", color: "var(--brand-text)" }}>
        <SiteHeader />
        <main className="container-x py-14 md:py-20">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.22em] brand-text-muted">Catálogo</p>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mt-4 font-editorial text-4xl md:text-6xl text-balance max-w-3xl">
              Conteúdo curado para{" "}
              <span className="text-gradient-lab">{tenant?.organization.name}</span>.
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 max-w-2xl brand-text-muted">
              Cursos publicados no plano da sua organização. Novos títulos entram
              conforme a curadoria da administradora.
            </p>
          </Reveal>

          {loading ? (
            <p className="mt-16 brand-text-muted">Carregando catálogo…</p>
          ) : courses.length === 0 ? (
            <div
              className="mt-16 rounded-3xl border p-10 text-center"
              style={{ borderColor: "var(--brand-border)", background: "var(--brand-surface)" }}
            >
              <p className="font-display text-xl">Ainda sem títulos por aqui.</p>
              <p className="mt-2 text-sm brand-text-muted">
                A curadoria desta organização está em preparação.
              </p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((c, i) => (
                <Reveal key={c.id} delay={i * 60}>
                  <CursorGlow className="h-full rounded-3xl overflow-hidden">
                    <Link
                      to="/curso/$courseSlug"
                      params={{ courseSlug: c.slug }}
                      className="block h-full border rounded-3xl overflow-hidden transition hover:-translate-y-0.5"
                      style={{ background: "var(--brand-surface)", borderColor: "var(--brand-border)" }}
                    >
                      <div className="aspect-video relative overflow-hidden" style={{ background: "var(--brand-surface-2)" }}>
                        {c.cover_url ? (
                          <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover" />
                        ) : (
                          <CoursePoster title={c.title} tone="brand" showTitle={false} className="absolute inset-0 h-full w-full" />
                        )}
                        {c.visibility === "exclusive" && (
                          <span
                            className="absolute top-3 right-3 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                            style={{ background: "var(--tenant-accent)", color: "var(--tenant-accent-ink)" }}
                          >
                            Exclusivo
                          </span>
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="font-display text-lg leading-snug">{c.title}</h3>
                        {c.subtitle && (
                          <p className="mt-2 text-sm brand-text-muted line-clamp-2">{c.subtitle}</p>
                        )}
                        <div className="mt-5 flex items-center gap-3 text-[11px] uppercase tracking-widest brand-text-muted">
                          {c.instructor_name && <span>{c.instructor_name}</span>}
                          {c.duration_minutes ? <span>· {Math.round(c.duration_minutes / 60)}h</span> : null}
                        </div>
                      </div>
                    </Link>
                  </CursorGlow>
                </Reveal>
              ))}
            </div>
          )}
        </main>
        <TenantDemoSwitcher />
      </div>
    </>
  );
}