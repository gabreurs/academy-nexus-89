import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ResolvedTenant } from "./types";
import { accentContrastInk, accentLuminance } from "./accent";
import { resolveAcademyExperience, type AcademyExperience } from "./experience";

type Ctx = {
  tenant: ResolvedTenant | null;
  loading: boolean;
  experience: AcademyExperience;
  overrideSlug: (slug: string | null) => void;
};

const TenantContext = createContext<Ctx>({
  tenant: null,
  loading: true,
  experience: resolveAcademyExperience(null),
  overrideSlug: () => {},
});

const OVERRIDE_KEY = "academy.tenantOverride";

function detectSlugFromEnvironment(): string | null {
  if (typeof window === "undefined") return null;
  // 1. explicit override (from /demo/:slug or seletor de admin)
  const stored = window.localStorage.getItem(OVERRIDE_KEY);
  if (stored) return stored;
  // 2. query string ?tenant=slug
  const params = new URLSearchParams(window.location.search);
  const q = params.get("tenant");
  if (q) return q;
  // 3. path /demo/:slug (client-side match)
  const m = window.location.pathname.match(/^\/demo\/([^\/]+)/);
  if (m) return m[1];
  return null;
}

function applyBrandingVars(t: ResolvedTenant | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const b = t?.branding;
  if (!b) return;
  root.style.setProperty("--brand-primary", b.primary_color);
  root.style.setProperty("--brand-secondary", b.secondary_color);
  root.style.setProperty("--brand-accent", b.accent_color);
  root.style.setProperty("--brand-bg", b.background_color);
  root.style.setProperty("--brand-surface", b.surface_color);
  root.style.setProperty("--brand-text", b.text_color);
  // Ponte semântica: --tenant-accent é a única cor de marca que sobrevive
  // dentro do palco escuro do player. Sempre acompanha o acento do tenant.
  root.style.setProperty("--tenant-accent", b.accent_color);
  // CAMADA 2 → só accent. A tinta legível sobre ele é CALCULADA: um tenant
  // não pode configurar um CTA invisível (amarelo + branco, p. ex.).
  root.style.setProperty("--tenant-accent-contrast", accentContrastInk(b.accent_color));

  // CAMADA 2 (profunda): a marca também define a ESTRATÉGIA NEUTRA do tema
  // claro — canvas, superfície e tinta. Só aceitamos valores que preservem o
  // light-first: um background escuro configurado pelo tenant não sequestra o
  // tema claro, vira apenas intensidade de tinta.
  const bgLum = accentLuminance(b.background_color);
  const surfLum = accentLuminance(b.surface_color);
  const textLum = accentLuminance(b.text_color);
  root.style.setProperty("--tenant-canvas-base", bgLum > 0.6 ? b.background_color : "#F6F6F4");
  root.style.setProperty("--tenant-surface-base", surfLum > 0.7 ? b.surface_color : "#FFFFFF");
  root.style.setProperty("--tenant-ink-base", textLum < 0.18 ? b.text_color : "#17171B");
  // Marcas de acento muito saturado/claro precisam de tinta menor para não
  // "lavar" o canvas; marcas discretas podem tingir um pouco mais.
  const accLum = accentLuminance(b.accent_color);
  root.style.setProperty("--tenant-tint-strength", accLum > 0.55 ? "3%" : "5%");
  if (b.environment_name) document.title = b.environment_name;
  if (b.favicon_url) {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = b.favicon_url;
  }
}

async function loadTenant(slugOrHost: { slug?: string | null; hostname?: string | null }): Promise<ResolvedTenant | null> {
  let orgId: string | null = null;
  if (slugOrHost.slug) {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("slug", slugOrHost.slug)
      .eq("status", "active")
      .maybeSingle();
    if (data) return await hydrate(data);
  }
  if (slugOrHost.hostname) {
    const { data: org } = await supabase
      .rpc("resolve_tenant_by_hostname", { p_hostname: slugOrHost.hostname })
      .maybeSingle();
    if (org) return await hydrate(org);
  }
  if (!orgId) {
    // Fallback: SíndicoLab
    const { data } = await supabase.from("organizations").select("*").eq("slug", "sindicolab").maybeSingle();
    if (data) return await hydrate(data);
  }
  return null;
}

async function hydrate(org: any): Promise<ResolvedTenant> {
  const { data: branding } = await supabase
    .from("organization_branding")
    .select("*")
    .eq("organization_id", org.id)
    .maybeSingle();
  return { organization: org, branding: (branding as any) ?? null };
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<ResolvedTenant | null>(null);
  const [resolved, setResolved] = useState(false);
  // `correcting` cobre a janela em que sabemos que o tenant exibido está
  // errado para este usuário e ainda estamos trocando. Enquanto isso o gate
  // NÃO pode avaliar acesso — senão expulsa um usuário legítimo.
  const [correcting, setCorrecting] = useState(false);
  const { memberships, ready: authReady, isPlatformAdmin, session } = useAuth();

  // Só a resolução mais recente escreve estado (evita respostas fora de ordem
  // e resoluções duplicadas sobrescrevendo o tenant corrigido).
  const genRef = useRef(0);
  // Chave da última correção tentada. Mantida em estado (não em ref) porque o
  // gate precisa saber, já no mesmo render, que uma correção está pendente.
  const [attemptedKey, setAttemptedKey] = useState<string | null>(null);

  const resolve = useCallback(async (forcedSlug?: string | null) => {
    const gen = ++genRef.current;
    const slug = forcedSlug ?? detectSlugFromEnvironment();
    const host = typeof window !== "undefined" ? window.location.hostname : null;
    const t = await loadTenant({ slug, hostname: host });
    if (gen !== genRef.current) return;
    setTenant(t);
    applyBrandingVars(t);
    setResolved(true);
  }, []);

  useEffect(() => { void resolve(); }, [resolve]);

  // Um usuário logado que NÃO é platform_admin nunca deve ficar preso no
  // white label de outra organização (override antigo salvo no navegador).
  // Calculado no render: fecha a janela em que o gate avaliaria acesso antes
  // de o efeito de correção começar (causa do logout indevido após login).
  const mismatch = (() => {
    if (!authReady || !resolved || !session || isPlatformAdmin) return null;
    const orgId = tenant?.organization?.id ?? null;
    if (!orgId) return null;
    if (memberships.some((m) => m.organization_id === orgId && m.is_active)) return null;
    const ownOrgId = memberships.find((m) => m.is_active)?.organization_id;
    if (!ownOrgId) return null;
    return { key: `${session.user.id}:${orgId}`, ownOrgId };
  })();
  const pendingCorrection = !!mismatch && mismatch.key !== attemptedKey;

  useEffect(() => {
    if (correcting) return;
    if (!mismatch) {
      if (attemptedKey !== null) setAttemptedKey(null);
      return;
    }
    const { key, ownOrgId } = mismatch;
    if (attemptedKey === key) return;
    setAttemptedKey(key);
    setCorrecting(true);
    (async () => {
      try {
        const { data } = await supabase.from("organizations").select("slug").eq("id", ownOrgId).maybeSingle();
        if (typeof window !== "undefined") window.localStorage.removeItem(OVERRIDE_KEY);
        await resolve(data?.slug ?? null);
      } finally {
        setCorrecting(false);
      }
    })();
  }, [correcting, mismatch?.key, mismatch?.ownOrgId, attemptedKey, resolve]);

  const overrideSlug = useCallback((slug: string | null) => {
    if (typeof window === "undefined") return;
    if (slug) window.localStorage.setItem(OVERRIDE_KEY, slug);
    else window.localStorage.removeItem(OVERRIDE_KEY);
    setAttemptedKey(null);
    void resolve();
  }, [resolve]);

  const experience = useMemo(() => resolveAcademyExperience(tenant), [tenant]);

  const value = useMemo(
    () => ({ tenant, loading: !resolved || correcting || pendingCorrection, experience, overrideSlug }),
    [tenant, resolved, correcting, pendingCorrection, experience, overrideSlug],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() { return useContext(TenantContext); }

/** Modelo comercial da Academy atual (marketplace vs corporativo). */
export function useAcademyExperience() { return useContext(TenantContext).experience; }