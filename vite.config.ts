// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.

/**
 * Base de deploy opcional (ex.: site servido em https://sindicolab.com.br/academy).
 * Definida apenas no build de entrega via variável de ambiente VITE_APP_BASE
 * (mesma variável lida por src/router.tsx para o basepath do router).
 * Sem a variável, o build fica em "/" — comportamento padrão da Lovable.
 */
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const envBase = process.env.VITE_APP_BASE || "/";
const viteBase = envBase === "/" ? "/" : `${envBase.replace(/\/+$/, "")}/`;

export default defineConfig({
  vite: { base: viteBase },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Gera index.html estático (shell SPA) para hospedagem de arquivos estáticos (CPanel).
    pages: [{ path: "/" }],
    prerender: { enabled: true, autoStaticPathsDiscovery: false },
  },
});
