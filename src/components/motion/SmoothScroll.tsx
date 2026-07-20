import { useEffect } from "react";

/**
 * Lenis smooth-scroll — carregado dinamicamente apenas nas rotas de marketing.
 * Respeita prefers-reduced-motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let lenis: any;
    let cancelled = false;

    (async () => {
      const Lenis = (await import("lenis")).default;
      if (cancelled) return;
      lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      document.documentElement.classList.add("lenis", "lenis-smooth");
      const loop = (time: number) => {
        lenis.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      try { lenis?.destroy?.(); } catch {}
      document.documentElement.classList.remove("lenis", "lenis-smooth");
    };
  }, []);
  return null;
}