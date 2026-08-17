import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Membership = { organization_id: string; role: "platform_admin" | "org_admin" | "student"; is_active: boolean };

/**
 * Snapshot atômico de identidade.
 *
 * REGRA: `ready` só é verdadeiro quando sessão E memberships do MESMO usuário
 * já estão neste mesmo objeto de estado. Nunca existe um instante em que
 * `ready === true` com memberships de outro usuário (ou vazias por atraso) —
 * é isso que eliminava a race condition do login: dois caminhos concorrentes
 * (onAuthStateChange + getSession) escreviam `loading = false` isoladamente.
 */
type Snapshot = {
  session: Session | null;
  memberships: Membership[];
  ready: boolean;
};

type Ctx = {
  session: Session | null;
  user: User | null;
  memberships: Membership[];
  /** true enquanto sessão/memberships ainda não formam um par consistente */
  loading: boolean;
  /** inverso de loading; nome explícito para gates */
  ready: boolean;
  isPlatformAdmin: boolean;
  isOrgAdmin: (orgId?: string) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({
  session: null, user: null, memberships: [], loading: true, ready: false,
  isPlatformAdmin: false, isOrgAdmin: () => false, signOut: async () => {},
});

async function fetchMemberships(uid: string): Promise<Membership[]> {
  const { data } = await supabase
    .from("organization_memberships")
    .select("organization_id, role, is_active")
    .eq("user_id", uid)
    .eq("is_active", true);
  return (data as Membership[]) ?? [];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot>({ session: null, memberships: [], ready: false });

  // Contador monotônico: só a resolução mais recente pode escrever o estado.
  // Qualquer resolução iniciada antes é descartada ao voltar do await.
  const genRef = useRef(0);
  // Último usuário totalmente resolvido — evita recarregar memberships em
  // TOKEN_REFRESHED / INITIAL_SESSION do mesmo usuário (e evita piscar loading).
  const resolvedUserRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const resolve = async (session: Session | null) => {
      const uid = session?.user?.id ?? null;

      // Mesmo usuário já resolvido: apenas atualiza os tokens da sessão,
      // mantendo memberships e `ready` — nada de reabrir janela de loading.
      if (uid && uid === resolvedUserRef.current) {
        setSnap((prev) => (prev.ready ? { ...prev, session } : prev));
        return;
      }

      const gen = ++genRef.current;
      resolvedUserRef.current = null;
      // Identidade mudou: volta para "não resolvido" ANTES de qualquer await.
      setSnap({ session, memberships: [], ready: !uid });

      if (!uid) {
        if (gen === genRef.current && mounted) {
          setSnap({ session: null, memberships: [], ready: true });
        }
        return;
      }

      const memberships = await fetchMemberships(uid);
      // Resolução obsoleta (outro login/logout entrou no meio): descarta.
      if (gen !== genRef.current || !mounted) return;
      resolvedUserRef.current = uid;
      setSnap({ session, memberships, ready: true });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      void resolve(s);
    });
    // onAuthStateChange já emite INITIAL_SESSION, mas mantemos o getSession
    // como rede de segurança: o contador de geração garante que o último
    // caminho a começar é o único que pode concluir.
    void supabase.auth.getSession().then(({ data }) => resolve(data.session));

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<Ctx>(() => {
    const isPlatformAdmin = snap.memberships.some((m) => m.role === "platform_admin");
    return {
      session: snap.session,
      user: snap.session?.user ?? null,
      memberships: snap.memberships,
      loading: !snap.ready,
      ready: snap.ready,
      isPlatformAdmin,
      isOrgAdmin: (orgId?: string) =>
        snap.memberships.some((m) => m.role === "org_admin" && (!orgId || m.organization_id === orgId)),
      signOut: async () => { await supabase.auth.signOut(); },
    };
  }, [snap]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
