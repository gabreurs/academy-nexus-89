import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Membership = { organization_id: string; role: "platform_admin" | "org_admin" | "student"; is_active: boolean };

type Ctx = {
  session: Session | null;
  user: User | null;
  memberships: Membership[];
  loading: boolean;
  isPlatformAdmin: boolean;
  isOrgAdmin: (orgId?: string) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({
  session: null, user: null, memberships: [], loading: true,
  isPlatformAdmin: false, isOrgAdmin: () => false, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) loadMemberships(s.user.id); else setMemberships([]);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadMemberships(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadMemberships = async (uid: string) => {
    const { data } = await supabase.from("organization_memberships")
      .select("organization_id, role, is_active")
      .eq("user_id", uid).eq("is_active", true);
    setMemberships((data as Membership[]) ?? []);
  };

  const isPlatformAdmin = memberships.some((m) => m.role === "platform_admin");
  const isOrgAdmin = (orgId?: string) =>
    memberships.some((m) => m.role === "org_admin" && (!orgId || m.organization_id === orgId));

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, memberships, loading,
      isPlatformAdmin, isOrgAdmin, signOut,
    }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }