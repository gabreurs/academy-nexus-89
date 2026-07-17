
-- 1) Deduplicate memberships keeping the highest-privilege role (org_admin > student; platform_admin stays).
WITH ranked AS (
  SELECT id, organization_id, user_id, role,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, user_id
      ORDER BY CASE role
        WHEN 'platform_admin' THEN 1
        WHEN 'org_admin' THEN 2
        WHEN 'student' THEN 3
        ELSE 4 END,
        created_at ASC
    ) AS rn
  FROM public.organization_memberships
)
DELETE FROM public.organization_memberships m
USING ranked r
WHERE m.id = r.id AND r.rn > 1;

-- 2) Swap unique constraint from (org, user, role) → (org, user).
ALTER TABLE public.organization_memberships
  DROP CONSTRAINT IF EXISTS organization_memberships_organization_id_user_id_role_key;

ALTER TABLE public.organization_memberships
  ADD CONSTRAINT organization_memberships_organization_id_user_id_key
  UNIQUE (organization_id, user_id);

-- 3) Allow org admins to read profiles of members that share one of their organizations.
DROP POLICY IF EXISTS profiles_org_admin_read ON public.profiles;
CREATE POLICY profiles_org_admin_read ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_memberships target
    JOIN public.organization_memberships caller
      ON caller.organization_id = target.organization_id
    WHERE target.user_id = profiles.id
      AND target.is_active = true
      AND caller.user_id = auth.uid()
      AND caller.role = 'org_admin'
      AND caller.is_active = true
  )
);
