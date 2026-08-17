import { Link } from "@tanstack/react-router";
import { CourseCoverPlaceholder } from "./CourseCoverPlaceholder";
import { durationLabel, levelLabel, type AcademyCourse } from "./types";

type Props = {
  course: AcademyCourse;
  categoryName?: string | null;
  percent?: number;
  rating?: { avg: number; count: number };
  inMyList?: boolean;
  onToggleList?: (id: string) => void;
  /** Quando não há sessão, o CTA principal manda para o login. */
  authenticated?: boolean;
};

/**
 * Hero compartilhada: promove CONTEÚDO, nunca a instituição.
 * Estrutura idêntica em todos os tenants; a marca aparece no header, no
 * accent do CTA e nos detalhes gráficos.
 */
export function CourseHero({
  course,
  categoryName,
  percent = 0,
  rating,
  inMyList = false,
  onToggleList,
  authenticated = true,
}: Props) {
  const bg = course.banner_url ?? course.cover_url;
  const meta = [levelLabel(course.level), durationLabel(course.duration_minutes), course.instructor_name].filter(Boolean);

  return (
    <section className="academy-hero h-[440px] md:h-[500px] lg:h-[560px]">
      <div className="academy-hero-media">
        {bg ? (
          <img src={bg} alt="" aria-hidden fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <CourseCoverPlaceholder title={course.title} showTitle={false} className="h-full w-full" />
        )}
      </div>
      <div className="academy-hero-scrim" aria-hidden />

      <div className="relative flex h-full items-end pb-12 md:items-center md:pb-0">
        <div className="academy-container w-full">
          <div className="max-w-[640px]">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.18em]" style={{ color: "#A3A3A3" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--tenant-accent)" }} />
              {categoryName ?? (percent > 0 ? "Continue estudando" : "Em destaque no acervo")}
            </div>

            <h1 className="academy-hero-title mt-4">{course.title}</h1>

            {meta.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]" style={{ color: "#A3A3A3" }}>
                {meta.map((m, i) => (
                  <span key={i} className="flex items-center gap-3">
                    {i > 0 && <span aria-hidden style={{ color: "#525252" }}>·</span>}
                    {m}
                  </span>
                ))}
                {rating && rating.count > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden style={{ color: "#525252" }}>·</span>
                    <span style={{ color: "var(--tenant-accent)" }}>★</span>
                    {rating.avg.toFixed(1)}
                    <span style={{ color: "#737373" }}>({rating.count})</span>
                  </span>
                )}
              </div>
            )}

            {(course.subtitle || course.description) && (
              <p className="academy-hero-desc mt-5 line-clamp-3">{course.subtitle ?? course.description}</p>
            )}

            {percent > 0 && (
              <div className="mt-6 max-w-[340px]">
                <div className="h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.16)" }}>
                  <div className="h-full" style={{ width: `${percent}%`, background: "var(--tenant-accent)" }} />
                </div>
                <p className="mt-2 text-[12px]" style={{ color: "#A3A3A3" }}>{percent}% concluído</p>
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {authenticated ? (
                <Link to="/curso/$courseSlug/aprender" params={{ courseSlug: course.slug }} className="academy-cta">
                  {percent > 0 ? "Continuar curso" : "Começar curso"}
                </Link>
              ) : (
                <Link to="/login" search={{ next: `/curso/${course.slug}` }} className="academy-cta">
                  Começar curso
                </Link>
              )}
              <Link to="/curso/$courseSlug" params={{ courseSlug: course.slug }} className="academy-cta-secondary">
                Mais informações
              </Link>
              {onToggleList && (
                <button
                  type="button"
                  onClick={() => onToggleList(course.id)}
                  data-active={inMyList ? "true" : "false"}
                  className="academy-icon-btn"
                  aria-label={inMyList ? "Remover da minha lista" : "Adicionar à minha lista"}
                >
                  {inMyList ? "✓" : "+"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}