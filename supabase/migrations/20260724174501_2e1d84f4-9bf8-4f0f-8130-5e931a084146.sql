DROP POLICY IF EXISTS materials_read ON public.course_materials;
CREATE POLICY materials_read ON public.course_materials
FOR SELECT
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.course_entitlements e
    WHERE e.user_id = auth.uid() AND e.course_id = course_materials.course_id
  )
  OR EXISTS (
    SELECT 1 FROM public.enrollments en
    WHERE en.user_id = auth.uid() AND en.course_id = course_materials.course_id
  )
);