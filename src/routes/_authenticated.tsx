import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantIdentity } from "@/lib/tenant/useTenantIdentity";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { next: location.href } });
    }
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  const { loading, session, hasTenantAccess } = useTenantIdentity();
  const navigate = useNavigate();

  // Cross-tenant identity boundary: the user has a valid Supabase session,
  // but the tenant resolved for this host does not belong to any of their
  // organizations (and they are not platform_admin). Treat them as a
  // visitor on this domain and send them to the public landing.
  useEffect(() => {
    if (!loading && session && !hasTenantAccess) {
      navigate({ to: "/", replace: true });
    }
  }, [loading, session, hasTenantAccess, navigate]);

  if (!loading && session && !hasTenantAccess) return null;
  return <Outlet />;
}