-- 1) Fonte de entrega protegida: o endereço real do conteúdo sai de `courses`
--    (que tem leitura pública de metadados) e passa a viver em uma tabela
--    própria, sem qualquer leitura anônima.
CREATE TABLE IF NOT EXISTS public.course_delivery_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL UNIQUE REFERENCES public.courses(id) ON DELETE CASCADE,
  delivery_type text NOT NULL DEFAULT 'learning_studio_embed',
  embed_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.course_delivery_sources TO authenticated;
GRANT ALL ON public.course_delivery_sources TO service_role;
-- anon NÃO recebe grant algum: visitante não pode sequer tentar ler.

ALTER TABLE public.course_delivery_sources ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_course_delivery_sources_updated
  BEFORE UPDATE ON public.course_delivery_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Migra os endereços existentes e apaga a coluna pública.
INSERT INTO public.course_delivery_sources (course_id, delivery_type, embed_url)
SELECT id, delivery_type, embed_url
FROM public.courses
WHERE embed_url IS NOT NULL AND btrim(embed_url) <> ''
ON CONFLICT (course_id) DO UPDATE SET embed_url = EXCLUDED.embed_url;

ALTER TABLE public.courses DROP COLUMN IF EXISTS embed_url;

-- 3) A "aula ponteiro" criada para os cursos de embed guardava a mesma URL em
--    course_lessons.video_url COM is_preview = true — leitura pública pela
--    policy lessons_read. Isso vazava o conteúdo completo como se fosse prévia.
UPDATE public.course_lessons l
SET video_url = NULL, is_preview = false
FROM public.courses c
WHERE c.id = l.course_id
  AND c.delivery_type = 'learning_studio_embed';

-- 4) Regra REAL de acesso ao curso, no banco (mesma do frontend).
CREATE OR REPLACE FUNCTION public.can_access_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = _course_id
      AND (
        public.is_platform_admin(_user_id)
        OR (
          c.status = 'published'
          -- direito individual: entitlement (B2C) ou enrollment (B2B)
          AND (
            EXISTS (
              SELECT 1 FROM public.course_entitlements e
              WHERE e.user_id = _user_id AND e.course_id = c.id
                AND (e.expires_at IS NULL OR e.expires_at > now())
            )
            OR EXISTS (
              SELECT 1 FROM public.enrollments en
              WHERE en.user_id = _user_id AND en.course_id = c.id
                AND en.status <> 'cancelled'
            )
          )
          -- e o curso precisa estar realmente disponível para alguma
          -- organização ativa do usuário (ou ser global)
          AND (
            c.visibility = 'global'
            OR (c.owner_org_id IS NOT NULL AND public.is_org_member(_user_id, c.owner_org_id))
            OR EXISTS (
              SELECT 1 FROM public.organization_course_catalog occ
              WHERE occ.course_id = c.id
                AND occ.is_visible = true
                AND occ.organization_id IN (SELECT public.user_org_ids(_user_id))
            )
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_course(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_course(uuid, uuid) TO authenticated, service_role;

-- 5) RLS da fonte de entrega: nada de `auth.uid() is not null`.
CREATE POLICY "delivery_source_read_authorized" ON public.course_delivery_sources
  FOR SELECT TO authenticated
  USING (public.can_access_course(auth.uid(), course_id));

CREATE POLICY "delivery_source_admin_write" ON public.course_delivery_sources
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));