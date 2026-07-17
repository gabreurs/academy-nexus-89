
-- 1. Allow org_admin to update their own organization branding.
CREATE POLICY branding_org_admin_update
  ON public.organization_branding
  FOR UPDATE
  TO authenticated
  USING (has_org_role(auth.uid(), organization_id, 'org_admin'))
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'org_admin'));

-- Also allow insert (in case branding row doesn't exist yet).
CREATE POLICY branding_org_admin_insert
  ON public.organization_branding
  FOR INSERT
  TO authenticated
  WITH CHECK (has_org_role(auth.uid(), organization_id, 'org_admin'));

-- 2. Enforce owner_org_id ↔ visibility consistency on courses via trigger.
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

DROP TRIGGER IF EXISTS trg_enforce_course_ownership ON public.courses;
CREATE TRIGGER trg_enforce_course_ownership
  BEFORE INSERT OR UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_course_ownership();
