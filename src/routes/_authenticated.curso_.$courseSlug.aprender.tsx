import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { VimeoPlayer } from "@/components/player/VimeoPlayer";
import { LessonComments } from "@/components/course/LessonComments";

export const Route = createFileRoute("/_authenticated/curso_/$courseSlug/aprender")({ ssr: false, component: Player });

function Player() {
  const { courseSlug } = useParams({ from: "/_authenticated/curso_/$courseSlug/aprender" });
  const { session, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [denied, setDenied] = useState(false);
  const lastPositionRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("courses").select("*").eq("slug", courseSlug).maybeSingle();
      if (!c) { setAccessChecked(true); setDenied(true); return; }
      setCourse(c);

      // Access gate: platform_admin bypass; else must have entitlement OR enrollment.
      // For exclusive courses, also require membership in owner org OR catalog entry in user's org.
      let allowed = isPlatformAdmin;
      if (!allowed && session?.user) {
        const uid = session.user.id;
        const [{ data: ent }, { data: enr }] = await Promise.all([
          supabase.from("course_entitlements").select("id").eq("user_id", uid).eq("course_id", c.id).maybeSingle(),
          supabase.from("enrollments").select("id").eq("user_id", uid).eq("course_id", c.id).maybeSingle(),
        ]);
        allowed = !!ent || !!enr;
        if (allowed && c.visibility === "exclusive") {
          const { data: mems } = await supabase.from("organization_memberships")
            .select("organization_id").eq("user_id", uid).eq("is_active", true);
          const orgIds = (mems ?? []).map((m: any) => m.organization_id);
          const ownerOk = c.owner_org_id && orgIds.includes(c.owner_org_id);
          let catalogOk = false;
          if (!ownerOk && orgIds.length) {
            const { data: cat } = await supabase.from("organization_course_catalog")
              .select("id").eq("course_id", c.id).eq("is_visible", true).in("organization_id", orgIds).limit(1);
            catalogOk = (cat ?? []).length > 0;
          }
          allowed = ownerOk || catalogOk;
        }
      }
      if (!allowed) {
        setAccessChecked(true);
        setDenied(true);
        navigate({ to: "/curso/$courseSlug", params: { courseSlug }, search: { denied: 1 } as any, replace: true });
        return;
      }
      setAccessChecked(true);

      const { data: mods } = await supabase.from("course_modules").select("*, course_lessons(*)").eq("course_id", c.id).order("sort_order");
      setModules((mods as any[]) ?? []);
      const { data: cp } = await supabase.from("course_progress").select("*").eq("user_id", session!.user.id).eq("course_id", c.id).maybeSingle();
      const firstLesson = ((mods as any[]) ?? [])[0]?.course_lessons?.sort((a: any, b: any) => a.sort_order - b.sort_order)?.[0]?.id;
      setCurrentLessonId(cp?.last_lesson_id ?? firstLesson ?? null);
    })();
  }, [courseSlug, session?.user?.id, isPlatformAdmin]);

  const flatLessons = useMemo(
    () => modules.flatMap((m) => (m.course_lessons ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)),
    [modules],
  );

  const currentIndex = flatLessons.findIndex((l: any) => l.id === currentLessonId);
  const current = flatLessons[currentIndex];
  const [startAt, setStartAt] = useState(0);

  useEffect(() => {
    lastPositionRef.current = 0;
    (async () => {
      if (!session?.user || !current) { setStartAt(0); return; }
      const { data: lp } = await supabase.from("lesson_progress")
        .select("position_seconds").eq("user_id", session.user.id).eq("lesson_id", current.id).maybeSingle();
      setStartAt(lp?.position_seconds ?? 0);
    })();
  }, [current?.id, session?.user?.id]);

  const upsertProgress = async (opts: { position?: number; completed?: boolean }) => {
    if (!session || !course || !current) return;
    await supabase.from("lesson_progress").upsert({
      user_id: session.user.id, lesson_id: current.id, course_id: course.id,
      position_seconds: Math.floor(opts.position ?? 0),
      completed_at: opts.completed ? new Date().toISOString() : null,
    }, { onConflict: "user_id,lesson_id" });
    const completed = await supabase.from("lesson_progress").select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id).eq("course_id", course.id).not("completed_at", "is", null);
    const percent = flatLessons.length ? Math.round(((completed.count ?? 0) / flatLessons.length) * 100) : 0;
    await supabase.from("course_progress").upsert({
      user_id: session.user.id, course_id: course.id,
      percent, last_lesson_id: current.id, last_accessed_at: new Date().toISOString(),
    }, { onConflict: "user_id,course_id" });
  };

  if (denied)
    return <div className="player-shell p-8"><p className="player-muted">Acesso negado. Redirecionando…</p></div>;
  if (!accessChecked || !course || !current)
    return <div className="player-shell p-8"><p className="player-muted">Carregando…</p></div>;

  return (
    <div className="player-shell grid lg:grid-cols-[1fr_360px]">
      <div className="p-4 lg:p-8">
        <Link
          to="/curso/$courseSlug"
          params={{ courseSlug }}
          className="text-xs uppercase tracking-widest player-muted hover:opacity-80"
        >
          ← {course.title}
        </Link>
        <div className="mt-4 aspect-video player-surface rounded-2xl overflow-hidden border player-border">
          <VimeoPlayer
            videoUrl={current.video_url}
            startAt={startAt}
            onProgress={(sec) => { lastPositionRef.current = sec; upsertProgress({ position: sec }); }}
            onEnded={() => upsertProgress({ position: 0, completed: true })}
          />
        </div>
        <h1 className="mt-6 font-display text-2xl md:text-3xl">{current.title}</h1>
        {current.description && <p className="mt-2 player-muted">{current.description}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            disabled={currentIndex <= 0}
            onClick={() => setCurrentLessonId(flatLessons[currentIndex - 1].id)}
            className="px-4 py-2 rounded-full player-surface border player-border disabled:opacity-40"
          >
            ← Anterior
          </button>
          <button
            onClick={() => upsertProgress({ position: lastPositionRef.current, completed: true })}
            className="player-cta"
          >
            Marcar como concluída
          </button>
          <button
            disabled={currentIndex >= flatLessons.length - 1}
            onClick={() => setCurrentLessonId(flatLessons[currentIndex + 1].id)}
            className="px-4 py-2 rounded-full player-surface border player-border disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
        <LessonComments courseId={course.id} lessonId={current.id} />
      </div>
      <aside className="player-surface border-l player-border p-5 overflow-y-auto max-h-screen">
        <p className="text-xs player-muted uppercase tracking-widest mb-4">Conteúdo</p>
        {modules.map((m) => (
          <div key={m.id} className="mb-5">
            <p className="text-sm font-display mb-2">{m.title}</p>
            <ul className="space-y-0.5">
              {(m.course_lessons ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((l: any) => (
                <li key={l.id}>
                  <button
                    onClick={() => setCurrentLessonId(l.id)}
                    className={
                      "w-full text-left text-sm px-3 py-2 rounded-lg transition " +
                      (l.id === currentLessonId
                        ? "player-cta"
                        : "hover:bg-white/5 player-muted")
                    }
                    style={l.id === currentLessonId ? undefined : { color: "var(--player-ink)" }}
                  >
                    {l.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
    </div>
  );
}