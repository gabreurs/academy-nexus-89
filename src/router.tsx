import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Base de deploy (ex.: "/academy" quando servido em sindicolab.com.br/academy).
    // Vem do MESMO env var usado no build; padrão "/" (Lovable).
    basepath: (import.meta.env.VITE_APP_BASE as string | undefined) || "/",
  });

  return router;
};
