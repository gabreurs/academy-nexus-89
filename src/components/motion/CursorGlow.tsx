import { useEffect, useRef, type ReactNode } from "react";

/**
 * Card com halo que segue o cursor (portado do institucional).
 * Grava --mx/--my no DOM via rAF (fora do render cycle do React).
 */
export function CursorGlow({
  children,
  className = "",
}: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let px = 0, py = 0;
    const on = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 100;
      py = ((e.clientY - r.top) / r.height) * 100;
      if (!raf) raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", `${px}%`);
        el.style.setProperty("--my", `${py}%`);
        raf = 0;
      });
    };
    el.addEventListener("pointermove", on);
    return () => {
      el.removeEventListener("pointermove", on);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <div ref={ref} className={`cursor-glow ${className}`}>{children}</div>;
}