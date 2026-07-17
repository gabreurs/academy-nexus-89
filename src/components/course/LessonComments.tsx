import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

type Comment = {
  id: string;
  user_id: string;
  lesson_id: string;
  body: string;
  is_hidden: boolean;
  is_answered: boolean;
  created_at: string;
};

type Author = { full_name: string | null; avatar_url: string | null };
type Role = "platform_admin" | "org_admin" | "student";

export function LessonComments({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { session, memberships, isPlatformAdmin, isOrgAdmin } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("lesson_comments").select("*")
      .eq("lesson_id", lessonId).eq("is_hidden", false).order("created_at", { ascending: true });
    const cs = (data as Comment[]) ?? [];
    setItems(cs);
    const ids = Array.from(new Set(cs.map((c) => c.user_id)));
    if (ids.length) {
      const [{ data: profs }, { data: mems }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids),
        supabase.from("organization_memberships").select("user_id, role").in("user_id", ids).eq("is_active", true),
      ]);
      const amap: Record<string, Author> = {};
      (profs ?? []).forEach((p: any) => (amap[p.id] = p));
      setAuthors(amap);
      const rmap: Record<string, Role> = {};
      (mems ?? []).forEach((m: any) => {
        // Highest privilege wins for the badge.
        const rank = { platform_admin: 3, org_admin: 2, student: 1 } as const;
        if (!rmap[m.user_id] || rank[m.role as Role] > rank[rmap[m.user_id]]) rmap[m.user_id] = m.role;
      });
      setRoles(rmap);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [lessonId]);

  const submit = async () => {
    if (!session?.user || !text.trim()) return;
    const orgId = memberships[0]?.organization_id;
    if (!orgId) { setError("Vincule-se a uma organização para comentar."); return; }
    setSaving(true); setError(null);
    const { error } = await supabase.from("lesson_comments").insert({
      user_id: session.user.id, lesson_id: lessonId, course_id: courseId,
      organization_id: orgId, body: text.trim(),
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setText("");
    await load();
  };

  const canModerate = isPlatformAdmin || isOrgAdmin();
  const markAnswered = async (id: string, value: boolean) => {
    await supabase.from("lesson_comments").update({ is_answered: value }).eq("id", id);
    await load();
  };

  return (
    <section className="mt-8">
      <h3 className="text-lg font-medium">Perguntas e comentários</h3>

      {session?.user ? (
        <div className="mt-3 brand-surface rounded-lg border brand-border p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            placeholder="Faça uma pergunta sobre esta aula…"
            className="w-full bg-transparent text-sm resize-none h-20 outline-none"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs brand-text-muted">{text.length}/1000</span>
            <button onClick={submit} disabled={!text.trim() || saving} className="px-3 py-1.5 rounded brand-btn text-sm font-medium disabled:opacity-40">
              {saving ? "Enviando…" : "Comentar"}
            </button>
          </div>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
      ) : (
        <p className="mt-3 text-sm brand-text-muted">Entre para participar da discussão.</p>
      )}

      <ul className="mt-5 space-y-3">
        {items.map((c) => {
          const role = roles[c.user_id];
          const isStaff = role === "platform_admin" || role === "org_admin";
          return (
            <li key={c.id} className={"rounded-lg border p-3 " + (isStaff ? "border-yellow-400/40 bg-yellow-400/5" : "brand-border brand-surface")}>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{authors[c.user_id]?.full_name ?? "Aluno"}</span>
                {isStaff && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300">
                    {role === "platform_admin" ? "Equipe" : "Instrutor"}
                  </span>
                )}
                {c.is_answered && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Respondido</span>
                )}
                <span className="ml-auto text-xs brand-text-muted">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{c.body}</p>
              {canModerate && (
                <button onClick={() => markAnswered(c.id, !c.is_answered)} className="mt-2 text-xs brand-text-muted hover:underline">
                  {c.is_answered ? "Desmarcar respondido" : "Marcar como respondido"}
                </button>
              )}
            </li>
          );
        })}
        {items.length === 0 && <li className="text-sm brand-text-muted">Nenhum comentário ainda.</li>}
      </ul>
    </section>
  );
}