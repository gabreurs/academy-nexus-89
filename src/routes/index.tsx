import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useAcademyExperience, useTenant } from "@/lib/tenant/TenantProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { AcademyLanding } from "@/components/academy/AcademyLanding";
import { CourseCard } from "@/components/academy/CourseCard";
import { CourseCoverPlaceholder } from "@/components/academy/CourseCoverPlaceholder";
import { CardSkeletonGrid, Eyebrow, SectionHeader } from "@/components/academy/ui";
import { useAcademyCatalog } from "@/lib/academy/useCatalog";

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
  component: Storefront,
});

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
        <AcademyLanding courseCount={courses.length} />
      ) : (
      <section className="ax-hero" data-tone="editorial">
        <div className="ax-container grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_460px]">
          <div className="ax-hero-copy">
            <Eyebrow>{exp.copy.eyebrow}</Eyebrow>
            <h1 className="ax-display mt-3">{exp.copy.title}</h1>
            <p className="ax-body mt-4 text-[16px]">{exp.copy.lead}</p>
            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Link
                to={session ? "/inicio" : "/login"}
                search={session ? undefined : ({ next: "/inicio" } as any)}
                className="ax-btn"
                data-variant="primary"
                data-size="lg"
              >
                {session ? "Continuar estudando" : "Acessar a plataforma"}
                <ArrowRight size={16} />
              </Link>
              <Link to="/catalogo" className="ax-btn" data-variant="outline" data-size="lg">
                Ver catálogo
              </Link>
            </div>
            {!tenantLoading && (
              <p className="ax-meta mt-5">
                Acervo de {orgName}
                {courses.length ? ` · ${courses.length} títulos publicados` : ""}
              </p>
            )}
          </div>

          <div className="hidden lg:block">
            {spotlight ? (
              <Link
                to="/curso/$courseSlug"
                params={{ courseSlug: spotlight.slug }}
                className="ax-hero-art ax-dark-band block"
                aria-label={spotlight.title}
              >
                {spotlight.cover_url ? (
                  <img src={spotlight.cover_url} alt="" aria-hidden fetchPriority="high" />
                ) : (
                  <CourseCoverPlaceholder title={spotlight.title} showTitle={false} className="h-full w-full" />
                )}
                <div
                  className="absolute inset-x-0 bottom-0 p-4"
                  style={{ background: "linear-gradient(0deg, rgba(0,0,0,.85), transparent)" }}
                >
                  <p className="ax-eyebrow">Em destaque</p>
                  <p className="ax-h3 mt-1 line-clamp-2">{spotlight.title}</p>
                  <span className="ax-meta mt-1 inline-flex items-center gap-1.5">
                    <PlayCircle size={13} /> Ver detalhes do curso
                  </span>
                </div>
              </Link>
            ) : (
              <div className="ax-hero-art" />
            )}
          </div>
        </div>
      </section>
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
