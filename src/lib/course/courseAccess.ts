import { supabase } from "@/integrations/supabase/client";

/**
 * Regra CONSOLIDADA de acesso a curso.
 *
 * É a mesma lógica que já existia no player e na página do curso, agora em um
 * único lugar para que nenhuma tela crie uma regra paralela simplificada:
 *
 *  - platform_admin acessa tudo;
 *  - demais usuários precisam de entitlement (B2C) OU enrollment (B2B);
 *  - curso `exclusive` exige, além disso, membership na organização dona
 *    OU o curso estar visível no catálogo contratado de alguma organização
 *    do usuário.
 *
 * O frontend usa isto apenas para decidir o que renderizar; o banco continua
 * sendo a autoridade real (RLS em courses, course_lessons, materials,
 * entitlements, enrollments e catálogo).
 */
export type CourseAccess = {
  allowed: boolean;
  inCatalog: boolean;
  hasGrant: boolean;
};

export async function resolveCourseAccess(params: {
  course: { id: string; visibility: string; owner_org_id: string | null };
  userId: string | null | undefined;
  isPlatformAdmin: boolean;
}): Promise<CourseAccess> {
  const { course, userId, isPlatformAdmin } = params;

  if (isPlatformAdmin) return { allowed: true, inCatalog: true, hasGrant: true };
  if (!userId) return { allowed: false, inCatalog: false, hasGrant: false };

  const [{ data: ent }, { data: enr }, { data: mems }] = await Promise.all([
    supabase.from("course_entitlements").select("id").eq("user_id", userId).eq("course_id", course.id).maybeSingle(),
    supabase.from("enrollments").select("id").eq("user_id", userId).eq("course_id", course.id).maybeSingle(),
    supabase.from("organization_memberships").select("organization_id").eq("user_id", userId).eq("is_active", true),
  ]);

  const hasGrant = !!ent || !!enr;
  const orgIds = (mems ?? []).map((m: any) => m.organization_id);

  let inCatalog = false;
  if (orgIds.length) {
    const { data: cat } = await supabase.from("organization_course_catalog")
      .select("id").eq("course_id", course.id).eq("is_visible", true).in("organization_id", orgIds).limit(1);
    inCatalog = (cat ?? []).length > 0;
  }

  let allowed = hasGrant;
  if (allowed && course.visibility === "exclusive") {
    const ownerOk = !!course.owner_org_id && orgIds.includes(course.owner_org_id);
    allowed = ownerOk || inCatalog;
  }

  return { allowed, inCatalog, hasGrant };
}
