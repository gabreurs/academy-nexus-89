import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { useAcademyExperience, useTenant } from "@/lib/tenant/TenantProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenantIdentity } from "@/lib/tenant/useTenantIdentity";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { AcademyLanding } from "@/components/academy/AcademyLanding";
import { ContinueHero } from "@/components/academy/ContinueHero";
import { CourseRail } from "@/components/academy/CourseRail";
import { CourseCard } from "@/components/academy/CourseCard";
import { CardSkeletonGrid, Eyebrow, SectionHeader, Skeleton } from "@/components/academy/ui";
import { useAcademyCatalog } from "@/lib/academy/useCatalog";
import { useMyList } from "@/lib/list/useMyList";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Academy — conhecimento para quem faz o condomínio funcionar" },
      {
        name: "description",
        content:
          "Trilhas, cursos e materiais para síndicos, porteiros, zeladores e equipes de administradora. Acesse o acervo da sua organização.",
      },
      { property: "og:title", content: "Academy — conhecimento condominial" },
      {
        property: "og:description",
        content: "Cursos práticos de gestão condominial, portaria, manutenção predial e jurídico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeRoute,
});

/**
 * `/` tem dois comportamentos:
 *  - visitante  → landing institucional (corporate) ou storefront (marketplace)
 *  - autenticado com acesso ao tenant → home de retomada + descoberta
 * `/inicio` continua sendo o dashboard "meus estudos".
 */
function HomeRoute() {
  const { loading, visibleSession } = useTenantIdentity();
  const exp = useAcademyExperience();
  const navigate = useNavigate();
  const isCorporate = exp.type === "corporate";
  // Academy corporativa: quem já entrou não vê a porta institucional de novo.
  // A decisão vem do MODELO da Academy, nunca do nome do tenant.
  const shouldRedirect = !loading && !!visibleSession && isCorporate;

  useEffect(() => {
    if (shouldRedirect) navigate({ to: "/inicio", replace: true });
  }, [shouldRedirect, navigate]);

  if (loading || shouldRedirect) {
    return (
      <AcademyShell footer={false}>
        <div className="ax-container py-16">
          <Skeleton className="h-[380px] w-full" />
        </div>
      </AcademyShell>
    );
  }
  return visibleSession ? <AuthenticatedHome /> : <Storefront />;
}

function AuthenticatedHome() {
  const { session } = useAuth();
  const { tenant } = useTenant();
  const {
    loading, courses, allCourses, categories, categoryNameById, categoryRails,
    continueList, featured, newest, progress, ratings,
  } = useAcademyCatalog(tenant?.organization.id, session?.user?.id);
  const { ids: myListIds, toggle: toggleMyList } = useMyList(session?.user?.id, tenant?.organization.id);

  const myList = useMemo(() => allCourses.filter((c) => myListIds.has(c.id)), [allCourses, myListIds]);

  // Seleção do hero: em andamento > destaque > novidade > primeiro do acervo.
  const resume = continueList[0] ?? null;
  const fallback = featured[0] ?? newest[0] ?? courses[0] ?? null;
  const hero = resume ?? fallback;
  const heroPercent = hero ? progress[hero.id]?.percent ?? 0 : 0;

  const recommended = useMemo(
    () => featured.filter((c) => c.id !== hero?.id).slice(0, 12),
    [featured, hero],
  );
  const rest = useMemo(() => continueList.filter((c) => c.id !== hero?.id), [continueList, hero]);
  const usedCategories = useMemo(
    () => categories.filter((cat) => courses.some((c) => c.category_id === cat.id)),
    [categories, courses],
  );

  return (
    <AcademyShell>
      {loading && !hero ? (
        <div className="ax-container py-16">
          <Skeleton className="h-[380px] w-full" />
        </div>
      ) : hero ? (
        <ContinueHero
          course={hero}
          percent={heroPercent}
          resuming={!!resume}
          categoryName={hero.category_id ? categoryNameById[hero.category_id] : undefined}
        />
      ) : (
        <section className="ax-section">
          <div className="ax-container">
            <p className="ax-body">O acervo desta organização ainda está sendo publicado.</p>
          </div>
        </section>
      )}

      <div className="space-y-8 pb-20 pt-9 md:space-y-10">
        <CourseRail
          title="Continue estudando"
          items={rest}
          progress={progress}
          ratings={ratings}
          myListIds={myListIds}
          onToggleList={toggleMyList}
          categoryNames={categoryNameById}
        />
        <CourseRail
          title="Recomendados para você"
          items={recommended}
          progress={progress}
          ratings={ratings}
          myListIds={myListIds}
          onToggleList={toggleMyList}
          categoryNames={categoryNameById}
        />
        <CourseRail
          title="Novidades"
          items={newest.filter((c) => c.id !== hero?.id)}
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

        {usedCategories.length > 0 && (
          <section className="ax-container">
            <SectionHeader title="Explore por categoria" subtitle="Navegue por tema" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {usedCategories.map((cat) => {
                const count = courses.filter((c) => c.category_id === cat.id).length;
                return (
                  <Link key={cat.id} to="/catalogo" search={{ cat: cat.id }} className="ax-tile">
                    <p className="ax-card-title">{cat.name}</p>
                    <p className="ax-meta mt-1">
                      {count} {count === 1 ? "curso" : "cursos"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AcademyShell>
  );
}

function Storefront() {
  const { tenant, loading: tenantLoading } = useTenant();
  const exp = useAcademyExperience();
  const { session } = useAuth();
  const { loading, courses, categories, categoryNameById, ratings } = useAcademyCatalog(
    tenant?.organization.id,
    session?.user?.id,
  );

  const orgName = tenant?.organization.name ?? "Academy";
  const isCorporate = exp.type === "corporate";

  const spotlight = useMemo(
    () => courses.find((c) => c.is_featured) ?? courses[0] ?? null,
    [courses],
  );
  const highlights = useMemo(() => courses.slice(0, 8), [courses]);
  const usedCategories = useMemo(
    () => categories.filter((cat) => courses.some((c) => c.category_id === cat.id)),
    [categories, courses],
  );

  return (
    <AcademyShell>
      {/* A entrada muda com o MODELO da Academy:
          corporate → porta institucional (quem somos, como se entra)
          marketplace → storefront de descoberta (conteúdo primeiro) */}
      {isCorporate ? (
        <AcademyLanding courseCount={courses.length} courses={courses} />
      ) : (
      <>
        {/* Marketplace deslogado: apresentação curta + o MESMO hero editorial
            de conteúdo usado na área autenticada, promovendo um destaque. */}
        <section className="ax-container pt-10">
          <Eyebrow>{exp.copy.eyebrow}</Eyebrow>
          <h1 className="ax-h1 mt-2 max-w-[20ch]">{exp.copy.title}</h1>
          <p className="ax-body mt-3 max-w-[62ch] text-[15.5px]">{exp.copy.lead}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link
              to={session ? "/inicio" : "/login"}
              search={session ? undefined : ({ next: "/inicio" } as any)}
              className="ax-btn"
              data-variant="primary"
              data-size="md"
            >
              {session ? "Continuar estudando" : "Acessar a plataforma"}
              <ArrowRight size={16} />
            </Link>
            <Link to="/catalogo" className="ax-btn" data-variant="outline" data-size="md">
              Ver catálogo
            </Link>
          </div>
          {!tenantLoading && (
            <p className="ax-meta mt-4">
              Acervo de {orgName}
              {courses.length ? ` · ${courses.length} títulos publicados` : ""}
            </p>
          )}
        </section>

        {spotlight && (
          <ContinueHero
            course={spotlight}
            resuming={false}
            eyebrow="Em destaque"
            primaryLabel="Ver curso"
            primaryTo="details"
            categoryName={spotlight.category_id ? categoryNameById[spotlight.category_id] : undefined}
          />
        )}
      </>
      )}

      {/* DESTAQUES DO ACERVO */}
      <section className="ax-section">
        <div className="ax-container">
          <SectionHeader
            title="Em destaque no acervo"
            subtitle={`Títulos publicados por ${orgName}`}
            action={
              <Link to="/catalogo" className="ax-btn" data-variant="ghost" data-size="sm">
                Ver tudo <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="mt-5">
            {loading ? (
              <CardSkeletonGrid count={8} />
            ) : highlights.length ? (
              <div className="ax-grid">
                {highlights.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    categoryName={c.category_id ? categoryNameById[c.category_id] : undefined}
                    rating={ratings[c.id]}
                  />
                ))}
              </div>
            ) : (
              <p className="ax-body">O acervo desta organização ainda está sendo publicado.</p>
            )}
          </div>
        </div>
      </section>

      {/* CATEGORIAS REAIS */}
      {usedCategories.length > 0 && (
        <section className="ax-section pt-0">
          <div className="ax-container">
            <SectionHeader title="Áreas de conhecimento" subtitle="Navegue por tema" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {usedCategories.map((cat) => {
                const count = courses.filter((c) => c.category_id === cat.id).length;
                return (
                  <Link key={cat.id} to="/catalogo" search={{ cat: cat.id }} className="ax-tile">
                    <p className="ax-card-title">{cat.name}</p>
                    <p className="ax-meta mt-1">
                      {count} {count === 1 ? "curso" : "cursos"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </AcademyShell>
  );
}
