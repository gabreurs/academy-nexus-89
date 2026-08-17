import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { CourseCoverPlaceholder } from "./CourseCoverPlaceholder";
import { durationLabel, type AcademyCourse } from "./types";

type Props = {
  course: AcademyCourse;
  categoryName?: string | null;
  percent?: number;
  inMyList?: boolean;
  onToggleList?: (id: string) => void;
  /** "rail" = largura fixa em carrossel, "grid" = ocupa a coluna. */
  variant?: "rail" | "grid";
};

/**
 * Card ÚNICO de curso. Usado em rails, grids e listas de todos os tenants.
 * Não existe (nem pode existir) variante por organização.
 */
export const CourseCard = memo(function CourseCard({
  course,
  categoryName,
  percent = 0,
  inMyList = false,
  onToggleList,
  variant = "rail",
}: Props) {
  return (
    <article className={`academy-card ${variant === "grid" ? "academy-card-grid" : ""}`}>
      <Link
        to="/curso/$courseSlug"
        params={{ courseSlug: course.slug }}
        className="block"
        aria-label={course.title}
      >
        <div className="relative aspect-video overflow-hidden">
          {course.cover_url ? (
            <img
              src={course.cover_url}
              alt={course.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <CourseCoverPlaceholder
              title={course.title}
              category={categoryName}
              className="absolute inset-0 h-full w-full"
            />
          )}

          {course.is_required && (
            <span className="academy-chip absolute left-3 top-3" data-tone="solid">
              Obrigatório
            </span>
          )}

          {percent > 0 && (
            <div className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: "rgba(0,0,0,.6)" }}>
              <div className="h-full" style={{ width: `${percent}%`, background: "var(--tenant-accent)" }} />
            </div>
          )}
        </div>
      </Link>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="line-clamp-2 text-[15px] font-semibold leading-snug md:text-[16px]"
              style={{ letterSpacing: "-0.02em", color: "#F5F5F5" }}
            >
              {course.title}
            </h3>
            <p className="mt-1 truncate text-[12px]" style={{ color: "#A3A3A3" }}>
              {[categoryName, durationLabel(course.duration_minutes)].filter(Boolean).join(" · ") || "\u00A0"}
            </p>
          </div>
          {onToggleList && (
            <button
              type="button"
              onClick={() => onToggleList(course.id)}
              data-active={inMyList ? "true" : "false"}
              className="academy-icon-btn academy-card-actions h-9 w-9 shrink-0 text-[15px]"
              aria-label={inMyList ? "Remover da minha lista" : "Adicionar à minha lista"}
              title={inMyList ? "Remover da minha lista" : "Adicionar à minha lista"}
            >
              {inMyList ? "✓" : "+"}
            </button>
          )}
        </div>
        {percent > 0 && (
          <p className="mt-2 text-[11px]" style={{ color: "var(--tenant-accent)" }}>
            {percent}% concluído
          </p>
        )}
      </div>
    </article>
  );
});