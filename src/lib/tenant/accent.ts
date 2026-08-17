/**
 * Contraste seguro do accent do tenant.
 *
 * O tenant fornece UMA cor de marca (organization_branding.accent_color).
 * A legibilidade do texto sobre ela NÃO pode ser decidida pelo tenant —
 * senão amarelo CASA + texto branco vira um CTA invisível, que é
 * exatamente o bug reportado. Aqui calculamos a tinta do CTA.
 *
 * Aceita `#rrggbb`, `#rgb`, `rgb()` e `oklch(L C H)` — os formatos que o
 * editor de branding grava hoje.
 */

function srgbLuminance(r: number, g: number, b: number) {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Luminância relativa aproximada (0 = preto, 1 = branco) de qualquer cor de branding. */
export function accentLuminance(color: string | null | undefined): number {
  if (!color) return 0.35;
  const c = color.trim().toLowerCase();

  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    return srgbLuminance(
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    );
  }

  const rgb = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (rgb) return srgbLuminance(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));

  // oklch(L C H): L já é lightness perceptual em 0..1 (ou 0..100%).
  const oklch = c.match(/^oklch\(\s*([\d.]+)(%?)/);
  if (oklch) {
    const l = Number(oklch[1]) / (oklch[2] === "%" ? 100 : 1);
    // Aproxima L perceptual → luminância relativa.
    return Math.pow(Math.min(Math.max(l, 0), 1), 3);
  }

  return 0.35;
}

/** Tinta legível sobre o accent (AA garantido nos dois extremos). */
export function accentContrastInk(color: string | null | undefined): string {
  return accentLuminance(color) > 0.38 ? "#0A0A0A" : "#FFFFFF";
}