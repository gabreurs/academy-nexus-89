import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { CourseCard } from "@/components/academy/CourseCard";
import { CardSkeletonGrid, Chip, EmptyState, Eyebrow } from "@/components/academy/ui";
import { useAcademyCatalog } from "@/lib/academy/useCatalog";
import { useMyList } from "@/lib/list/useMyList";
import { levelLabel } from "@/components/academy/types";

type CatalogSearch = { q?: string; cat?: string };

export const Route = createFileRoute("/catalogo")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    cat: typeof search.cat === "string" && search.cat ? search.cat : undefined,
  }),
  component: Catalog,
});

const SORTS = [
  { id: "relevance", label: "Relevância" },
  { id: "recent", label: "Mais recentes" },
  { id: "duration", label: "Menor duração" },
] as const;

function Catalog() {
  const { tenant, loading: tenantLoading } = useTenant();
  const { session } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo" });
  const { loading, courses, categories, categoryNameById, progress, ratings } = useAcademyCatalog(
    tenant?.organization.id,
    session?.user?.id,
  );
  const { ids: myListIds, toggle: toggleMyList } = useMyList(session?.user?.id, tenant?.organization.id);

  const [query, setQuery] = useState(search.q ?? "");
  const [level, setLevel] = useState<string | null>(null);
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("relevance");
  const catFilter = search.cat ?? null;

  useEffect(() => setQuery(search.q ?? ""), [search.q]);

  const usedCategories = useMemo(
    () => categories.filter((cat) => courses.some((c) => c.category_id === cat.id)),
    [categories, courses],
  );
  const usedLevels = useMemo(
    () => {
      const seen = new Map<string, string>();
      for (const c of courses) {
        const raw = c.level?.trim();
        if (!raw) continue;
        const label = levelLabel(raw) ?? raw;
        if (!seen.has(label)) seen.set(label, raw);
      }
      return Array.from(seen, ([label, raw]) => ({ label, raw }));
    },
    [courses],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = courses.filter((c) => {
      if (catFilter && c.category_id !== catFilter) return false;
      if (level && (levelLabel(c.level) ?? c.level) !== level) return false;
      if (!q) return true;
      return `${c.title} ${c.subtitle ?? ""} ${c.instructor_name ?? ""}`.toLowerCase().includes(q);
    });
    if (sort === "recent") {
      return [...list].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    }
    if (sort === "duration") {
      return [...list].sort((a, b) => (a.duration_minutes ?? 9999) - (b.duration_minutes ?? 9999));
    }
    return list;
  }, [courses, catFilter, level, query, sort]);

  const setCat = (id: string | null) =>
    navigate({ search: (prev) => ({ ...prev, cat: id ?? undefined }), replace: true });

  const hasFilters = !!catFilter || !!level || !!query.trim();

  if (tenantLoading) return <div className="academy min-h-screen" />;

  return (
    <AcademyShell>
      <div className="ax-container pb-20 pt-8 md:pt-10">
        <Eyebrow>Catálogo</Eyebrow>
        <h1 className="ax-h1 mt-2.5">Explore todo o acervo</h1>
        <p className="ax-body mt-2 text-[15px]">
          {courses.length} {courses.length === 1 ? "título disponível" : "títulos disponíveis"} para{" "}
          {tenant?.organization.name ?? "sua organização"}.
        </p>

        {/* Filtros */}
        <div className="mt-7 space-y-4">
          <div className="ax-search max-w-md" style={{ height: 44 }}>
            <Search size={16} className="shrink-0" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, tema ou instrutor"
              aria-label="Buscar cursos"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca" className="shrink-0">
                <X size={15} />
              </button>
            )}
          </div>

          {usedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Chip selected={!catFilter} onClick={() => setCat(null)}>
                Todas as categorias
              </Chip>
              {usedCategories.map((cat) => (
                <Chip key={cat.id} selected={catFilter === cat.id} onClick={() => setCat(cat.id)}>
                  {cat.name}
                </Chip>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {usedLevels.map((l) => (
              <Chip key={l.label} selected={level === l.label} onClick={() => setLevel(level === l.label ? null : l.label)}>
                {l.label}
              </Chip>
            ))}
            <div className="ml-auto flex items-center gap-2">
              {SORTS.map((s) => (
                <Chip key={s.id} selected={sort === s.id} onClick={() => setSort(s.id)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="ax-divider my-7" />

        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="ax-meta">
            {loading ? "Carregando…" : `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`}
          </p>
          {hasFilters && (
            <button
              className="ax-btn"
              data-variant="ghost"
              data-size="sm"
              onClick={() => {
                setQuery("");
                setLevel(null);
                setCat(null);
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {loading ? (
          <CardSkeletonGrid count={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhum título encontrado"
            description="Ajuste a busca, o nível ou escolha outra categoria."
            action={
              <button
                className="ax-btn"
                data-variant="secondary"
                data-size="sm"
                onClick={() => {
                  setQuery("");
                  setLevel(null);
                  setCat(null);
                }}
              >
                Limpar filtros
              </button>
            }
          />
        ) : (
          <div className="ax-grid">
            {filtered.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                variant="grid"
                categoryName={c.category_id ? categoryNameById[c.category_id] : undefined}
                percent={progress[c.id]?.percent ?? 0}
                rating={ratings?.[c.id]}
                inMyList={myListIds.has(c.id)}
                onToggleList={session ? toggleMyList : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </AcademyShell>
  );
}
