/**
 * Resolve URLs de assets para a base de deploy atual.
 *
 * URLs salvas no banco (capas, logos, favicons) e caminhos de /public são
 * absolutos ("/brand/x.svg", "/__l5e/..."). Quando o site é servido em um
 * subdiretório (ex.: https://sindicolab.com.br/academy, base "/academy/"),
 * esses caminhos precisam ser prefixados com a base do build
 * (import.meta.env.BASE_URL, definida via VITE_APP_BASE no vite.config.ts).
 *
 * Em "/" (Lovable) o resultado é idêntico ao caminho original.
 */
export function withBase(url: string | null | undefined): string {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (!url.startsWith("/")) return url;
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${url.slice(1)}`;
}
