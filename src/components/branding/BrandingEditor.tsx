import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyBrandingVars } from "@/lib/tenant/TenantProvider";
import { accentContrastInk } from "@/lib/tenant/accent";
import { Button, Field, Input, SaveState, Textarea } from "@/components/console/ui";

/**
 * EDITOR DE MARCA = painel do sistema real de tokens.
 *
 * Cada campo corresponde 1:1 a um token consumido pelo frontend:
 *   accent_color            → --tenant-accent (ação, seleção, foco, progresso)
 *   background_color        → --ax-canvas (tema claro)
 *   surface_color           → --ax-surface (tema claro)
 *   text_color              → --ax-text (tema claro)
 *   dark_*                  → mesmos tokens no tema escuro
 * Nenhuma superfície é derivada do accent.
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

const TABS = [
  ["marca", "Marca"],
  ["cores", "Cores"],
  ["claro", "Tema claro"],
  ["escuro", "Tema escuro"],
  ["experiencia", "Experiência"],
] as const;
type Tab = (typeof TABS)[number][0];

export function BrandingEditor({ organizationId }: { organizationId: string }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("marca");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [msg, setMsg] = useState<null | { kind: "ok" | "err" | "busy"; text: string }>(null);

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
      setDirty(false);
      setMsg(null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [organizationId]);

  const save = async () => {
    if (!branding) return;
    setBusy(true); setMsg({ kind: "busy", text: "" });
    const { error } = await supabase
      .from("organization_branding")
      .upsert({ ...branding, organization_id: organizationId }, { onConflict: "organization_id" });
    setBusy(false);
    if (error) { setMsg({ kind: "err", text: error.message }); return; }
    applyBrandingVars(branding);
    setDirty(false);
    setMsg({ kind: "ok", text: "Marca salva e aplicada à Academy." });
  };

  const upd = <K extends keyof Branding>(k: K, v: Branding[K]) => {
    setDirty(true);
    setMsg(null);
    setBranding((b) => (b ? { ...b, [k]: v } : b));
  };

  const preview = useMemo(() => {
    if (!branding) return null;
    const dark = mode === "dark";
    return {
      canvas: dark ? branding.dark_background_color : branding.background_color,
      surface: dark ? branding.dark_surface_color : branding.surface_color,
      ink: dark ? branding.dark_text_color : branding.text_color,
      accent: branding.accent_color,
      onAccent: accentContrastInk(branding.accent_color),
      logo: dark ? branding.logo_dark_url ?? branding.logo_light_url : branding.logo_light_url ?? branding.logo_dark_url,
    };
  }, [branding, mode]);

  if (loading || !branding) {
    return (
      <div className="grid gap-3" aria-busy="true">
        <div className="c-skel h-8 w-48" />
        <div className="c-skel h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-1 border-b c-divide">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="-mb-px border-b-2 px-3 py-2 text-sm"
              style={{
                borderColor: tab === id ? "var(--c-text)" : "transparent",
                color: tab === id ? "var(--c-text)" : "var(--c-muted)",
                fontWeight: tab === id ? 500 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="pt-5">
          {tab === "marca" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ["logo_light_url", "Logo para fundo claro", "Usada no tema claro da Academy."],
                ["logo_dark_url", "Logo para fundo escuro", "Usada no tema escuro e sobre imagens."],
                ["favicon_url", "Favicon", "Ícone da aba do navegador."],
                ["environment_name", "Nome do ambiente", "Aparece no header e no título das páginas."],
              ] as const).map(([key, label, hint]) => (
                <Field key={key} label={label} hint={hint}>
                  <Input
                    value={(branding[key] as string | null) ?? ""}
                    onChange={(e) => upd(key, (e.target.value || null) as any)}
                    placeholder={key === "environment_name" ? "Academy da Empresa" : "https://…"}
                  />
                  {key.endsWith("url") && branding[key] && (
                    <span
                      className="mt-2 flex h-12 items-center rounded-lg border px-3"
                      style={{ borderColor: "var(--c-border-soft)", background: key === "logo_dark_url" ? "#111114" : "#FFFFFF" }}
                    >
                      <img src={branding[key] as string} alt="" className="max-h-8 w-auto max-w-[160px] object-contain" />
                    </span>
                  )}
                </Field>
              ))}
            </div>
          )}

          {tab === "cores" && (
            <Colors
              branding={branding} upd={upd}
              fields={[
                ["accent_color", "Destaque (ações)", "CTA, seleção, foco e progresso"],
                ["primary_color", "Primária", "Elementos de marca e tipografia editorial"],
                ["secondary_color", "Secundária", "Apoio e detalhes"],
              ]}
            />
          )}

          {tab === "claro" && (
            <>
              <p className="mb-4 text-xs c-muted">Superfícies neutras do tema claro. Não recebem tinta do destaque.</p>
              <Colors
                branding={branding} upd={upd}
                fields={[
                  ["background_color", "Fundo da página", "--ax-canvas"],
                  ["surface_color", "Superfície", "--ax-surface (cards, header)"],
                  ["text_color", "Texto", "--ax-text"],
                ]}
              />
            </>
          )}

          {tab === "escuro" && (
            <>
              <p className="mb-4 text-xs c-muted">Paleta própria do escuro — não é inversão automática do claro.</p>
              <Colors
                branding={branding} upd={upd}
                fields={[
                  ["dark_background_color", "Fundo da página", "--ax-canvas (dark)"],
                  ["dark_surface_color", "Superfície", "--ax-surface (dark)"],
                  ["dark_text_color", "Texto", "--ax-text (dark)"],
                ]}
              />
            </>
          )}

          {tab === "experiencia" && (
            <div className="grid gap-4">
              <Field label="Arte de topo / banner" hint="Imagem usada em composições editoriais da Academy.">
                <Input value={branding.banner_url ?? ""} onChange={(e) => upd("banner_url", e.target.value || null)} placeholder="https://…" />
              </Field>
              {branding.banner_url && (
                <img src={branding.banner_url} alt="" className="aspect-[16/6] w-full rounded-lg object-cover" />
              )}
              <Field label="Título de boas-vindas">
                <Input value={branding.welcome_title ?? ""} onChange={(e) => upd("welcome_title", e.target.value || null)} />
              </Field>
              <Field label="Mensagem institucional" hint="Exibida na entrada da Academy corporativa.">
                <Textarea rows={4} value={branding.welcome_message ?? ""} onChange={(e) => upd("welcome_message", e.target.value || null)} />
              </Field>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3 border-t c-divide pt-4">
          <Button variant="primary" onClick={save} disabled={busy || !dirty}>
            {busy ? "Salvando…" : "Salvar marca"}
          </Button>
          <SaveState state={msg} />
          {dirty && !busy && <span className="text-xs c-muted">Alterações não salvas — o preview já reflete.</span>}
        </div>
      </div>

      {preview && (
        <aside className="xl:sticky xl:top-[84px] self-start">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.09em] c-muted">Prévia da Academy</p>
            <div className="flex overflow-hidden rounded-full border text-xs" style={{ borderColor: "var(--c-border)" }}>
              {(["light", "dark"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="px-3 py-1"
                  style={{
                    background: mode === m ? "var(--c-surface-2)" : "transparent",
                    color: mode === m ? "var(--c-text)" : "var(--c-muted)",
                    fontWeight: mode === m ? 500 : 400,
                  }}
                >
                  {m === "light" ? "Claro" : "Escuro"}
                </button>
              ))}
            </div>
          </div>

          <div
            className="mt-3 overflow-hidden rounded-xl border"
            style={{ background: preview.canvas, color: preview.ink, borderColor: "var(--c-border-soft)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 text-[13px]"
              style={{ background: preview.surface, borderBottom: `1px solid ${preview.ink}1f` }}
            >
              <span className="flex items-center gap-2">
                {preview.logo ? (
                  <img src={preview.logo} alt="" className="h-5 w-auto max-w-[110px] object-contain" />
                ) : (
                  <span style={{ fontWeight: 500 }}>{branding.environment_name || "Academy"}</span>
                )}
              </span>
              <span style={{ opacity: 0.55 }}>Catálogo</span>
            </div>

            <div
              className="relative m-3 overflow-hidden rounded-xl"
              style={{ background: branding.banner_url ? undefined : `${preview.ink}0f`, aspectRatio: "16/8" }}
            >
              {branding.banner_url && <img src={branding.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <div className="absolute inset-0" style={{ background: branding.banner_url ? "rgba(0,0,0,.28)" : "transparent" }} />
              <div className="absolute inset-0 flex flex-col justify-end gap-2 p-4" style={{ color: branding.banner_url ? "#fff" : preview.ink }}>
                <p className="text-[15px]" style={{ fontWeight: 500 }}>{branding.welcome_title || "Continue de onde parou"}</p>
                <p className="text-[11.5px]" style={{ opacity: 0.75 }}>
                  {(branding.welcome_message || "Sua trilha de formação continua aqui.").slice(0, 90)}
                </p>
                <span className="mt-1 w-fit rounded-full px-3 py-1.5 text-[12px]" style={{ background: preview.accent, color: preview.onAccent }}>
                  Continuar
                </span>
              </div>
            </div>

            <div className="space-y-2 px-4 pb-4">
              <p className="text-[10.5px] uppercase tracking-[0.09em]" style={{ opacity: 0.55 }}>Em andamento</p>
              <div className="grid grid-cols-2 gap-2">
                {[62, 18].map((p) => (
                  <div key={p} className="rounded-lg p-2.5" style={{ background: preview.surface, border: `1px solid ${preview.ink}14` }}>
                    <div className="mb-2 rounded" style={{ aspectRatio: "16/9", background: `${preview.ink}12` }} />
                    <p className="text-[12px]" style={{ fontWeight: 500 }}>Curso de exemplo</p>
                    <p className="text-[11px]" style={{ opacity: 0.6 }}>Categoria · 1h 20min</p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: `${preview.ink}20` }}>
                      <div style={{ width: `${p}%`, height: "100%", background: preview.accent }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] c-muted">
            As superfícies vêm exatamente destes campos. O destaque só aparece em ação, seleção, foco e progresso.
          </p>
        </aside>
      )}
    </div>
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
        <div key={key} className="rounded-xl border p-3" style={{ borderColor: "var(--c-border-soft)" }}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              aria-label={label}
              value={branding[key]}
              onChange={(e) => upd(key, e.target.value)}
              className="h-10 w-12 shrink-0 cursor-pointer rounded border bg-transparent"
              style={{ borderColor: "var(--c-border)" }}
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{label}</p>
              <p className="truncate text-[11px] c-muted">{hint}</p>
            </div>
          </div>
          <input
            value={branding[key]}
            onChange={(e) => upd(key, e.target.value)}
            aria-label={`${label} em hexadecimal`}
            className="c-input mt-2 font-mono text-xs uppercase"
          />
        </div>
      ))}
    </div>
  );
}
