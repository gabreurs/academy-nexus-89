CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  affiliation text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX access_requests_org_status_idx ON public.access_requests (organization_id, status, created_at DESC);
CREATE UNIQUE INDEX access_requests_unique_pending ON public.access_requests (organization_id, lower(email)) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.validate_access_request()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  NEW.email := lower(trim(NEW.email));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER access_requests_validate
BEFORE INSERT OR UPDATE ON public.access_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_access_request();

GRANT INSERT ON public.access_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an access request"
ON public.access_requests FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending');

CREATE POLICY "Org admins read their access requests"
ON public.access_requests FOR SELECT TO authenticated
USING (public.has_org_role(auth.uid(), organization_id, 'org_admin') OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Org admins review their access requests"
ON public.access_requests FOR UPDATE TO authenticated
USING (public.has_org_role(auth.uid(), organization_id, 'org_admin') OR public.is_platform_admin(auth.uid()))
WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'org_admin') OR public.is_platform_admin(auth.uid()));