
-- =========================================================================
-- SíndicoLab Academy — Schema + RLS + Grants (multi-tenant)
-- =========================================================================

-- Enums
CREATE TYPE public.app_role AS ENUM ('platform_admin', 'org_admin', 'student');
CREATE TYPE public.org_status AS ENUM ('active', 'suspended');
CREATE TYPE public.course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.course_visibility AS ENUM ('global', 'exclusive');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE public.enrollment_status AS ENUM ('active', 'completed', 'cancelled');

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================================
-- ORGANIZATIONS
-- =========================================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status public.org_status NOT NULL DEFAULT 'active',
  is_platform BOOLEAN NOT NULL DEFAULT false,
  user_limit INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.organization_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_domains_hostname ON public.organization_domains(hostname);
GRANT SELECT ON public.organization_domains TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.organization_domains TO authenticated;
GRANT ALL ON public.organization_domains TO service_role;

CREATE TABLE public.organization_branding (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  logo_light_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  banner_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#6D28D9',
  secondary_color TEXT NOT NULL DEFAULT '#1F2937',
  accent_color TEXT NOT NULL DEFAULT '#A855F7',
  background_color TEXT NOT NULL DEFAULT '#0B0B10',
  surface_color TEXT NOT NULL DEFAULT '#141420',
  text_color TEXT NOT NULL DEFAULT '#F5F5F7',
  welcome_title TEXT,
  welcome_message TEXT,
  environment_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organization_branding TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.organization_branding TO authenticated;
GRANT ALL ON public.organization_branding TO service_role;
CREATE TRIGGER trg_org_branding_updated BEFORE UPDATE ON public.organization_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- PROFILES + MEMBERSHIPS
-- =========================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id, role)
);
CREATE INDEX idx_memberships_user ON public.organization_memberships(user_id);
CREATE INDEX idx_memberships_org ON public.organization_memberships(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_memberships TO authenticated;
GRANT ALL ON public.organization_memberships TO service_role;
CREATE TRIGGER trg_memberships_updated BEFORE UPDATE ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- SECURITY DEFINER helpers (evitam recursão RLS)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND role = 'platform_admin' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND organization_id = _org_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_org_ids(_user_id UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_memberships
  WHERE user_id = _user_id AND is_active = true;
$$;

-- =========================================================================
-- INVITES
-- =========================================================================
CREATE TABLE public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'student',
  token TEXT NOT NULL UNIQUE,
  status public.invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invites_org ON public.organization_invites(organization_id);
CREATE INDEX idx_invites_email ON public.organization_invites(email);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invites TO authenticated;
GRANT ALL ON public.organization_invites TO service_role;

-- =========================================================================
-- COURSES
-- =========================================================================
CREATE TABLE public.course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.course_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_categories TO authenticated;
GRANT ALL ON public.course_categories TO service_role;

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  cover_url TEXT,
  banner_url TEXT,
  instructor_name TEXT,
  instructor_bio TEXT,
  category_id UUID REFERENCES public.course_categories(id),
  level TEXT DEFAULT 'iniciante',
  duration_minutes INT DEFAULT 0,
  status public.course_status NOT NULL DEFAULT 'draft',
  visibility public.course_visibility NOT NULL DEFAULT 'global',
  owner_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_required BOOLEAN NOT NULL DEFAULT false,
  external_checkout_url TEXT,
  trailer_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_courses_owner ON public.courses(owner_org_id);
CREATE INDEX idx_courses_status ON public.courses(status);
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_modules_course ON public.course_modules(course_id);
GRANT SELECT ON public.course_modules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT ALL ON public.course_modules TO service_role;

CREATE TABLE public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  duration_seconds INT DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, slug)
);
CREATE INDEX idx_lessons_module ON public.course_lessons(module_id);
CREATE INDEX idx_lessons_course ON public.course_lessons(course_id);
GRANT SELECT ON public.course_lessons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;
GRANT ALL ON public.course_lessons TO service_role;

CREATE TABLE public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  kind TEXT DEFAULT 'pdf',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_materials TO authenticated;
GRANT ALL ON public.course_materials TO service_role;

-- =========================================================================
-- CATALOG + ENTITLEMENTS + ENROLLMENTS
-- =========================================================================
CREATE TABLE public.organization_course_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  auto_enroll BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_course_catalog TO authenticated;
GRANT ALL ON public.organization_course_catalog TO service_role;

CREATE TABLE public.course_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);
CREATE INDEX idx_entitlements_user ON public.course_entitlements(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_entitlements TO authenticated;
GRANT ALL ON public.course_entitlements TO service_role;

CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  status public.enrollment_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);
CREATE INDEX idx_enrollments_user ON public.enrollments(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;

-- =========================================================================
-- PROGRESS
-- =========================================================================
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  position_seconds INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
CREATE TRIGGER trg_lesson_progress_updated BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  percent INT NOT NULL DEFAULT 0,
  last_lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE SET NULL,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_progress TO authenticated;
GRANT ALL ON public.course_progress TO service_role;
CREATE TRIGGER trg_course_progress_updated BEFORE UPDATE ON public.course_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- REVIEWS + COMMENTS
-- =========================================================================
CREATE TABLE public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_reviews TO authenticated;
GRANT ALL ON public.course_reviews TO service_role;
CREATE TRIGGER trg_course_reviews_updated BEFORE UPDATE ON public.course_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lesson_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  is_answered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_lesson ON public.lesson_comments(lesson_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_comments TO authenticated;
GRANT ALL ON public.lesson_comments TO service_role;
CREATE TRIGGER trg_lesson_comments_updated BEFORE UPDATE ON public.lesson_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- AUDIT
-- =========================================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_course_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE POLICY orgs_public_read ON public.organizations FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY orgs_platform_admin_all ON public.organizations FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

-- Domains + Branding: leitura pública (resolução de tenant)
CREATE POLICY domains_public_read ON public.organization_domains FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY domains_admin_write ON public.organization_domains FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY branding_public_read ON public.organization_branding FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY branding_admin_write ON public.organization_branding FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

-- Profiles
CREATE POLICY profiles_self_read ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_platform_admin(auth.uid()));
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_self_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Memberships
CREATE POLICY memberships_self_read ON public.organization_memberships FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR public.has_org_role(auth.uid(), organization_id, 'org_admin')
  );
CREATE POLICY memberships_admin_write ON public.organization_memberships FOR ALL TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_org_role(auth.uid(), organization_id, 'org_admin')
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.has_org_role(auth.uid(), organization_id, 'org_admin')
  );

-- Invites
CREATE POLICY invites_admin_read ON public.organization_invites FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_org_role(auth.uid(), organization_id, 'org_admin')
  );
CREATE POLICY invites_admin_write ON public.organization_invites FOR ALL TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_org_role(auth.uid(), organization_id, 'org_admin')
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.has_org_role(auth.uid(), organization_id, 'org_admin')
  );

-- Categories
CREATE POLICY categories_public_read ON public.course_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY categories_admin_write ON public.course_categories FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

-- Courses: leitura pública para curso publicado global; exclusivos só membros da org dona
CREATE POLICY courses_public_read ON public.courses FOR SELECT TO anon, authenticated
  USING (
    status = 'published' AND (
      visibility = 'global'
      OR (visibility = 'exclusive' AND (
        auth.uid() IS NOT NULL AND (
          public.is_platform_admin(auth.uid())
          OR public.is_org_member(auth.uid(), owner_org_id)
        )
      ))
    )
    OR (auth.uid() IS NOT NULL AND public.is_platform_admin(auth.uid()))
  );
CREATE POLICY courses_admin_write ON public.courses FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

-- Modules & lessons herdam visibilidade do curso
CREATE POLICY modules_read ON public.course_modules FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id));
CREATE POLICY modules_admin_write ON public.course_modules FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY lessons_read ON public.course_lessons FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id));
CREATE POLICY lessons_admin_write ON public.course_lessons FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY materials_read ON public.course_materials FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.course_entitlements e WHERE e.user_id = auth.uid() AND e.course_id = course_id)
    OR EXISTS (SELECT 1 FROM public.enrollments en WHERE en.user_id = auth.uid() AND en.course_id = course_id)
  );
CREATE POLICY materials_admin_write ON public.course_materials FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

-- Catálogo por org
CREATE POLICY catalog_org_read ON public.organization_course_catalog FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.is_org_member(auth.uid(), organization_id)
  );
CREATE POLICY catalog_admin_write ON public.organization_course_catalog FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

-- Entitlements
CREATE POLICY entitlements_self_read ON public.course_entitlements FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'org_admin'))
  );
CREATE POLICY entitlements_admin_write ON public.course_entitlements FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

-- Enrollments
CREATE POLICY enrollments_self_read ON public.enrollments FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'org_admin'))
  );
CREATE POLICY enrollments_self_write ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY enrollments_self_update ON public.enrollments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- Lesson progress (privado)
CREATE POLICY lp_self_all ON public.lesson_progress FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid());

CREATE POLICY cp_self_all ON public.course_progress FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid());

-- Reviews
CREATE POLICY reviews_org_read ON public.course_reviews FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
    OR user_id = auth.uid()
  );
CREATE POLICY reviews_self_write ON public.course_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY reviews_self_update ON public.course_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY reviews_self_delete ON public.course_reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- Comments
CREATE POLICY comments_org_read ON public.lesson_comments FOR SELECT TO authenticated
  USING (
    is_hidden = false AND (
      public.is_platform_admin(auth.uid())
      OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
      OR user_id = auth.uid()
    )
    OR user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
  );
CREATE POLICY comments_self_write ON public.lesson_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY comments_self_update ON public.lesson_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));
CREATE POLICY comments_self_delete ON public.lesson_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- Audit logs
CREATE POLICY audit_admin_read ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));
