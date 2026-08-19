import { Link } from "@tanstack/react-router";
import { Info, PlayCircle } from "lucide-react";
import type { AcademyCourse } from "./types";
import { durationLabel, levelLabel } from "./types";
import { CourseCoverPlaceholder } from "./CourseCoverPlaceholder";

/**
 * HERO EDITORIAL DE CONTEÚDO — componente ÚNICO para todos os tenants
 * (SíndicoLab, CASA, Guarida e futuros), logado ou não.
 *
 * É um PAINEL dentro do container da página: margem lateral, largura máxima,
 * cantos arredondados. Nunca full-bleed, nunca 100vh.
 * A capa do curso é a composição; o escurecimento é uniforme e leve, só o
 * suficiente para legibilidade. O tenant aparece apenas no accent (CTA e
 * progresso) — nada de tingir a arte com a marca.
 */

/** Sinopse curta a partir de dados JÁ cadastrados. Nunca inventa texto. */
function synopsis(course: AcademyCourse, max = 240) {
  const raw = (course.description || course.subtitle || "").replace(/\s+/g, " ").trim();
  if (!raw) return null;
  if (raw.length <= max) return raw;
  const cut = raw.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return `${cut.slice(0, stop > 120 ? stop : max).trim()}…`;
}

export function ContinueHero({
  course,
  percent = 0,
  resuming,
  categoryName,
  eyebrow,
  primaryLabel,
  primaryTo = "learn",
}: {
  course: AcademyCourse;
  percent?: number;
  resuming: boolean;
  categoryName?: string;
  /** Sobrescreve o rótulo de contexto (ex.: "Em destaque" no storefront). */
  eyebrow?: string;
  primaryLabel?: string;
  /** "learn" abre o ambiente do curso; "details" leva à página do curso. */
  primaryTo?: "learn" | "details";
}) {
  const art = course.banner_url || course.cover_url || null;
  const meta = [categoryName, levelLabel(course.level), durationLabel(course.duration_minutes)].filter(
    Boolean,
  ) as string[];
  const lead = synopsis(course);
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const label = primaryLabel ?? (resuming ? "Continuar curso" : "Começar curso");

  return (
    <section className="ax-container pt-6 md:pt-8">
      <div className="ax-hero-panel">
        {art ? (
          <img className="ax-hero-panel-art" src={art} alt="" aria-hidden fetchPriority="high" />
        ) : (
          <CourseCoverPlaceholder title={course.title} showTitle={false} className="ax-hero-panel-art" />
        )}
        {/* escurecimento uniforme leve + leve reforço só na base do texto */}
        <div className="ax-hero-panel-veil" aria-hidden />

        <div className="ax-hero-panel-copy">
          <p className="ax-hero-panel-eyebrow">
            {eyebrow ?? (resuming ? "Continue estudando" : "Recomendado para você")}
          </p>
          <h1 className="ax-hero-panel-title">{course.title}</h1>

          {meta.length > 0 && (
            <p className="ax-hero-panel-meta">{meta.join(" · ")}</p>
          )}

          {lead && <p className="ax-hero-panel-lead">{lead}</p>}

          {resuming && p > 0 && (
            <div className="ax-hero-panel-progress">
              <div className="ax-hero-panel-bar" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: `${p}%` }} />
              </div>
              <span>{p}% concluído</span>
            </div>
          )}

          <div className="ax-hero-panel-actions">
            {primaryTo === "learn" ? (
              <Link
                to="/curso/$courseSlug/aprender"
                params={{ courseSlug: course.slug }}
                className="ax-btn"
                data-variant="primary"
                data-size="lg"
              >
                <PlayCircle size={17} /> {label}
              </Link>
            ) : (
              <Link
                to="/curso/$courseSlug"
                params={{ courseSlug: course.slug }}
                className="ax-btn"
                data-variant="primary"
                data-size="lg"
              >
                <PlayCircle size={17} /> {label}
              </Link>
            )}
            <Link
              to="/curso/$courseSlug"
              params={{ courseSlug: course.slug }}
              className="ax-btn ax-hero-panel-ghost"
              data-size="lg"
            >
              <Info size={16} /> Mais informações
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
