import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { TenantLogo } from "@/components/academy/TenantLogo";

export const Route = createFileRoute("/solicitar-acesso")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Solicitar acesso à Academy" },
      { name: "description", content: "Envie sua solicitação de acesso à Academy da sua administradora e aguarde a aprovação do responsável." },
      { property: "og:title", content: "Solicitar acesso à Academy" },
      { property: "og:description", content: "Envie sua solicitação de acesso à Academy e aguarde a liberação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestAccessPage,
});

function RequestAccessPage() {
  const { tenant } = useTenant();
  const org = tenant?.organization;
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", affiliation: "", message: "" });
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.id) return;
    setState("busy"); setError("");
    const { error: err } = await supabase.from("access_requests").insert({
      organization_id: org.id,
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      affiliation: form.affiliation.trim() || null,
      message: form.message.trim() || null,
      status: "pending",
    });
    if (err) {
      setState("error");
      setError(/duplicate|unique/i.test(err.message)
        ? "Já existe uma solicitação em análise para este e-mail."
        : "Não foi possível enviar sua solicitação agora. Tente novamente.");
      return;
    }
    setState("done");
  };

  return (
    <div className="academy flex min-h-screen items-start justify-center p-6 sm:items-center">
      <div className="ax-panel w-full max-w-[560px] p-8">
        <div className="flex items-center justify-between gap-4">
          <TenantLogo />
          <Link to="/" className="ax-meta hover:opacity-80">← Voltar</Link>
        </div>
        <h1 className="ax-h2 mt-7">Solicitar acesso</h1>
        <p className="ax-body mt-1.5 text-[14px]">
          Envie seus dados para {org?.name ?? "a Academy"}. O responsável analisa a solicitação e libera seu acesso.
        </p>

        {state === "done" ? (
          <div className="mt-7">
            <p className="text-sm font-medium">Solicitação enviada.</p>
            <p className="mt-2 text-sm ax-muted">
              Assim que for aprovada, você recebe um e-mail para criar sua senha e entrar na Academy.
            </p>
            <Link to="/" className="ax-btn mt-5 inline-flex" data-variant="secondary">Voltar ao início</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 grid gap-4">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Nome completo</span>
              <input required value={form.full_name} onChange={set("full_name")} />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">E-mail</span>
              <input required type="email" value={form.email} onChange={set("email")} />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Telefone <span className="ax-muted font-normal">(opcional)</span></span>
              <input value={form.phone} onChange={set("phone")} />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Vínculo / condomínio / empresa</span>
              <input value={form.affiliation} onChange={set("affiliation")} placeholder="Ex.: Síndico — Ed. Portal do Sol" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Informações complementares <span className="ax-muted font-normal">(opcional)</span></span>
              <textarea rows={3} value={form.message} onChange={set("message")} />
            </label>
            {state === "error" && <p className="text-sm" style={{ color: "var(--ax-danger, #b42318)" }}>{error}</p>}
            <button type="submit" className="ax-btn justify-self-start" data-variant="primary" disabled={state === "busy" || !org?.id}>
              {state === "busy" ? "Enviando…" : "Enviar solicitação"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
