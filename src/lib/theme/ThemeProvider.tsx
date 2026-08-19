import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Tema da plataforma: claro (default), escuro ou sistema.
 *
 * LIGHT-FIRST: a Academy é desenhada primeiro no claro. O escuro é uma
 * preferência do usuário — nunca o canvas universal do produto.
 * A escolha persiste localmente até existir preferência no perfil.
 */
export type ThemeChoice = "light" | "dark" | "system";

const KEY = "academy.theme";

type Ctx = { choice: ThemeChoice; resolved: "light" | "dark"; setChoice: (c: ThemeChoice) => void };
const ThemeContext = createContext<Ctx>({ choice: "light", resolved: "light", setChoice: () => {} });

function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>("light");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY) as ThemeChoice | null;
    if (stored === "light" || stored === "dark" || stored === "system") setChoiceState(stored);
    setSystemDark(systemPrefersDark());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" = choice === "system" ? (systemDark ? "dark" : "light") : choice;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setChoice = useCallback((c: ThemeChoice) => {
    setChoiceState(c);
    try { window.localStorage.setItem(KEY, c); } catch { /* storage indisponível */ }
  }, []);

  const value = useMemo(() => ({ choice, resolved, setChoice }), [choice, resolved, setChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
