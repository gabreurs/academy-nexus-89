CREATE TABLE public.user_course_list (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, course_id)
);

CREATE INDEX idx_user_course_list_user_org ON public.user_course_list (user_id, organization_id);

GRANT SELECT, INSERT, DELETE ON public.user_course_list TO authenticated;
GRANT ALL ON public.user_course_list TO service_role;

ALTER TABLE public.user_course_list ENABLE ROW LEVEL SECURITY;

-- Somente os próprios registros, e somente dentro de uma organização da qual
-- o usuário é membro ativo (impede gravação cross-tenant).
CREATE POLICY "own list select" ON public.user_course_list
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "own list insert" ON public.user_course_list
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "own list delete" ON public.user_course_list
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());