
DROP POLICY IF EXISTS lessons_read ON public.course_lessons;
CREATE POLICY lessons_read ON public.course_lessons FOR SELECT
USING (
  is_platform_admin(auth.uid())
  OR is_preview = true
  OR EXISTS (SELECT 1 FROM course_entitlements e WHERE e.user_id = auth.uid() AND e.course_id = course_lessons.course_id)
  OR EXISTS (SELECT 1 FROM enrollments en WHERE en.user_id = auth.uid() AND en.course_id = course_lessons.course_id)
  OR EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = course_lessons.course_id
      AND c.visibility = 'exclusive'::course_visibility
      AND c.owner_org_id IS NOT NULL
      AND is_org_member(auth.uid(), c.owner_org_id)
  )
);

DROP POLICY IF EXISTS modules_read ON public.course_modules;
CREATE POLICY modules_read ON public.course_modules FOR SELECT
USING (
  is_platform_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM course_entitlements e WHERE e.user_id = auth.uid() AND e.course_id = course_modules.course_id)
  OR EXISTS (SELECT 1 FROM enrollments en WHERE en.user_id = auth.uid() AND en.course_id = course_modules.course_id)
  OR EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = course_modules.course_id
      AND c.visibility = 'exclusive'::course_visibility
      AND c.owner_org_id IS NOT NULL
      AND is_org_member(auth.uid(), c.owner_org_id)
  )
  OR EXISTS (
    SELECT 1 FROM course_lessons l
    WHERE l.module_id = course_modules.id AND l.is_preview = true
  )
);
