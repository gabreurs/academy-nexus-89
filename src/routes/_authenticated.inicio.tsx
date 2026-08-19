import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { CourseRail } from "@/components/academy/CourseRail";
import { CourseCoverPlaceholder } from "@/components/academy/CourseCoverPlaceholder";
import { Eyebrow, Progress, Skeleton } from "@/components/academy/ui";
import { durationLabel, levelLabel } from "@/components/academy/types";
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
      {/* PAINEL DE RETOMADA — utilitário, não marketing */}
      <section className="ax-container pt-7 md:pt-9">
        <Eyebrow>Meus estudos</Eyebrow>
        <h1 className="ax-h1 mt-2 capitalize">Olá, {firstName || "aluno"}</h1>
        <p className="ax-body mt-1.5 text-[15px]">
          {resume
            ? "Retome de onde parou."
            : "Escolha um título do acervo para começar."}
        </p>

        <div className="mt-5">
          {loading && !spotlight ? (
            <Skeleton className="h-[190px] w-full" />
          ) : spotlight ? (
            <div className="ax-panel grid gap-0 overflow-hidden md:grid-cols-[320px_minmax(0,1fr)]">
              <div className="relative aspect-video md:aspect-auto">
                {spotlight.cover_url ? (
                  <img
                    src={spotlight.cover_url}
                    alt=""
                    aria-hidden
                    className="h-full w-full object-cover"
                    fetchPriority="high"
                  />
                ) : (
                  <CourseCoverPlaceholder title={spotlight.title} showTitle={false} className="h-full w-full" />
                )}
              </div>
              <div className="flex flex-col justify-center gap-3 p-5 md:p-7">
                <p className="ax-eyebrow">
                  {resume ? "Continue estudando" : "Sugestão para começar"}
                </p>
                <h2 className="ax-h2">{spotlight.title}</h2>
                <div className="ax-meta flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {[
                    spotlight.category_id ? categoryNameById[spotlight.category_id] : null,
                    levelLabel(spotlight.level),
                    durationLabel(spotlight.duration_minutes),
                  ]
                    .filter(Boolean)
                    .map((m, i) => (
                      <span key={i}>{m}</span>
                    ))}
                </div>
                {percent > 0 && (
                  <div className="max-w-sm">
                    <Progress percent={percent} />
                    <p className="ax-meta mt-1.5">{percent}% concluído</p>
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-2">
                  <Link
                    to="/curso/$courseSlug/aprender"
                    params={{ courseSlug: spotlight.slug }}
                    className="ax-btn"
                    data-variant="primary"
                  >
                    <PlayCircle size={16} /> {percent > 0 ? "Continuar" : "Começar agora"}
                  </Link>
                  <Link
                    to="/curso/$courseSlug"
                    params={{ courseSlug: spotlight.slug }}
                    className="ax-btn"
                    data-variant="secondary"
                  >
                    Detalhes do curso
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="ax-empty">
              <p className="ax-h3">Nenhum título liberado ainda.</p>
              <p className="ax-body text-center text-[14px]">
                Assim que a curadoria publicar cursos, eles aparecem aqui.
              </p>
              <Link to="/catalogo" className="ax-btn" data-variant="secondary" data-size="sm">
                Explorar catálogo <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

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
