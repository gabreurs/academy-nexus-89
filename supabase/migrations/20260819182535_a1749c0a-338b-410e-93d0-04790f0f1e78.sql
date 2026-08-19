CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT CASE
    WHEN current_user IN ('postgres','supabase_admin','service_role') OR _user_id = auth.uid() THEN EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = _user_id AND role = 'platform_admin' AND is_active = true
    )
    ELSE false
  END;
$function$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT CASE
    WHEN current_user IN ('postgres','supabase_admin','service_role') OR _user_id = auth.uid() THEN EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = _user_id AND organization_id = _org_id AND is_active = true
    )
    ELSE false
  END;
$function$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT CASE
    WHEN current_user IN ('postgres','supabase_admin','service_role') OR _user_id = auth.uid() THEN EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = _user_id AND organization_id = _org_id AND role = _role AND is_active = true
    )
    ELSE false
  END;
$function$;

CREATE OR REPLACE FUNCTION public.user_org_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT organization_id FROM public.organization_memberships
  WHERE user_id = _user_id AND is_active = true
    AND (current_user IN ('postgres','supabase_admin','service_role') OR _user_id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.can_access_course(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT CASE
    WHEN NOT (current_user IN ('postgres','supabase_admin','service_role') OR _user_id = auth.uid()) THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = _course_id
        AND (
          public.is_platform_admin(_user_id)
          OR (
            c.status = 'published'
            AND (
              EXISTS (
                SELECT 1 FROM public.course_entitlements e
                WHERE e.user_id = _user_id AND e.course_id = c.id
                  AND (e.expires_at IS NULL OR e.expires_at > now())
              )
              OR EXISTS (
                SELECT 1 FROM public.enrollments en
                WHERE en.user_id = _user_id AND en.course_id = c.id
                  AND en.status <> 'cancelled'
              )
            )
            AND (
              c.visibility = 'global'
              OR (c.owner_org_id IS NOT NULL AND public.is_org_member(_user_id, c.owner_org_id))
              OR EXISTS (
                SELECT 1 FROM public.organization_course_catalog occ
                WHERE occ.course_id = c.id
                  AND occ.is_visible = true
                  AND occ.organization_id IN (SELECT public.user_org_ids(_user_id))
              )
            )
          )
        )
    )
  END;
$function$;

REVOKE EXECUTE ON FUNCTION public.can_access_course(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, app_role) FROM anon;
