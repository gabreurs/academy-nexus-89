import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyBrandingVars } from "@/lib/tenant/TenantProvider";
import { accentContrastInk } from "@/lib/tenant/accent";

/**
 * EDITOR DE MARCA = painel do sistema real de tokens.
 *
 * Cada campo aqui corresponde 1:1 a um token consumido pelo frontend:
 *   accent_color            → --tenant-accent (ação, seleção, foco, progresso)
 *   background_color        → --ax-canvas (tema claro)
 *   surface_color           → --ax-surface (tema claro)
 *   text_color              → --ax-text (tema claro)
 *   dark_*                  → mesmos tokens no tema escuro
 * Não existe superfície derivada do accent.
 */
type Branding = {
  organization_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  dark_background_color: string;
  dark_surface_color: string;
  dark_text_color: string;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  banner_url: string | null;
  welcome_title: string | null;
  welcome_message: string | null;
  environment_name: string | null;
};

const DEFAULTS: Omit<Branding, "organization_id"> = {
  primary_color: "#111114",
  secondary_color: "#6B6B72",
  accent_color: "#2563EB",
  background_color: "#FFFFFF",
  surface_color: "#FFFFFF",
  text_color: "#121214",
  dark_background_color: "#0B0B0E",
  dark_surface_color: "#141418",
  dark_text_color: "#F3F3F5",
  logo_light_url: null,
  logo_dark_url: null,
  favicon_url: null,
  banner_url: null,
  welcome_title: null,
  welcome_message: null,
  environment_name: null,
};

type ColorKey = keyof Pick<
  Branding,
  | "primary_color" | "secondary_color" | "accent_color"
  | "background_color" | "surface_color" | "text_color"
  | "dark_background_color" | "dark_surface_color" | "dark_text_color"
>;

export function BrandingEditor({ organizationId }: { organizationId: string }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">("light");
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
      setBranding({ organization_id: organizationId, ...DEFAULTS, ...((data as any) ?? {}) });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [organizationId]);

  const save = async () => {
    if (!branding) return;
    setBusy(true); setMsg(null);
    const payload = { ...branding, organization_id: organizationId };
    const { error } = await supabase
      .from("organization_branding")
      .upsert(payload, { onConflict: "organization_id" });
    setBusy(false);
    if (error) { setMsg({ kind: "err", text: error.message }); return; }
    // Aplica imediatamente os MESMOS tokens que o frontend consome.
    applyBrandingVars(branding);
    setMsg({ kind: "ok", text: "Marca salva e aplicada à Academy." });
  };

  const upd = <K extends keyof Branding>(k: K, v: Branding[K]) =>
    setBranding((b) => (b ? { ...b, [k]: v } : b));

  const preview = useMemo(() => {
    if (!branding) return null;
    const dark = mode === "dark";
    return {
      canvas: dark ? branding.dark_background_color : branding.background_color,
      surface: dark ? branding.dark_surface_color : branding.surface_color,
      ink: dark ? branding.dark_text_color : branding.text_color,
      accent: branding.accent_color,
      onAccent: accentContrastInk(branding.accent_color),
    };
  }, [branding, mode]);

  if (loading || !branding) return <p className="brand-text-muted text-sm">Carregando marca…</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-7">
        <Group title="Marca" hint="Identidade compartilhada entre os dois temas.">
          <Colors branding={branding} upd={upd} fields={[
            ["primary_color", "Primária", "Tipografia/elementos de marca"],
            ["secondary_color", "Secundária", "Apoio"],
            ["accent_color", "Destaque (ações)", "CTA, seleção, foco, progresso"],
          ]} />
        </Group>

        <Group title="Tema claro" hint="Superfícies neutras — não recebem tinta do destaque.">
          <Colors branding={branding} upd={upd} fields={[
            ["background_color", "Fundo da página", "--ax-canvas"],
            ["surface_color", "Superfície", "--ax-surface (cards, header)"],
            ["text_color", "Texto", "--ax-text"],
          ]} />
        </Group>

        <Group title="Tema escuro" hint="Paleta própria, não é inversão automática do claro.">
          <Colors branding={branding} upd={upd} fields={[
            ["dark_background_color", "Fundo da página", "--ax-canvas (dark)"],
            ["dark_surface_color", "Superfície", "--ax-surface (dark)"],
            ["dark_text_color", "Texto", "--ax-text (dark)"],
          ]} />
        </Group>

        <Group title="Editorial" hint="Logos, favicon e arte de topo do tenant.">
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["logo_light_url", "Logo (sobre fundo claro)"],
              ["logo_dark_url", "Logo (sobre fundo escuro)"],
              ["favicon_url", "Favicon"],
              ["banner_url", "Arte de topo / hero"],
            ] as const).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs brand-text-muted">{label}</span>
                <input
                  value={(branding[key] as string | null) ?? ""}
                  onChange={(e) => upd(key, (e.target.value || null) as any)}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm"
                />
              </label>
            ))}
          </div>
        </Group>

        <Group title="Boas-vindas">
          <div className="grid gap-3">
            <label className="block">
              <span className="text-xs brand-text-muted">Nome do ambiente</span>
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
              <span className="text-xs brand-text-muted">Mensagem</span>
              <textarea
                rows={3}
                value={branding.welcome_message ?? ""}
                onChange={(e) => upd("welcome_message", e.target.value || null)}
                className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm"
              />
            </label>
          </div>
        </Group>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={busy} className="brand-btn rounded-lg px-4 py-2 text-sm disabled:opacity-60">
            {busy ? "Salvando…" : "Salvar marca"}
          </button>
          {msg && (
            <span className={`text-sm ${msg.kind === "ok" ? "text-emerald-500" : "text-red-500"}`}>{msg.text}</span>
          )}
        </div>
      </div>

      {/* PRÉVIA — mesma composição do frontend: header, canvas, card, CTA */}
      {preview && (
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest brand-text-muted">Prévia</p>
            <div className="flex overflow-hidden rounded-full border brand-border text-xs">
              {(["light", "dark"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1 ${mode === m ? "brand-surface-2 font-medium" : "brand-text-muted"}`}
                >
                  {m === "light" ? "Claro" : "Escuro"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border brand-border" style={{ background: preview.canvas, color: preview.ink }}>
            <div
              className="flex items-center justify-between px-4 py-3 text-[13px]"
              style={{ background: preview.surface, borderBottom: `1px solid ${preview.ink}1f` }}
            >
              <span style={{ fontWeight: 500 }}>{branding.environment_name || "Academy"}</span>
              <span style={{ opacity: 0.6 }}>Catálogo</span>
            </div>
            <div className="space-y-3 p-4">
              <p className="text-[11px] uppercase tracking-widest" style={{ opacity: 0.6 }}>Continue estudando</p>
              <p className="text-lg" style={{ fontWeight: 450 }}>Título de exemplo</p>
              <p className="text-[13px]" style={{ opacity: 0.7 }}>
                Texto secundário como aparece nas telas da Academy.
              </p>
              <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: `${preview.ink}22` }}>
                <div style={{ width: "45%", height: "100%", background: preview.accent }} />
              </div>
              <div className="flex gap-2 pt-1">
                <span className="rounded-full px-3 py-1.5 text-[13px]" style={{ background: preview.accent, color: preview.onAccent }}>
                  Continuar
                </span>
                <span
                  className="rounded-full px-3 py-1.5 text-[13px]"
                  style={{ background: preview.surface, border: `1px solid ${preview.ink}24` }}
                >
                  Detalhes
                </span>
              </div>
              <div className="rounded-lg p-3" style={{ background: preview.surface, border: `1px solid ${preview.ink}14` }}>
                <p className="text-[13px]" style={{ fontWeight: 500 }}>Card de curso</p>
                <p className="text-[12px]" style={{ opacity: 0.62 }}>Categoria · 1h 20min</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs brand-text-muted">
            Superfícies vêm exatamente destes campos. O destaque só aparece em ação, seleção, foco e progresso.
          </p>
        </aside>
      )}
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-medium uppercase tracking-widest brand-text-muted">{title}</h3>
      {hint && <p className="mt-1 text-xs brand-text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Colors({
  branding,
  upd,
  fields,
}: {
  branding: Branding;
  upd: <K extends keyof Branding>(k: K, v: Branding[K]) => void;
  fields: readonly (readonly [ColorKey, string, string])[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {fields.map(([key, label, hint]) => (
        <label key={key} className="flex items-center gap-3">
          <input
            type="color"
            value={branding[key]}
            onChange={(e) => upd(key, e.target.value)}
            className="h-10 w-12 shrink-0 rounded border brand-border bg-transparent"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs">{label}</p>
            <p className="text-[11px] brand-text-muted truncate">{hint}</p>
            <input
              value={branding[key]}
              onChange={(e) => upd(key, e.target.value)}
              className="mt-1 w-full rounded px-2 py-1 brand-surface-2 border brand-border text-xs font-mono"
            />
          </div>
        </label>
      ))}
    </div>
  );
}
