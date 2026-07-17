import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/curso_/$courseSlug/aprender")({ ssr: false, component: Player });

function Player() {
  const { courseSlug } = useParams({ from: "/_authenticated/curso_/$courseSlug/aprender" });
  const { session } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("courses").select("*").eq("slug", courseSlug).maybeSingle();
      if (!c) return;
      setCourse(c);
      const { data: mods } = await supabase.from("course_modules").select("*, course_lessons(*)").eq("course_id", c.id).order("sort_order");
      setModules((mods as any[]) ?? []);
      const { data: cp } = await supabase.from("course_progress").select("*").eq("user_id", session!.user.id).eq("course_id", c.id).maybeSingle();
      const firstLesson = ((mods as any[]) ?? [])[0]?.course_lessons?.sort((a: any, b: any) => a.sort_order - b.sort_order)?.[0]?.id;
      setCurrentLessonId(cp?.last_lesson_id ?? firstLesson ?? null);
    })();
  }, [courseSlug]);

  const flatLessons = useMemo(
    () => modules.flatMap((m) => (m.course_lessons ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)),
    [modules],
  );

  const currentIndex = flatLessons.findIndex((l: any) => l.id === currentLessonId);
  const current = flatLessons[currentIndex];

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

  useEffect(() => {
    if (!current) return;
    const iv = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) upsertProgress({ position: videoRef.current.currentTime });
    }, 10000);
    return () => clearInterval(iv);
  }, [current?.id]);

  if (!course || !current) return <div className="min-h-screen p-8">Carregando…</div>;

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_360px]">
      <div className="p-4 lg:p-8">
        <Link to="/curso/$courseSlug" params={{ courseSlug }} className="text-sm brand-text-muted">← {course.title}</Link>
        <div className="mt-4 aspect-video brand-surface rounded-xl overflow-hidden">
          <video ref={videoRef} src={current.video_url} controls className="w-full h-full" onEnded={() => upsertProgress({ position: 0, completed: true })} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">{current.title}</h1>
        <p className="mt-2 brand-text-muted">{current.description}</p>
        <div className="mt-6 flex gap-2">
          <button disabled={currentIndex <= 0} onClick={() => setCurrentLessonId(flatLessons[currentIndex - 1].id)}
            className="px-4 py-2 rounded brand-surface border brand-border disabled:opacity-40">← Anterior</button>
          <button onClick={() => upsertProgress({ position: videoRef.current?.currentTime ?? 0, completed: true })}
            className="px-4 py-2 rounded brand-btn font-medium">Marcar como concluída</button>
          <button disabled={currentIndex >= flatLessons.length - 1} onClick={() => setCurrentLessonId(flatLessons[currentIndex + 1].id)}
            className="px-4 py-2 rounded brand-surface border brand-border disabled:opacity-40">Próxima →</button>
        </div>
      </div>
      <aside className="brand-surface border-l brand-border p-4 overflow-y-auto max-h-screen">
        <p className="text-xs brand-text-muted uppercase tracking-wider mb-3">Conteúdo</p>
        {modules.map((m) => (
          <div key={m.id} className="mb-4">
            <p className="text-sm font-medium mb-1">{m.title}</p>
            <ul className="space-y-0.5">
              {(m.course_lessons ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((l: any) => (
                <li key={l.id}>
                  <button onClick={() => setCurrentLessonId(l.id)}
                    className={"w-full text-left text-sm px-2 py-1.5 rounded " + (l.id === currentLessonId ? "brand-btn" : "hover:bg-white/5")}>
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