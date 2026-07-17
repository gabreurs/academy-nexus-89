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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md brand-surface rounded-2xl p-8 border brand-border">
        <Link to="/" className="text-sm brand-text-muted">← Voltar</Link>
        <h1 className="mt-4 text-2xl font-semibold">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
        <p className="text-sm brand-text-muted mt-1">SíndicoLab Academy</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5 brand-surface-2 border brand-border outline-none focus:border-white/30" />
          <input type="password" required minLength={6} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5 brand-surface-2 border brand-border outline-none focus:border-white/30" />
          <button disabled={busy} type="submit" className="w-full rounded-lg py-2.5 brand-btn font-medium disabled:opacity-60">
            {busy ? "…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
        <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="mt-4 text-sm brand-text-muted hover:brand-accent">
          {mode === "login" ? "Não tem conta? Criar conta" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );
}