import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * "Minha lista" persistida no banco (user_course_list), escopada por
 * organização. Sem localStorage: a lista é dado do usuário e não pode
 * atravessar tenants nem sumir ao trocar de dispositivo.
 */
export function useMyList(userId: string | null | undefined, organizationId: string | null | undefined) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId || !organizationId) { setIds(new Set()); setLoaded(false); return; }
    (async () => {
      const { data } = await supabase
        .from("user_course_list")
        .select("course_id")
        .eq("user_id", userId)
        .eq("organization_id", organizationId);
      if (cancelled) return;
      setIds(new Set((data ?? []).map((r: any) => r.course_id)));
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [userId, organizationId]);

  const toggle = useCallback(async (courseId: string) => {
    if (!userId || !organizationId) return;
    const has = ids.has(courseId);
    // Otimista: reverte se o banco recusar (RLS/cross-tenant).
    setIds((prev) => {
      const next = new Set(prev);
      has ? next.delete(courseId) : next.add(courseId);
      return next;
    });
    const { error } = has
      ? await supabase.from("user_course_list").delete()
          .eq("user_id", userId).eq("organization_id", organizationId).eq("course_id", courseId)
      : await supabase.from("user_course_list")
          .insert({ user_id: userId, organization_id: organizationId, course_id: courseId });
    if (error) {
      setIds((prev) => {
        const next = new Set(prev);
        has ? next.add(courseId) : next.delete(courseId);
        return next;
      });
    }
  }, [ids, userId, organizationId]);

  return { ids, loaded, toggle };
}
