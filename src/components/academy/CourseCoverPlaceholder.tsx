import { memo } from "react";

type Props = {
  title: string;
  category?: string | null;
  /** Mostra o título dentro da arte (cards de rail). */
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
 *
 * Base grafite estrutural (igual para todo tenant) + aplicação DISCRETA do
 * accent. Variações determinísticas por título evitam repetição sem criar
 * linguagens visuais diferentes por organização.
 */
export const CourseCoverPlaceholder = memo(function CourseCoverPlaceholder({
  title,
  category,
  showTitle = true,
  className,
}: Props) {
  const h = hash(title);
  const variant = h % 3;
  const cx = 18 + (h % 46);
  const cy = 22 + ((h >> 3) % 40);
  const rot = -18 + (h % 36);

  return (
    <div
      className={"relative overflow-hidden " + (className ?? "")}
      style={{ background: "linear-gradient(150deg, #1A1A1A 0%, #101010 55%, #0B0B0B 100%)" }}
      role="img"
      aria-label={title}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(105% 105% at ${cx}% ${cy}%, color-mix(in srgb, var(--tenant-accent) 26%, transparent) 0%, transparent 62%)`,
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 320 180"
        preserveAspectRatio="none"
        aria-hidden
      >
        <g stroke="var(--tenant-accent)" fill="none" opacity="0.34">
          {variant === 0 &&
            [0, 1, 2, 3].map((i) => (
              <circle key={i} cx={(cx / 100) * 320} cy={(cy / 100) * 180} r={34 + i * 30} strokeWidth={0.7} />
            ))}
          {variant === 1 &&
            [0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                x1={-40 + i * 70}
                y1={200}
                x2={40 + i * 70 + rot}
                y2={-20}
                strokeWidth={0.8}
              />
            ))}
          {variant === 2 &&
            [0, 1, 2].map((i) => (
              <rect
                key={i}
                x={(cx / 100) * 320 - 30 - i * 26}
                y={(cy / 100) * 180 - 22 - i * 20}
                width={60 + i * 52}
                height={44 + i * 40}
                rx={8}
                strokeWidth={0.7}
              />
            ))}
        </g>
        <g stroke="rgba(255,255,255,.10)" fill="none">
          <line x1="0" y1={132 - (h % 30)} x2="320" y2={48 + (h % 40)} strokeWidth="0.6" />
        </g>
      </svg>
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(9,9,9,0) 35%, rgba(9,9,9,.86) 100%)" }}
      />
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        {category && (
          <span
            className="text-[11px] uppercase tracking-[0.16em]"
            style={{ color: "var(--tenant-accent)" }}
          >
            {category}
          </span>
        )}
        {showTitle && (
          <span
            className="mt-1 text-[15px] md:text-[17px] font-semibold leading-snug line-clamp-3"
            style={{ color: "#F5F5F5", letterSpacing: "-0.02em" }}
          >
            {title}
          </span>
        )}
      </div>
    </div>
  );
});