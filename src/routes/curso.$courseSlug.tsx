import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";
import { CourseReviews } from "@/components/course/CourseReviews";
import { CoursePoster } from "@/components/course/CoursePoster";
import { LessonMedia } from "@/components/player/LessonMedia";
import { resolveCourseAccess } from "@/lib/course/courseAccess";

export const Route = createFileRoute("/curso/$courseSlug")({ ssr: false, component: CoursePage });

function CoursePage() {
  const { courseSlug } = useParams({ from: "/curso/$courseSlug" });
  const { session, isPlatformAdmin } = useAuth();
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
      const { data: c } = await supabase.from("courses").select("*").eq("slug", courseSlug).maybeSingle();
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

  if (loading) return <div className="min-h-screen"><SiteHeader /><p className="p-8 brand-text-muted">Carregando…</p></div>;
  if (!course) return <div className="min-h-screen"><SiteHeader /><p className="p-8">Curso não encontrado.</p></div>;

  const isEmbedCourse = course.delivery_type === "learning_studio_embed";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isEmbedCourse ? (
            // Nenhum iframe nesta tela: nem oculto, nem fora da viewport, nem
            // atrás de overlay. O LearningStudio só carrega no ambiente de
            // estudo, após o gate de acesso.
            <div className="aspect-video rounded-xl overflow-hidden border brand-border relative">
              {course.cover_url ? (
                <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <CoursePoster title={course.title} tone="brand" showTitle={false} className="absolute inset-0 h-full w-full" />
              )}
            </div>
          ) : (
            (() => {
              const preview = modules
                .flatMap((m: any) => m.course_lessons ?? [])
                .find((l: any) => l.is_preview && l.video_url);
              if (!preview) {
                return (
                  <div className="aspect-video brand-surface rounded-xl overflow-hidden flex items-center justify-center opacity-60 text-5xl">▶</div>
                );
              }
              if (!showPreview) {
                return (
                  <button
                    onClick={() => setShowPreview(true)}
                    className="aspect-video w-full brand-surface rounded-xl overflow-hidden flex flex-col items-center justify-center gap-2 border brand-border hover:opacity-90 transition"
                  >
                    <span className="text-4xl">▶</span>
                    <span className="text-sm brand-text-muted">
                      {hasAccess ? "Assistir prévia da aula" : "Assistir prévia gratuita (2 min)"}
                    </span>
                  </button>
                );
              }
              return (
                <div className="w-full h-[70vh] min-h-[440px] brand-surface rounded-xl overflow-hidden border brand-border">
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

          <h1 className="mt-6 text-3xl font-semibold tracking-tight">{course.title}</h1>
          {course.subtitle && <p className="brand-text-muted mt-1">{course.subtitle}</p>}
          <p className="mt-6 leading-relaxed">{course.description}</p>

          {isEmbedCourse ? (
            <div className="mt-10 brand-surface rounded-lg border brand-border p-5">
              <h2 className="text-xl font-medium">Como este curso funciona</h2>
              <p className="mt-2 text-sm brand-text-muted">
                Curso interativo: as aulas, atividades e verificações acontecem dentro do
                ambiente de estudo, em tela cheia se você quiser. Materiais complementares,
                discussão e avaliação ficam no painel lateral do ambiente.
              </p>
            </div>
          ) : (
            <>
              <h2 className="mt-10 text-xl font-medium">Conteúdo do curso</h2>
              <div className="mt-4 space-y-4">
                {modules.map((m) => (
                  <div key={m.id} className="brand-surface rounded-lg border brand-border">
                    <div className="p-4 font-medium">{m.title}</div>
                    <ul className="border-t brand-border">
                      {(m.course_lessons ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((l: any) => (
                        <li key={l.id} className="px-4 py-3 flex items-center justify-between text-sm border-t brand-border">
                          <span>{l.title}</span>
                          <span className="text-xs brand-text-muted">{Math.round((l.duration_seconds ?? 0) / 60)}min {l.is_preview && "· prévia"}</span>
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

        <aside className="brand-surface rounded-xl p-6 border brand-border h-fit sticky top-24">
          <p className="text-xs brand-text-muted uppercase tracking-widest">{course.level}</p>
          <p className="mt-2 font-medium">{course.instructor_name}</p>
          {course.duration_minutes ? (
            <p className="text-sm brand-text-muted">{Math.round(course.duration_minutes / 60)}h de conteúdo</p>
          ) : null}
          <div className="mt-6 space-y-2">
            {!session ? (
              <Link to="/login" search={{ next: `/curso/${courseSlug}` }} className="block text-center rounded-lg py-3 brand-btn font-medium">Entrar para começar</Link>
            ) : hasAccess ? (
              <Link to="/curso/$courseSlug/aprender" params={{ courseSlug }} className="block text-center rounded-lg py-3 brand-btn font-medium">Continuar curso</Link>
            ) : course.external_checkout_url ? (
              <a href={course.external_checkout_url} target="_blank" rel="noopener" className="block text-center rounded-lg py-3 brand-btn font-medium">Comprar acesso</a>
            ) : !inCatalog && !isPlatformAdmin ? (
              <div className="text-center text-sm brand-text-muted rounded-lg py-3 border brand-border">
                Curso indisponível no catálogo da sua organização.
              </div>
            ) : (
              <button onClick={enroll} className="w-full rounded-lg py-3 brand-btn font-medium">Iniciar curso</button>
            )}
            {enrollError && <p className="text-xs text-red-400 mt-2">{enrollError}</p>}
          </div>
        </aside>
      </main>
      <TenantDemoSwitcher />
    </div>
  );
}
