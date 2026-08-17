import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

type Comment = {
  id: string; user_id: string; body: string;
  is_hidden: boolean; is_answered: boolean; created_at: string;
};
type Author = { full_name: string | null; avatar_url: string | null };
type Role = "platform_admin" | "org_admin" | "student";

/**
 * Discussão em NÍVEL DE CURSO.
 *
 * Cursos entregues por embed do LearningStudio não expõem qual aula interna o
 * aluno está vendo, então não fingimos discussão por aula: os comentários
 * pertencem ao curso. RLS (course_comments) mantém o isolamento por org.
 */
export function CourseComments({ courseId }: { courseId: string }) {
  const { session, memberships, isPlatformAdmin, isOrgAdmin } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("course_comments").select("*")
      .eq("course_id", courseId).eq("is_hidden", false).order("created_at", { ascending: true });
    const cs = (data as Comment[]) ?? [];
    setItems(cs);
    const ids = Array.from(new Set(cs.map((c) => c.user_id)));
    if (!ids.length) return;
    const [{ data: profs }, { data: mems }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids),
      supabase.from("organization_memberships").select("user_id, role").in("user_id", ids).eq("is_active", true),
    ]);
    const amap: Record<string, Author> = {};
    (profs ?? []).forEach((p: any) => (amap[p.id] = p));
    setAuthors(amap);
    const rank = { platform_admin: 3, org_admin: 2, student: 1 } as const;
    const rmap: Record<string, Role> = {};
    (mems ?? []).forEach((m: any) => {
      if (!rmap[m.user_id] || rank[m.role as Role] > rank[rmap[m.user_id]]) rmap[m.user_id] = m.role;
    });
    setRoles(rmap);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [courseId]);

  const submit = async () => {
    if (!session?.user || !text.trim()) return;
    const orgId = memberships[0]?.organization_id;
    if (!orgId) { setError("Vincule-se a uma organização para comentar."); return; }
    setSaving(true); setError(null);
    const { error } = await supabase.from("course_comments").insert({
      user_id: session.user.id, course_id: courseId, organization_id: orgId, body: text.trim(),
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setText("");
    await load();
  };

  const canModerate = isPlatformAdmin || isOrgAdmin();
  const markAnswered = async (id: string, value: boolean) => {
    await supabase.from("course_comments").update({ is_answered: value }).eq("id", id);
    await load();
  };

  return (
    <div>
      {session?.user ? (
        <div className="player-surface rounded-lg border player-border p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            placeholder="Pergunte algo sobre este curso…"
            className="w-full bg-transparent text-sm resize-none h-20 outline-none"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs player-muted">{text.length}/1000</span>
            <button onClick={submit} disabled={!text.trim() || saving} className="player-cta text-sm disabled:opacity-40">
              {saving ? "Enviando…" : "Comentar"}
            </button>
          </div>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
      ) : (
        <p className="text-sm player-muted">Entre para participar da discussão.</p>
      )}

      <ul className="mt-4 space-y-3">
        {items.map((c) => {
          const role = roles[c.user_id];
          const isStaff = role === "platform_admin" || role === "org_admin";
          return (
            <li key={c.id} className={"rounded-lg border p-3 " + (isStaff ? "border-yellow-400/40 bg-yellow-400/5" : "player-border player-surface")}>
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
                <span className="ml-auto text-xs player-muted">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{c.body}</p>
              {canModerate && (
                <button onClick={() => markAnswered(c.id, !c.is_answered)} className="mt-2 text-xs player-muted hover:underline">
                  {c.is_answered ? "Desmarcar respondido" : "Marcar como respondido"}
                </button>
              )}
            </li>
          );
        })}
        {items.length === 0 && <li className="text-sm player-muted">Nenhum comentário ainda.</li>}
      </ul>
    </div>
  );
}
