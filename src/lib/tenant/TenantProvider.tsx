import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ResolvedTenant } from "./types";

type Ctx = {
  tenant: ResolvedTenant | null;
  loading: boolean;
  overrideSlug: (slug: string | null) => void;
};

const TenantContext = createContext<Ctx>({ tenant: null, loading: true, overrideSlug: () => {} });

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
    const { data } = await supabase.from("organizations").select("*").eq("slug", slugOrHost.slug).maybeSingle();
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
  const [loading, setLoading] = useState(true);

  const resolve = async () => {
    setLoading(true);
    const slug = detectSlugFromEnvironment();
    const host = typeof window !== "undefined" ? window.location.hostname : null;
    const t = await loadTenant({ slug, hostname: host });
    setTenant(t);
    applyBrandingVars(t);
    setLoading(false);
  };

  useEffect(() => { resolve(); }, []);

  const overrideSlug = (slug: string | null) => {
    if (typeof window === "undefined") return;
    if (slug) window.localStorage.setItem(OVERRIDE_KEY, slug);
    else window.localStorage.removeItem(OVERRIDE_KEY);
    resolve();
  };

  return <TenantContext.Provider value={{ tenant, loading, overrideSlug }}>{children}</TenantContext.Provider>;
}

export function useTenant() { return useContext(TenantContext); }