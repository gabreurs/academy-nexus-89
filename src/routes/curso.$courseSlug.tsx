import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TenantDemoSwitcher } from "@/components/site/TenantDemoSwitcher";

export const Route = createFileRoute("/curso/$courseSlug")({ ssr: false, component: CoursePage });

function CoursePage() {
  const { courseSlug } = useParams({ from: "/curso/$courseSlug" });
  const { session } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: c } = await supabase.from("courses").select("*").eq("slug", courseSlug).maybeSingle();
      if (!c) { setLoading(false); return; }
      setCourse(c);
      const { data: mods } = await supabase.from("course_modules").select("*, course_lessons(*)").eq("course_id", c.id).order("sort_order");
      setModules((mods as any[]) ?? []);
      if (session?.user) {
        const { data: ent } = await supabase.from("course_entitlements").select("id").eq("user_id", session.user.id).eq("course_id", c.id).maybeSingle();
        const { data: enr } = await supabase.from("enrollments").select("id").eq("user_id", session.user.id).eq("course_id", c.id).maybeSingle();
        setHasAccess(!!ent || !!enr);
      }
      setLoading(false);
    })();
  }, [courseSlug, session?.user?.id]);

  const enroll = async () => {
    if (!session?.user || !course) return;
    await supabase.from("enrollments").insert({ user_id: session.user.id, course_id: course.id });
    setHasAccess(true);
  };

  if (loading) return <div className="min-h-screen"><SiteHeader /><p className="p-8 brand-text-muted">Carregando…</p></div>;
  if (!course) return <div className="min-h-screen"><SiteHeader /><p className="p-8">Curso não encontrado.</p></div>;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="aspect-video brand-surface rounded-xl overflow-hidden flex items-center justify-center opacity-60 text-5xl">▶</div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">{course.title}</h1>
          {course.subtitle && <p className="brand-text-muted mt-1">{course.subtitle}</p>}
          <p className="mt-6 leading-relaxed">{course.description}</p>
          <h2 className="mt-10 text-xl font-medium">Conteúdo do curso</h2>
          <div className="mt-4 space-y-4">
            {modules.map((m) => (
              <div key={m.id} className="brand-surface rounded-lg border brand-border">
                <div className="p-4 font-medium">{m.title}</div>
                <ul className="border-t brand-border">
                  {(m.course_lessons ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((l: any) => (
                    <li key={l.id} className="px-4 py-3 flex items-center justify-between text-sm border-t brand-border">
                      <span>{l.title}</span>
                      <span className="text-xs brand-text-muted">{Math.round((l.duration_seconds ?? 0) / 60)}min {l.is_preview && "· prévia"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <aside className="brand-surface rounded-xl p-6 border brand-border h-fit sticky top-24">
          <p className="text-xs brand-text-muted uppercase tracking-widest">{course.level}</p>
          <p className="mt-2 font-medium">{course.instructor_name}</p>
          <p className="text-sm brand-text-muted">{Math.round((course.duration_minutes ?? 0) / 60)}h de conteúdo</p>
          <div className="mt-6 space-y-2">
            {!session ? (
              <Link to="/login" search={{ next: `/curso/${courseSlug}` }} className="block text-center rounded-lg py-3 brand-btn font-medium">Entrar para começar</Link>
            ) : hasAccess ? (
              <Link to="/curso/$courseSlug/aprender" params={{ courseSlug }} className="block text-center rounded-lg py-3 brand-btn font-medium">Continuar curso</Link>
            ) : course.external_checkout_url ? (
              <a href={course.external_checkout_url} target="_blank" rel="noopener" className="block text-center rounded-lg py-3 brand-btn font-medium">Comprar acesso</a>
            ) : (
              <button onClick={enroll} className="w-full rounded-lg py-3 brand-btn font-medium">Iniciar curso</button>
            )}
          </div>
        </aside>
      </main>
      <TenantDemoSwitcher />
    </div>
  );
}