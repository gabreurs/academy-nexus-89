import { Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, Newspaper, Building2 } from "lucide-react";
import { Eyebrow, SectionHeader } from "@/components/academy/ui";
import { NEWS_ARTICLES, formatArticleDate } from "@/lib/news/articles";

/**
 * HOME INSTITUCIONAL DO SÍNDICOLAB (tenant plataforma, visitante).
 *
 * Quando o tenant resolvido é a plataforma e não há sessão, `/` se
 * comporta como o site da empresa — não como storefront da Academy.
 * A Academy continua acessível pelo catálogo e pelo login.
 */
export function SindicoLabHome() {
  return (
    <>
      {/* HERO INSTITUCIONAL */}
      <section className="ax-hero">
        <div className="ax-container w-full">
          <div className="ax-hero-copy">
            <Eyebrow>SíndicoLab</Eyebrow>
            <h1 className="ax-display mt-3">Tecnologia e conhecimento para o mercado condominial.</h1>
            <p className="ax-body mt-4 max-w-[54ch] text-[16px]">
              O SíndicoLab desenvolve soluções digitais para síndicos, administradoras e gestores
              prediais — da educação continuada na SíndicoLab Academy à cobertura dos principais
              eventos do setor.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <Link to="/catalogo" className="ax-btn" data-variant="primary" data-size="lg">
                Conhecer a Academy <ArrowRight size={16} />
              </Link>
              <Link to="/imprensa" className="ax-btn" data-variant="outline" data-size="lg">
                Imprensa
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* O QUE FAZEMOS */}
      <section className="ax-section pt-0">
        <div className="ax-container">
          <span className="ax-accent-bar" aria-hidden />
          <h2 className="ax-h2 mt-4">O que fazemos</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="ax-step">
              <span className="ax-step-num">
                <GraduationCap size={16} />
              </span>
              <div>
                <p className="ax-card-title">SíndicoLab Academy</p>
                <p className="ax-body mt-1 text-[14px]">
                  Plataforma de educação continuada para o mercado condominial, com cursos e trilhas
                  para síndicos, administradoras e equipes.
                </p>
              </div>
            </div>
            <div className="ax-step">
              <span className="ax-step-num">
                <Building2 size={16} />
              </span>
              <div>
                <p className="ax-card-title">Soluções para administradoras</p>
                <p className="ax-body mt-1 text-[14px]">
                  Ambientes de aprendizagem white-label: cada administradora opera a sua própria
                  Academy, com a sua marca e o seu público.
                </p>
              </div>
            </div>
            <div className="ax-step">
              <span className="ax-step-num">
                <Newspaper size={16} />
              </span>
              <div>
                <p className="ax-card-title">Conteúdo e cobertura</p>
                <p className="ax-body mt-1 text-[14px]">
                  Acompanhamos os principais eventos e debates do setor condominial e publicamos
                  matérias na nossa editoria de imprensa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IMPRESSA — matérias mais recentes */}
      <section className="ax-section pt-0">
        <div className="ax-container">
          <SectionHeader
            title="Imprensa"
            subtitle="Coberturas e novidades do mercado condominial"
            action={
              <Link to="/imprensa" className="ax-btn" data-variant="ghost" data-size="sm">
                Todas as matérias <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {NEWS_ARTICLES.map((a) => (
              <Link
                key={a.slug}
                to="/imprensa/$slug"
                params={{ slug: a.slug }}
                className="group block"
              >
                <div className="ax-hero-art" style={{ aspectRatio: "16 / 9" }}>
                  <img src={a.cover} alt="" aria-hidden loading="lazy" width={1536} height={864} />
                </div>
                <p className="ax-meta mt-3">
                  {a.category} · {formatArticleDate(a.publishedAt)}
                </p>
                <p className="ax-card-title mt-1 group-hover:opacity-80 transition">{a.title}</p>
                <p className="ax-body mt-1.5 line-clamp-2 text-[14px]">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
