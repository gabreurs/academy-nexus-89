import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AcademyCourse } from "@/components/academy/types";

type Progress = { percent: number; open_count?: number; last_accessed_at?: string; updated_at?: string };

const COURSE_COLUMNS =
  "id, slug, title, subtitle, description, cover_url, banner_url, instructor_name, duration_minutes, category_id, level, is_featured, is_required, visibility, created_at";

/**
 * Fonte única de dados das superfícies tenant-facing.
 * Respeita exatamente o catálogo da organização + entitlements do usuário —
 * nenhuma regra de acesso é alterada aqui, só reaproveitada.
 */
export function useAcademyCatalog(organizationId?: string | null, userId?: string | null) {
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [purchased, setPurchased] = useState<AcademyCourse[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; sort_order: number }[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("course_categories")
      .select("id, name, sort_order")
      .order("sort_order")
      .then(({ data }) => setCategories((data as any[]) ?? []));
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: cat } = await supabase
        .from("organization_course_catalog")
        .select("course_id")
        .eq("organization_id", organizationId)
        .eq("is_visible", true);
      const ids = (cat ?? []).map((c: any) => c.course_id);
      const { data: cs } = ids.length
        ? await supabase.from("courses").select(COURSE_COLUMNS).in("id", ids).eq("status", "published")
        : { data: [] as any[] };
      if (cancelled) return;
      setCourses((cs as AcademyCourse[]) ?? []);

      let entIds: string[] = [];
      if (userId) {
        const { data: ents } = await supabase.from("course_entitlements").select("course_id").eq("user_id", userId);
        entIds = Array.from(new Set((ents ?? []).map((e: any) => e.course_id))).filter((id) => !ids.includes(id));
        const { data: pcs } = entIds.length
          ? await supabase.from("courses").select(COURSE_COLUMNS).in("id", entIds).eq("status", "published")
          : { data: [] as any[] };
        if (cancelled) return;
        setPurchased((pcs as AcademyCourse[]) ?? []);

        const { data: pr } = await supabase.from("course_progress").select("*").eq("user_id", userId);
        const map: Record<string, Progress> = {};
        (pr ?? []).forEach((p: any) => (map[p.course_id] = p));
        if (cancelled) return;
        setProgress(map);
      }

      const allIds = Array.from(new Set([...ids, ...entIds]));
      if (allIds.length) {
        const { data: rv } = await supabase.from("course_reviews").select("course_id, rating").in("course_id", allIds);
        const agg: Record<string, { sum: number; count: number }> = {};
        (rv ?? []).forEach((r: any) => {
          const a = (agg[r.course_id] ??= { sum: 0, count: 0 });
          a.sum += r.rating;
          a.count += 1;
        });
        if (cancelled) return;
        setRatings(Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, { avg: v.sum / v.count, count: v.count }])));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [organizationId, userId]);

  const categoryNameById = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [categories]);

  const allCourses = useMemo(() => [...courses, ...purchased], [courses, purchased]);

  const categoryRails = useMemo(
    () =>
      categories
        .map((cat) => ({ cat, list: courses.filter((c) => c.category_id === cat.id) }))
        .filter((r) => r.list.length > 0),
    [categories, courses],
  );

  const continueList = useMemo(
    () =>
      allCourses
        .filter((c) => {
          const pr = progress[c.id];
          if (!pr) return false;
          const p = pr.percent ?? 0;
          if (p >= 100) return false;
          return p > 0 || (pr.open_count ?? 0) > 0;
        })
        .sort((a, b) =>
          (progress[b.id]?.last_accessed_at ?? progress[b.id]?.updated_at ?? "").localeCompare(
            progress[a.id]?.last_accessed_at ?? progress[a.id]?.updated_at ?? "",
          ),
        ),
    [allCourses, progress],
  );

  const featured = useMemo(() => courses.filter((c) => c.is_featured), [courses]);
  const newest = useMemo(
    () => [...courses].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 12),
    [courses],
  );

  return {
    loading,
    courses,
    purchased,
    allCourses,
    categories,
    categoryNameById,
    categoryRails,
    continueList,
    featured,
    newest,
    progress,
    ratings,
  };
}