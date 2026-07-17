
-- 1. Modules/Lessons read: mirror courses_public_read
DROP POLICY IF EXISTS modules_read ON public.course_modules;
CREATE POLICY modules_read ON public.course_modules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_modules.course_id
      AND (
        (c.status = 'published' AND (
          c.visibility = 'global'
          OR (c.visibility = 'exclusive' AND auth.uid() IS NOT NULL AND (
            public.is_platform_admin(auth.uid())
            OR public.is_org_member(auth.uid(), c.owner_org_id)
          ))
        ))
        OR (auth.uid() IS NOT NULL AND public.is_platform_admin(auth.uid()))
      )
  )
);

DROP POLICY IF EXISTS lessons_read ON public.course_lessons;
CREATE POLICY lessons_read ON public.course_lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_lessons.course_id
      AND (
        (c.status = 'published' AND (
          c.visibility = 'global'
          OR (c.visibility = 'exclusive' AND auth.uid() IS NOT NULL AND (
            public.is_platform_admin(auth.uid())
            OR public.is_org_member(auth.uid(), c.owner_org_id)
          ))
        ))
        OR (auth.uid() IS NOT NULL AND public.is_platform_admin(auth.uid()))
      )
  )
);

-- 2. Restrict org_admin from assigning platform_admin role
DROP POLICY IF EXISTS memberships_admin_write ON public.organization_memberships;
CREATE POLICY memberships_admin_write ON public.organization_memberships FOR ALL
USING (
  public.is_platform_admin(auth.uid())
  OR public.has_org_role(auth.uid(), organization_id, 'org_admin')
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR (
    public.has_org_role(auth.uid(), organization_id, 'org_admin')
    AND role IN ('org_admin', 'student')
  )
);

-- 3. Enrollments: require course in the user's org catalog (visible), or platform_admin, or existing entitlement
DROP POLICY IF EXISTS enrollments_self_write ON public.enrollments;
CREATE POLICY enrollments_self_write ON public.enrollments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_course_catalog occ
      JOIN public.organization_memberships m
        ON m.organization_id = occ.organization_id
      WHERE occ.course_id = enrollments.course_id
        AND occ.is_visible = true
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.course_entitlements ce
      WHERE ce.user_id = auth.uid() AND ce.course_id = enrollments.course_id
    )
  )
);

-- 4. reviews/comments insert: validate org membership
DROP POLICY IF EXISTS reviews_self_write ON public.course_reviews;
CREATE POLICY reviews_self_write ON public.course_reviews FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id))
);

DROP POLICY IF EXISTS comments_self_write ON public.lesson_comments;
CREATE POLICY comments_self_write ON public.lesson_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id))
);

-- 7. Public anon read on organization_course_catalog (only visible entries for published+global courses)
DROP POLICY IF EXISTS catalog_public_read ON public.organization_course_catalog;
CREATE POLICY catalog_public_read ON public.organization_course_catalog FOR SELECT
USING (
  is_visible = true
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = organization_course_catalog.course_id
      AND c.status = 'published'
      AND (
        c.visibility = 'global'
        OR (auth.uid() IS NOT NULL AND (
          public.is_platform_admin(auth.uid())
          OR public.is_org_member(auth.uid(), c.owner_org_id)
          OR public.is_org_member(auth.uid(), organization_course_catalog.organization_id)
        ))
      )
  )
);

-- Ensure anon has SELECT grants where policies now allow it
GRANT SELECT ON public.course_modules TO anon;
GRANT SELECT ON public.course_lessons TO anon;
GRANT SELECT ON public.organization_course_catalog TO anon;
