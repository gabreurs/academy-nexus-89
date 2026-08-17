import { memo } from "react";

type Props = {
  title: string;
  category?: string | null;
  /** "dark" para trilhas/player, "brand" para superfícies do site do tenant. */
  tone?: "dark" | "brand";
  /** Oculta o título quando o card já exibe o nome do curso logo abaixo. */
  showTitle?: boolean;
  className?: string;
};

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Capa procedural 16:9 para cursos sem cover_url.
 * Usa o accent do tenant (SíndicoLab, Guarida, CASA) sobre a superfície
 * correspondente — nada de logo gigante nem arte genérica. Assim que
 * `cover_url` for preenchido, a imagem real substitui este componente.
 */
export const CoursePoster = memo(function CoursePoster({ title, category, tone = "dark", showTitle = true, className }: Props) {
  const h = hash(title);
  const angle = 120 + (h % 90);
  const cx = 20 + (h % 60);
  const cy = 25 + ((h >> 3) % 50);
  const base = tone === "dark" ? "var(--player-surface, #101319)" : "var(--brand-surface)";
  const ink = tone === "dark" ? "rgba(255,255,255,.92)" : "var(--brand-text)";

  return (
    <div
      className={"relative overflow-hidden " + (className ?? "")}
      style={{ background: base }}
      aria-hidden={false}
      role="img"
      aria-label={title}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 120% at ${cx}% ${cy}%, color-mix(in srgb, var(--tenant-accent, #888) 42%, transparent) 0%, transparent 62%),
            linear-gradient(${angle}deg, color-mix(in srgb, var(--tenant-accent, #888) 16%, transparent) 0%, transparent 55%)`,
        }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-[0.28]" viewBox="0 0 320 180" preserveAspectRatio="none">
        {[0, 1, 2, 3, 4].map((i) => (
          <circle
            key={i}
            cx={(cx / 100) * 320}
            cy={(cy / 100) * 180}
            r={26 + i * 26 + (h % 11)}
            fill="none"
            stroke="var(--tenant-accent, #888)"
            strokeWidth={0.6}
          />
        ))}
        <line x1="0" y1={140 - (h % 40)} x2="320" y2={40 + (h % 60)} stroke="var(--tenant-accent, #888)" strokeWidth="0.5" />
      </svg>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,.55) 100%)" }} />
      <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5">
        {category && (
          <span
            className="text-[9px] uppercase tracking-[0.22em] mb-1.5"
            style={{ color: "var(--tenant-accent, #999)" }}
          >
            {category}
          </span>
        )}
        {showTitle && (
          <span
            className="font-display text-sm md:text-base leading-snug line-clamp-3"
            style={{ color: ink }}
          >
            {title}
          </span>
        )}
      </div>
    </div>
  );
});
