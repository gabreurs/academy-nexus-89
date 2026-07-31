GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.user_org_ids(uuid) TO anon;