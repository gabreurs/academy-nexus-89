import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { CourseRail } from "@/components/academy/CourseRail";
import { Eyebrow, Skeleton } from "@/components/academy/ui";
import { ContinueHero } from "@/components/academy/ContinueHero";
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
  const resume = continueList[0] ?? null;
  const suggestion = featured[0] ?? newest[0] ?? courses[0] ?? null;
  const spotlight = resume ?? suggestion;
  const percent = spotlight ? progress[spotlight.id]?.percent ?? 0 : 0;
  const firstName = (session?.user?.email ?? "").split("@")[0];

  return (
    <AcademyShell footer={false}>
      {loading && !spotlight ? (
        <div className="ax-container py-14">
          <Skeleton className="h-[320px] w-full" />
        </div>
      ) : spotlight ? (
        <ContinueHero
          course={spotlight}
          percent={percent}
          resuming={!!resume}
          categoryName={spotlight.category_id ? categoryNameById[spotlight.category_id] : undefined}
        />
      ) : (
        <section className="ax-container pt-10">
          <Eyebrow>Meus estudos</Eyebrow>
          <h1 className="ax-h1 mt-2 capitalize">Olá, {firstName || "aluno"}</h1>
          <div className="ax-empty mt-6">
            <p className="ax-h3">Nenhum título liberado ainda.</p>
            <p className="ax-body text-center text-[14px]">
              Assim que a curadoria publicar cursos, eles aparecem aqui.
            </p>
            <Link to="/catalogo" className="ax-btn" data-variant="secondary" data-size="sm">
              Explorar catálogo <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      <div className="space-y-8 pb-20 pt-9 md:space-y-10">
        <CourseRail
          title="Continue estudando"
          items={continueList}
          progress={progress}
          ratings={ratings}
          myListIds={myListIds}
          onToggleList={toggleMyList}
          categoryNames={categoryNameById}
        />
        <CourseRail
          title="Minha lista"
          items={myList}
          progress={progress}
          ratings={ratings}
          myListIds={myListIds}
          onToggleList={toggleMyList}
          categoryNames={categoryNameById}
        />
        <CourseRail
          title="Meus cursos comprados"
          items={purchased}
          progress={progress}
          ratings={ratings}
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
            ratings={ratings}
            myListIds={myListIds}
            onToggleList={toggleMyList}
          />
        ))}
      </div>
    </AcademyShell>
  );
}
