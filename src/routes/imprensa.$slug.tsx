import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { Badge } from "@/components/academy/ui";
import { getArticle, formatArticleDate } from "@/lib/news/articles";

export const Route = createFileRoute("/imprensa/$slug")({
  ssr: false,
  head: ({ params }) => {
    const article = getArticle(params.slug);
    const title = article ? `${article.title} — SíndicoLab` : "Imprensa — SíndicoLab";
    const description = article?.excerpt ?? "Matéria publicada pelo SíndicoLab.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const article = getArticle(slug);

  if (!article) {
    return (
      <AcademyShell>
        <section className="ax-container py-20">
          <h1 className="ax-h2">Matéria não encontrada</h1>
          <p className="ax-body mt-2">O conteúdo que você procura não está disponível.</p>
          <Link to="/imprensa" className="ax-btn mt-6 inline-flex" data-variant="outline">
            <ArrowLeft size={15} /> Voltar para Imprensa
          </Link>
        </section>
      </AcademyShell>
    );
  }

  return (
    <AcademyShell>
      <article className="ax-container max-w-[760px] pt-12 pb-20">
        <Link
          to="/imprensa"
          className="ax-meta inline-flex items-center gap-1.5 hover:opacity-80 transition"
        >
          <ArrowLeft size={14} /> Imprensa
        </Link>

        <div className="mt-5 flex items-center gap-2.5">
          <Badge tone="accent">{article.category}</Badge>
        </div>
        <h1 className="ax-h1 mt-3">{article.title}</h1>
        <p className="ax-body mt-4 text-[16px]">{article.excerpt}</p>
        <p className="ax-meta mt-5">
          Por {article.author} · {formatArticleDate(article.publishedAt)}
        </p>

        <div className="ax-hero-art mt-8" style={{ aspectRatio: "16 / 9" }}>
          <img src={article.cover} alt={article.coverAlt} width={1536} height={864} />
        </div>

        <div className="mt-9 space-y-5">
          {article.blocks.map((b, i) => {
            if (b.type === "h2") {
              return (
                <h2 key={i} className="ax-h2 pt-4 text-[22px]">
                  {b.text}
                </h2>
              );
            }
            if (b.type === "quote") {
              return (
                <blockquote
                  key={i}
                  className="border-l-[3px] py-1 pl-5"
                  style={{ borderColor: "var(--tenant-accent)" }}
                >
                  <p className="ax-body text-[16px] italic" style={{ color: "var(--ax-text)" }}>
                    “{b.text}”
                  </p>
                  {b.cite && <cite className="ax-meta mt-2 block not-italic">— {b.cite}</cite>}
                </blockquote>
              );
            }
            if (b.type === "list") {
              return (
                <ul key={i} className="ax-body list-disc space-y-1.5 pl-6 text-[15.5px]">
                  {b.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i} className="ax-body text-[15.5px] leading-relaxed">
                {b.text}
              </p>
            );
          })}
        </div>

        {article.service && (
          <aside className="ax-panel-raised mt-10 p-6">
            <p className="ax-eyebrow">Serviço</p>
            <dl className="mt-4 space-y-3">
              {article.service.map((s) => (
                <div key={s.label} className="grid gap-0.5 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4">
                  <dt className="ax-meta">{s.label}</dt>
                  <dd className="ax-body text-[14px]" style={{ color: "var(--ax-text)" }}>
                    {s.href ? (
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                        style={{ color: "var(--tenant-accent)" }}
                      >
                        {s.value}
                      </a>
                    ) : (
                      s.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        )}
      </article>
    </AcademyShell>
  );
}
