import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, GraduationCap, ShieldCheck } from "lucide-react";
import { useAcademyExperience, useTenant } from "@/lib/tenant/TenantProvider";
import { Eyebrow } from "./ui";
import { TenantLogo } from "./TenantLogo";

/**
 * ENTRADA DE ACADEMY CORPORATIVA.
 *
 * Quando a Academy pertence a uma empresa (modelo corporate), `/` não é
 * vitrine de venda: é a porta institucional. Precisa dizer de quem é o
 * ambiente, para quem ele existe e como se entra — antes de qualquer
 * catálogo. É aqui que a marca do tenant tem a maior intensidade permitida
 * em todo o produto; da porta para dentro, a estrutura volta a ser neutra.
 */
export function AcademyLanding({ courseCount }: { courseCount: number }) {
  const { tenant } = useTenant();
  const exp = useAcademyExperience();
  const org = tenant?.organization;
  const name = org?.name ?? "Academy";

  return (
    <>
      <section className="ax-hero" data-tone="brand">
        <div className="ax-motif" aria-hidden />
        <div className="ax-container grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
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

          {/* Cartão institucional: identidade do tenant, estrutura da Academy */}
          <div className="ax-brand-soft p-7 lg:justify-self-end lg:max-w-[440px]">
            <TenantLogo />
            <p className="ax-h3 mt-5">Uma Academy dedicada ao público de {name}.</p>
            <ul className="mt-5 space-y-3.5">
              <Point icon={<Building2 size={16} />} title="Ambiente exclusivo">
                Acervo curado para a realidade dos condomínios administrados.
              </Point>
              <Point icon={<GraduationCap size={16} />} title="No seu ritmo">
                Progresso salvo, retomada de onde parou e certificação por curso.
              </Point>
              <Point icon={<ShieldCheck size={16} />} title="Acesso controlado">
                {exp.copy.gated}
              </Point>
            </ul>
          </div>
        </div>
      </section>

      {/* COMO ACESSAR — resposta obrigatória de uma entrada corporativa */}
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

function Point({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span style={{ color: "var(--tenant-accent)" }} aria-hidden className="mt-0.5">
        {icon}
      </span>
      <span>
        <span className="ax-card-title block">{title}</span>
        <span className="ax-body text-[14px]">{children}</span>
      </span>
    </li>
  );
}
