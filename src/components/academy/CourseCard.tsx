import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { Bookmark, BookmarkCheck, Clock, Star } from "lucide-react";
import { CourseCoverPlaceholder } from "./CourseCoverPlaceholder";
import { Badge, Progress } from "./ui";
import { durationLabel, levelLabel, type AcademyCourse } from "./types";

type Props = {
  course: AcademyCourse;
  categoryName?: string | null;
  percent?: number;
  rating?: { avg: number; count: number };
  inMyList?: boolean;
  onToggleList?: (id: string) => void;
  /** "rail" = largura fixa em carrossel, "grid" = ocupa a coluna. */
  variant?: "rail" | "grid";
};

/**
 * CourseCard 2.0 — card ÚNICO de curso da plataforma.
 * A capa real manda; o resto é metadado denso e legível. Não existe
 * (nem pode existir) variante por organização.
 */
export const CourseCard = memo(function CourseCard({
  course,
  categoryName,
  percent = 0,
  rating,
  inMyList = false,
  onToggleList,
}: Props) {
  const duration = durationLabel(course.duration_minutes);
  const level = levelLabel(course.level);
  const started = percent > 0;
  const done = percent >= 100;

  return (
    <article className="ax-card group/card">
      <Link
        to="/curso/$courseSlug"
        params={{ courseSlug: course.slug }}
        className="block focus-visible:outline-none"
        aria-label={course.title}
      >
        <div className="ax-card-media">
          {course.cover_url ? (
            <img src={course.cover_url} alt="" aria-hidden loading="lazy" decoding="async" />
          ) : (
            <CourseCoverPlaceholder
              title={course.title}
              category={categoryName}
              showTitle={false}
              className="absolute inset-0 h-full w-full"
            />
          )}

          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {course.is_required && <Badge tone="accent">Obrigatório</Badge>}
            {done ? <Badge tone="done">Concluído</Badge> : started ? <Badge tone="progress">Em andamento</Badge> : null}
          </div>

          {started && !done && (
            <div className="ax-card-overlay">
              <Progress percent={percent} />
            </div>
          )}
        </div>
      </Link>

      {onToggleList && (
        <button
          type="button"
          onClick={() => onToggleList(course.id)}
          data-active={inMyList ? "true" : "false"}
          className="ax-iconbtn ax-card-save"
          data-size="sm"
          aria-label={inMyList ? "Remover da minha lista" : "Salvar na minha lista"}
          title={inMyList ? "Remover da minha lista" : "Salvar na minha lista"}
        >
          {inMyList ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>
      )}

      <div className="ax-card-body">
        {categoryName && <p className="ax-eyebrow truncate">{categoryName}</p>}
        <h3 className="ax-card-title">
          <Link to="/curso/$courseSlug" params={{ courseSlug: course.slug }}>
            {course.title}
          </Link>
        </h3>
        <div className="ax-meta flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} className="shrink-0" />
              {duration}
            </span>
          )}
          {level && <span>{level}</span>}
          {rating && rating.count > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star size={12} className="shrink-0" style={{ color: "var(--tenant-accent)" }} />
              {rating.avg.toFixed(1)}
            </span>
          )}
          {started && !done && <span style={{ color: "var(--tenant-accent)" }}>{percent}%</span>}
        </div>
      </div>
    </article>
  );
});
