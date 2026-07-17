import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Branding = {
  organization_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  banner_url: string | null;
  welcome_title: string | null;
  welcome_message: string | null;
  environment_name: string | null;
};

const DEFAULTS: Omit<Branding, "organization_id"> = {
  primary_color: "#1e40af",
  secondary_color: "#0ea5e9",
  accent_color: "#f59e0b",
  background_color: "#0b1220",
  surface_color: "#111a2e",
  text_color: "#e5e7eb",
  logo_light_url: null,
  logo_dark_url: null,
  favicon_url: null,
  banner_url: null,
  welcome_title: null,
  welcome_message: null,
  environment_name: null,
};

/**
 * Editor de marca. O RLS garante que:
 *  - platform_admin escreve em qualquer organização
 *  - org_admin escreve APENAS onde has_org_role(auth.uid(), org_id, 'org_admin')
 * Ou seja: tentar salvar com organization_id de outra empresa via DevTools falha no banco.
 */
export function BrandingEditor({ organizationId }: { organizationId: string }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("organization_branding")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (cancelled) return;
      setBranding((data as Branding) ?? { organization_id: organizationId, ...DEFAULTS });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [organizationId]);

  const save = async () => {
    if (!branding) return;
    setBusy(true); setMsg(null);
    // Force organization_id to the prop — never trust the state object for tenancy.
    const payload = { ...branding, organization_id: organizationId };
    const { error } = await supabase
      .from("organization_branding")
      .upsert(payload, { onConflict: "organization_id" });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: error.message });
      return;
    }
    setMsg({ kind: "ok", text: "Marca salva. Recarregue para ver aplicada em todos os componentes." });
    // Live preview: update CSS vars immediately.
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", branding.primary_color);
    root.style.setProperty("--brand-secondary", branding.secondary_color);
    root.style.setProperty("--brand-accent", branding.accent_color);
    root.style.setProperty("--brand-bg", branding.background_color);
    root.style.setProperty("--brand-surface", branding.surface_color);
    root.style.setProperty("--brand-text", branding.text_color);
  };

  if (loading || !branding) return <p className="brand-text-muted text-sm">Carregando marca…</p>;

  const upd = <K extends keyof Branding>(k: K, v: Branding[K]) =>
    setBranding({ ...branding, [k]: v });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium uppercase tracking-widest brand-text-muted">Cores</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {([
            ["primary_color", "Primária"],
            ["secondary_color", "Secundária"],
            ["accent_color", "Destaque"],
            ["background_color", "Fundo"],
            ["surface_color", "Superfície"],
            ["text_color", "Texto"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={branding[key] as string}
                onChange={(e) => upd(key, e.target.value)}
                className="h-10 w-14 rounded border brand-border bg-transparent"
              />
              <div className="flex-1">
                <p className="text-xs brand-text-muted">{label}</p>
                <input
                  value={branding[key] as string}
                  onChange={(e) => upd(key, e.target.value)}
                  className="mt-1 w-full rounded px-2 py-1 brand-surface-2 border brand-border text-sm font-mono"
                />
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium uppercase tracking-widest brand-text-muted">Imagens (URLs)</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {([
            ["logo_light_url", "Logo (fundo claro)"],
            ["logo_dark_url", "Logo (fundo escuro)"],
            ["favicon_url", "Favicon"],
            ["banner_url", "Banner de topo"],
          ] as const).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-xs brand-text-muted">{label}</span>
              <input
                value={(branding[key] as string | null) ?? ""}
                onChange={(e) => upd(key, e.target.value || null)}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm"
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium uppercase tracking-widest brand-text-muted">Boas-vindas</h3>
        <div className="mt-3 grid gap-3">
          <label className="block">
            <span className="text-xs brand-text-muted">Nome do ambiente (aba do navegador)</span>
            <input
              value={branding.environment_name ?? ""}
              onChange={(e) => upd("environment_name", e.target.value || null)}
              className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs brand-text-muted">Título de boas-vindas</span>
            <input
              value={branding.welcome_title ?? ""}
              onChange={(e) => upd("welcome_title", e.target.value || null)}
              className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs brand-text-muted">Mensagem de boas-vindas</span>
            <textarea
              value={branding.welcome_message ?? ""}
              onChange={(e) => upd("welcome_message", e.target.value || null)}
              rows={3}
              className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy}
          className="rounded-lg px-5 py-2.5 brand-btn font-medium disabled:opacity-50">
          {busy ? "Salvando…" : "Salvar marca"}
        </button>
        {msg && (
          <p className={`text-sm ${msg.kind === "err" ? "text-red-400" : "text-emerald-400"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}