import { Link } from "@tanstack/react-router";
import { Info, PlayCircle } from "lucide-react";
import type { AcademyCourse } from "./types";
import { durationLabel, levelLabel } from "./types";

/**
 * Hero imersivo da home autenticada.
 * A arte do curso é o protagonista: fundo desfocado (protege capas de baixa
 * resolução) + crop nítido com máscara lateral + scrims. O tenant entra só
 * pelo accent da barra de progresso e pelos CTAs.
 */
export function ContinueHero({
  course,
  percent = 0,
  resuming,
  categoryName,
}: {
  course: AcademyCourse;
  percent?: number;
  resuming: boolean;
  categoryName?: string;
}) {
  const art = course.banner_url || course.cover_url || null;
  const meta = [categoryName, levelLabel(course.level), durationLabel(course.duration_minutes)].filter(
    Boolean,
  ) as string[];
  const lead = course.subtitle || course.description || null;
  const p = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <section className="ax-cinehero">
      {art ? (
        <>
          <div className="ax-cinehero-bg" style={{ backgroundImage: `url(${art})` }} aria-hidden />
          <div className="ax-cinehero-art" style={{ backgroundImage: `url(${art})` }} aria-hidden />
        </>
      ) : (
        <div
          className="ax-cinehero-bg"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(135deg, color-mix(in oklab, var(--tenant-accent) 40%, #0B0B0E), #0B0B0E)",
          }}
        />
      )}
      <div className="ax-cinehero-scrim" aria-hidden />

      <div className="ax-container w-full">
        <div className="ax-cinehero-copy">
          <p className="ax-eyebrow" style={{ color: "rgba(244,244,246,.72)" }}>
            {resuming ? "Continue estudando" : "Recomendado para você"}
          </p>
          <h1 className="ax-cinehero-title mt-2.5">{course.title}</h1>

          {meta.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {meta.map((m) => (
                <span key={m} className="ax-cinehero-glass">
                  {m}
                </span>
              ))}
            </div>
          )}

          {lead && <p className="ax-cinehero-lead mt-4">{lead}</p>}

          {resuming && p > 0 && (
            <div className="ax-cinehero-progress mt-5">
              <div className="ax-cinehero-bar" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: `${p}%` }} />
              </div>
              <p className="mt-2 text-[12.5px]" style={{ color: "rgba(244,244,246,.78)" }}>
                {p}% concluído
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              to="/curso/$courseSlug/aprender"
              params={{ courseSlug: course.slug }}
              className="ax-btn"
              data-variant="primary"
              data-size="lg"
            >
              <PlayCircle size={17} /> {resuming ? "Continuar curso" : "Começar curso"}
            </Link>
            <Link
              to="/curso/$courseSlug"
              params={{ courseSlug: course.slug }}
              className="ax-btn ax-cinehero-glass"
              data-size="lg"
              style={{ borderRadius: "var(--ax-r-md)", color: "#F4F4F6" }}
            >
              <Info size={16} /> Mais informações
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
