import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAcademyExperience } from "@/lib/tenant/TenantProvider";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { Eyebrow } from "@/components/academy/ui";
import { CourseReviews } from "@/components/course/CourseReviews";
import { CourseCoverPlaceholder } from "@/components/academy/CourseCoverPlaceholder";
import { durationLabel, levelLabel } from "@/components/academy/types";
import { LessonMedia } from "@/components/player/LessonMedia";
import { resolveCourseAccess } from "@/lib/course/courseAccess";

export const Route = createFileRoute("/curso/$courseSlug")({ ssr: false, component: CoursePage });

function CoursePage() {
  const { courseSlug } = useParams({ from: "/curso/$courseSlug" });
  const { session, isPlatformAdmin } = useAuth();
  const exp = useAcademyExperience();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [inCatalog, setInCatalog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setShowPreview(false);
      // Projeção explícita: apenas metadados públicos. Nada de `select("*")`,
      // que voltaria a arrastar campos de entrega para o visitante.
      const { data: c } = await supabase
        .from("courses")
        .select(
          "id, slug, title, subtitle, description, cover_url, banner_url, instructor_name, instructor_bio, category_id, level, duration_minutes, status, visibility, owner_org_id, is_featured, is_required, external_checkout_url, delivery_type",
        )
        .eq("slug", courseSlug)
        .maybeSingle();
      if (!c) { setLoading(false); return; }
      setCourse(c);

      // Cursos entregues por embed externo NÃO listam módulos/aulas aqui:
      // a trilha real vive dentro do LearningStudio e a "aula" local é apenas
      // o ponteiro técnico para o embed — exibi-la seria uma sidebar falsa.
      if (c.delivery_type !== "learning_studio_embed") {
        const { data: mods } = await supabase.from("course_modules").select("*, course_lessons(*)").eq("course_id", c.id).order("sort_order");
        setModules((mods as any[]) ?? []);
      } else {
        setModules([]);
      }

      const access = await resolveCourseAccess({
        course: c as any,
        userId: session?.user?.id,
        isPlatformAdmin,
      });
      setHasAccess(access.hasGrant && access.allowed);
      setInCatalog(access.inCatalog);
      setLoading(false);
    })();
  }, [courseSlug, session?.user?.id, isPlatformAdmin]);

  const enroll = async () => {
    if (!session?.user || !course) return;
    setEnrollError(null);
    if (!inCatalog && !isPlatformAdmin) {
      setEnrollError("Este curso não está disponível no catálogo da sua organização.");
      return;
    }
    const { error } = await supabase.from("enrollments").insert({ user_id: session.user.id, course_id: course.id });
    if (error) { setEnrollError(error.message); return; }
    setHasAccess(true);
  };

  if (loading)
    return (
      <AcademyShell>
        <div className="ax-container py-16">
          <div className="ax-skeleton aspect-video max-w-3xl" />
        </div>
      </AcademyShell>
    );
  if (!course)
    return (
      <AcademyShell>
        <p className="ax-container py-20 text-lg">Curso não encontrado.</p>
      </AcademyShell>
    );

  const isEmbedCourse = course.delivery_type === "learning_studio_embed";
  const meta = [
    levelLabel(course.level),
    durationLabel(course.duration_minutes),
    course.instructor_name,
  ].filter(Boolean);
  const primaryCta = !session ? (
    <Link to="/login" search={{ next: `/curso/${courseSlug}` }} className="ax-btn" data-variant="primary" data-size="lg">
      {exp.type === "corporate" ? "Entrar na Academy" : "Entrar para começar"}
    </Link>
  ) : hasAccess ? (
    <Link
      to="/curso/$courseSlug/aprender"
      params={{ courseSlug }}
      className="ax-btn"
      data-variant="primary"
      data-size="lg"
    >
      Continuar curso
    </Link>
  ) : course.external_checkout_url ? (
    <a
      href={course.external_checkout_url}
      target="_blank"
      rel="noopener"
      className="ax-btn"
      data-variant="primary"
      data-size="lg"
    >
      Comprar acesso
    </a>
  ) : !inCatalog && !isPlatformAdmin ? null : (
    <button onClick={enroll} className="ax-btn" data-variant="primary" data-size="lg">
      Iniciar curso
    </button>
  );

  return (
    <AcademyShell>
      {/* HERO COMPACTO DO CURSO — capa real ao fundo, sem player embutido */}
      {/* A capa é imagem cheia: esta faixa lê como superfície escura em
          qualquer tema, para o texto continuar legível sobre a arte. */}
      <section
        className="ax-hero ax-dark-band"
        style={{ marginTop: "calc(-1 * var(--ax-header-h))", paddingTop: "calc(var(--ax-header-h) + 32px)" }}
      >
        <div className="ax-hero-media">
          {course.cover_url ? (
            <img src={course.cover_url} alt="" aria-hidden fetchPriority="high" />
          ) : (
            <CourseCoverPlaceholder title={course.title} showTitle={false} className="h-full w-full" />
          )}
        </div>
        <div className="ax-hero-scrim" aria-hidden />
        <div className="ax-container w-full">
          <div className="ax-hero-copy">
            <Eyebrow>{isEmbedCourse ? "Curso interativo" : "Curso"}</Eyebrow>
            <h1 className="ax-h1 mt-3">{course.title}</h1>
            {course.subtitle && <p className="ax-body mt-3 text-[16px]">{course.subtitle}</p>}
            {meta.length > 0 && (
              <div className="ax-meta mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {meta.map((m, i) => (
                  <span key={i}>{m}</span>
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {primaryCta}
              <Link to="/catalogo" className="ax-btn" data-variant="outline" data-size="lg">
                Voltar ao catálogo
              </Link>
            </div>
            {!hasAccess && session && !inCatalog && !isPlatformAdmin && !course.external_checkout_url && (
              <p className="ax-meta mt-3">{exp.copy.gated}</p>
            )}
            {enrollError && (
              <p className="mt-2 text-[13px]" style={{ color: "var(--ax-error)" }}>
                {enrollError}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="ax-container grid gap-10 pb-20 pt-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isEmbedCourse ? (
            // Nenhum iframe nesta tela: nem oculto, nem fora da viewport, nem
            // atrás de overlay. O LearningStudio só carrega no ambiente de
            // estudo, após o gate de acesso.
            null
          ) : (
            (() => {
              const preview = modules
                .flatMap((m: any) => m.course_lessons ?? [])
                .find((l: any) => l.is_preview && l.video_url);
              // Nunca usamos o conteúdo completo como "degustação": só entra
              // aqui a aula explicitamente marcada como prévia.
              if (!preview) return null;
              if (!showPreview) {
                return (
                  <button
                    onClick={() => setShowPreview(true)}
                    className="ax-panel-raised flex aspect-video w-full flex-col items-center justify-center gap-2 overflow-hidden transition hover:opacity-90"
                  >
                    <span className="text-4xl">▶</span>
                    <span className="ax-meta">
                      {hasAccess ? "Assistir prévia da aula" : "Assistir prévia gratuita (2 min)"}
                    </span>
                  </button>
                );
              }
              return (
                <div className="ax-panel-raised h-[70vh] min-h-[440px] w-full overflow-hidden">
                  <LessonMedia
                    videoUrl={preview.video_url}
                    requireStart
                    title={preview.title}
                    previewLimitSeconds={hasAccess ? undefined : 120}
                  />
                </div>
              );
            })()
          )}

          {course.description && (
            <>
              <h2 className="ax-h2">Sobre o curso</h2>
              <p className="ax-body mt-3">{course.description}</p>
            </>
          )}

          {isEmbedCourse ? (
            <div className="ax-panel mt-8 p-6">
              <h3 className="ax-h3">Como este curso funciona</h3>
              <p className="ax-body mt-2 text-[14px]">
                Curso interativo: as aulas, atividades e verificações acontecem dentro do
                ambiente de estudo, em tela cheia se você quiser. Materiais complementares,
                discussão e avaliação ficam no painel lateral do ambiente.
              </p>
            </div>
          ) : (
            <>
              <h3 className="ax-h3 mt-9">Conteúdo do curso</h3>
              <div className="mt-4 space-y-4">
                {modules.map((m) => (
                  <div key={m.id} className="ax-panel overflow-hidden">
                    <div className="p-4 font-medium">{m.title}</div>
                    <ul style={{ borderTop: "1px solid var(--ax-border-subtle)" }}>
                      {(m.course_lessons ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((l: any) => (
                        <li
                          key={l.id}
                          className="flex items-center justify-between px-4 py-3 text-sm"
                          style={{ borderTop: "1px solid var(--ax-border-subtle)" }}
                        >
                          <span>{l.title}</span>
                          <span className="ax-meta">{Math.round((l.duration_seconds ?? 0) / 60)}min {l.is_preview && "· prévia"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}

          <CourseReviews courseId={course.id} canReview={hasAccess} />
        </div>

        <aside className="ax-panel sticky top-[calc(var(--ax-header-h)+16px)] h-fit p-6">
          <p className="ax-eyebrow">{levelLabel(course.level) ?? "Curso"}</p>
          {course.instructor_name && <p className="mt-2 font-medium">{course.instructor_name}</p>}
          {course.duration_minutes ? (
            <p className="ax-meta mt-1">{durationLabel(course.duration_minutes)} de conteúdo</p>
          ) : null}
          <div className="mt-6">{primaryCta}</div>
          {!hasAccess && session && !inCatalog && !isPlatformAdmin && !course.external_checkout_url && (
            <p className="ax-meta mt-3">Curso indisponível no catálogo da sua organização.</p>
          )}
        </aside>
      </div>
    </AcademyShell>
  );
}
