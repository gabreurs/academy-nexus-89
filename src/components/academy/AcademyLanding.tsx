import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useAcademyExperience } from "@/lib/tenant/TenantProvider";
import { Eyebrow } from "./ui";
import type { AcademyCourse } from "./types";

/**
 * ENTRADA DE ACADEMY CORPORATIVA (somente visitante deslogado).
 *
 * Composição editorial: tipografia + conteúdo real. Sem card de benefícios,
 * sem ícones genéricos, sem UI falsa. A marca aparece pelo header, pelo CTA
 * e pelos acentos — nunca tingindo superfícies.
 */
export function AcademyLanding({
  courseCount,
  courses = [],
}: {
  courseCount: number;
  courses?: AcademyCourse[];
}) {
  const exp = useAcademyExperience();
  const art = courses.filter((c) => c.cover_url).slice(0, 3);

  return (
    <>
      <section className="ax-hero">
        <div className="ax-container grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,.92fr)]">
          <div className="ax-hero-copy">
            <Eyebrow>{exp.copy.eyebrow}</Eyebrow>
            <h1 className="ax-display mt-3">{exp.copy.title}</h1>
            <p className="ax-body mt-4 max-w-[52ch] text-[16px]">{exp.copy.lead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <Link to="/login" search={{ next: "/inicio" }} className="ax-btn" data-variant="primary" data-size="lg">
                {exp.copy.primaryCta} <ArrowRight size={16} />
              </Link>
              <Link to="/catalogo" className="ax-btn" data-variant="outline" data-size="lg">
                Conhecer os conteúdos
              </Link>
            </div>
            <p className="ax-meta mt-6">
              {courseCount > 0
                ? `${courseCount} ${courseCount === 1 ? "curso disponível" : "cursos disponíveis"} no programa`
                : "Programa em publicação"}
            </p>
          </div>

          {/* Composição com as capas reais do acervo — conteúdo, não decoração. */}
          {art.length > 0 && (
            <div className="hidden lg:grid grid-cols-2 gap-3">
              <div className="ax-hero-art col-span-2" style={{ aspectRatio: "16 / 8" }}>
                <img src={art[0].cover_url!} alt="" aria-hidden loading="lazy" />
              </div>
              {art.slice(1, 3).map((c) => (
                <div key={c.id} className="ax-hero-art">
                  <img src={c.cover_url!} alt="" aria-hidden loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* COMO ACESSAR — existe apenas para quem ainda está fora da Academy. */}
      <section className="ax-section pt-0">
        <div className="ax-container">
          <span className="ax-accent-bar" aria-hidden />
          <h2 className="ax-h2 mt-4">Como acessar</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {exp.copy.accessSteps.map((s, i) => (
              <div key={s.title} className="ax-step">
                <span className="ax-step-num">{i + 1}</span>
                <div>
                  <p className="ax-card-title">{s.title}</p>
                  <p className="ax-body mt-1 text-[14px]">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
