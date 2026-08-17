import { useAuth } from "@/lib/auth/AuthProvider";
import { useTenant } from "@/lib/tenant/TenantProvider";

/**
 * Cross-org identity boundary.
 *
 * Each organization is a distinct white-label tenant (own CNPJ, own contract).
 * A user's session is only "visible" on the tenant of an organization they
 * belong to — or, for platform_admin, on any tenant. On any other tenant we
 * treat the session as if the user were signed out for presentation purposes:
 * the header, avatar, "Sair", and authenticated navigation must all fall back
 * to the public visitor experience.
 *
 * The session itself is not destroyed — it is still valid on the domain where
 * the user actually belongs. Browsers already keep sessions per-origin; we
 * MUST NOT paper over that with a shared parent-domain cookie in production.
 */
export function useTenantIdentity() {
  const { session, memberships, isPlatformAdmin, ready: authReady } = useAuth();
  const { tenant, loading: tenantLoading } = useTenant();

  // Gate só pode decidir quando TUDO está resolvido: sessão + perfil de
  // memberships (portanto platform_admin) + tenant atual.
  const loading = !authReady || tenantLoading;
  const orgId = tenant?.organization?.id ?? null;

  const belongsToTenant = !!orgId && memberships.some(
    (m) => m.organization_id === orgId && m.is_active,
  );

  // Session is "visible" on this tenant only if the user actually belongs to
  // this organization, or is a platform admin (who legitimately manages every
  // white label from any host).
  const hasTenantAccess = isPlatformAdmin || belongsToTenant;
  const visibleSession = session && hasTenantAccess ? session : null;

  return {
    loading,
    session,            // raw session (still valid on its own domain)
    visibleSession,     // session for UI purposes on THIS tenant
    hasTenantAccess,
    belongsToTenant,
    isPlatformAdmin,
  };
}