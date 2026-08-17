import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: typeof s.next === "string" ? s.next : "/inicio" }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const { next } = useSearch({ from: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
        nav({ to: next });
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/inicio" } });
        if (error) throw error;
        toast.success("Conta criada.");
        nav({ to: next });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao autenticar");
    } finally { setBusy(false); }
  };

  return (
    <div className="academy flex min-h-screen items-center justify-center p-6">
      <div className="academy-surface academy-border w-full max-w-md rounded-3xl border p-8">
        <div className="flex items-center justify-between gap-4">
          <TenantLogo />
          <Link to="/" className="academy-subtle text-sm hover:opacity-80">← Voltar</Link>
        </div>
        <h1 className="mt-7 text-[26px] font-semibold" style={{ letterSpacing: "-0.03em" }}>
          {mode === "login" ? "Entrar na Academy" : "Criar sua conta"}
        </h1>
        <p className="academy-muted mt-1.5 text-sm">
          {mode === "login" ? "Acesse seus cursos e continue de onde parou." : "Leva menos de um minuto."}
        </p>
        <form onSubmit={submit} className="mt-7 space-y-3">
          <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 text-[15px]" />
          <input type="password" required minLength={6} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 text-[15px]" />
          <button disabled={busy} type="submit" className="academy-cta w-full">
            {busy ? "…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="academy-muted mt-5 text-sm hover:opacity-80"
        >
          {mode === "login" ? "Não tem conta? Criar conta" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );
}