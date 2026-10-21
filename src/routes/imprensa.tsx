import { createFileRoute, Link } from "@tanstack/react-router";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { Eyebrow } from "@/components/academy/ui";
import { NEWS_ARTICLES, formatArticleDate } from "@/lib/news/articles";

export const Route = createFileRoute("/imprensa")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Imprensa — SíndicoLab" },
      {
        name: "description",
        content:
          "Matérias e coberturas do SíndicoLab sobre o mercado condominial: eventos, tecnologia, gestão e tendências do setor.",
      },
      { property: "og:title", content: "Imprensa — SíndicoLab" },
      {
        property: "og:description",
        content: "Coberturas e matérias sobre o mercado condominial, publicadas pelo SíndicoLab.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImprensaPage,
});

function ImprensaPage() {
  return (
    <AcademyShell>
      <section className="ax-container pt-12 pb-20">
        <Eyebrow>SíndicoLab</Eyebrow>
        <h1 className="ax-h1 mt-2">Imprensa</h1>
        <p className="ax-body mt-3 max-w-[62ch] text-[15.5px]">
          Matérias e coberturas sobre o mercado condominial: eventos, tecnologia, gestão e
          tendências do setor.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
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
                {a.category} · {formatArticleDate(a.publishedAt)} · por {a.author}
              </p>
              <p className="ax-card-title mt-1 text-[18px] group-hover:opacity-80 transition">
                {a.title}
              </p>
              <p className="ax-body mt-1.5 line-clamp-3 text-[14px]">{a.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </AcademyShell>
  );
}
