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

