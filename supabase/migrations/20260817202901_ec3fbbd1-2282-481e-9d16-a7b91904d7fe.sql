ALTER TABLE public.course_progress
  ADD COLUMN IF NOT EXISTS first_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.course_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_hidden boolean NOT NULL DEFAULT false,
  is_answered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_comments_course_idx ON public.course_comments(course_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_comments TO authenticated;
GRANT ALL ON public.course_comments TO service_role;

ALTER TABLE public.course_comments ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_course_comments_updated ON public.course_comments;
CREATE TRIGGER trg_course_comments_updated BEFORE UPDATE ON public.course_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS course_comments_org_read ON public.course_comments;
CREATE POLICY course_comments_org_read ON public.course_comments
  FOR SELECT TO authenticated
  USING (
    (is_hidden = false AND (
      public.is_platform_admin(auth.uid())
      OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
      OR user_id = auth.uid()
    ))
    OR user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS course_comments_self_write ON public.course_comments;
CREATE POLICY course_comments_self_write ON public.course_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id))
  );

DROP POLICY IF EXISTS course_comments_update ON public.course_comments;
CREATE POLICY course_comments_update ON public.course_comments
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'org_admin'))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'org_admin'))
  );

DROP POLICY IF EXISTS course_comments_delete ON public.course_comments;
CREATE POLICY course_comments_delete ON public.course_comments
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'org_admin'))
  );
