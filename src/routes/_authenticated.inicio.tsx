import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { AcademyHeader } from "@/components/academy/AcademyHeader";
import { CourseHero } from "@/components/academy/CourseHero";
import { CourseRail } from "@/components/academy/CourseRail";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";
import { useAcademyCatalog } from "@/lib/academy/useCatalog";
import { useMyList } from "@/lib/list/useMyList";

export const Route = createFileRoute("/_authenticated/inicio")({ ssr: false, component: Home });

function Home() {
  const { session } = useAuth();
  const { tenant } = useTenant();
  const {
    loading, courses, purchased, allCourses, categoryNameById, categoryRails,
    continueList, featured, newest, progress, ratings,
  } = useAcademyCatalog(tenant?.organization.id, session?.user?.id);
  const { ids: myListIds, toggle: toggleMyList } = useMyList(session?.user?.id, tenant?.organization.id);

  const myList = useMemo(() => allCourses.filter((c) => myListIds.has(c.id)), [allCourses, myListIds]);
  const hero = continueList[0] ?? featured[0] ?? newest[0] ?? courses[0] ?? null;
  const heroPercent = hero ? progress[hero.id]?.percent ?? 0 : 0;

  return (
    <div className="academy relative">
      <div className="absolute inset-x-0 top-0 z-30">
        <AcademyHeader transparent />
      </div>

      {hero ? (
        <CourseHero
          course={hero}
          categoryName={continueList[0] ? "Continue estudando" : hero.category_id ? categoryNameById[hero.category_id] : null}
          percent={heroPercent}
          rating={ratings[hero.id]}
          inMyList={myListIds.has(hero.id)}
          onToggleList={toggleMyList}
        />
      ) : (
        <EmptyHero loading={loading} />
      )}

      <main className="relative z-10 space-y-10 pb-24 pt-8 md:space-y-14 md:pt-10">
        <CourseRail
          title="Continue estudando"
          items={continueList}
          progress={progress}
          myListIds={myListIds}
          onToggleList={toggleMyList}
          categoryNames={categoryNameById}
        />
        {categoryRails.map(({ cat, list }) => (
          <CourseRail
            key={cat.id}
            title={cat.name}
            items={list}
            categoryName={cat.name}
            progress={progress}
            myListIds={myListIds}
            onToggleList={toggleMyList}
          />
        ))}
        <CourseRail
          title="Meus cursos comprados"
          items={purchased}
          progress={progress}
          myListIds={myListIds}
          onToggleList={toggleMyList}
          categoryNames={categoryNameById}
        />
        <CourseRail
          title="Minha lista"
          items={myList}
          progress={progress}
          myListIds={myListIds}
          onToggleList={toggleMyList}
          categoryNames={categoryNameById}
        />

        {!loading && courses.length === 0 && purchased.length === 0 && (
          <div className="academy-container">
            <div className="academy-surface academy-border rounded-2xl border p-10 text-center">
              <p className="text-lg font-semibold">Nenhum título liberado ainda.</p>
              <p className="academy-muted mt-2 text-sm">
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

function EmptyHero({ loading }: { loading: boolean }) {
  return (
    <section className="academy-hero h-[380px] md:h-[440px]">
      <div className="academy-hero-media academy-skeleton" aria-hidden />
      <div className="academy-hero-scrim" aria-hidden />
      <div className="relative flex h-full items-end pb-14">
        <div className="academy-container">
          <p className="academy-hero-title max-w-[640px]">
            {loading ? "Carregando seu acervo…" : "Seu acervo está sendo preparado."}
          </p>
        </div>
      </div>
    </section>
  );
}
