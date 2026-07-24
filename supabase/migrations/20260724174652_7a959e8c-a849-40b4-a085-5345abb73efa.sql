
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.enforce_course_ownership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.visibility = 'exclusive' AND NEW.owner_org_id IS NULL THEN
    RAISE EXCEPTION 'Exclusive courses require owner_org_id';
  END IF;
  IF NEW.visibility = 'global' AND NEW.owner_org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Global courses must not have owner_org_id';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_org_ids(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_org_ids(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS domains_public_read ON public.organization_domains;

CREATE OR REPLACE FUNCTION public.resolve_tenant_by_hostname(p_hostname text)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  status public.org_status,
  is_platform boolean,
  user_limit integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.slug, o.name, o.status, o.is_platform, o.user_limit, o.created_at, o.updated_at
  FROM public.organizations o
  JOIN public.organization_domains d ON d.organization_id = o.id
  WHERE d.hostname = lower(p_hostname) AND o.status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_tenant_by_hostname(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_tenant_by_hostname(text) TO anon, authenticated, service_role;
