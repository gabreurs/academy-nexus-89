import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Org = { id: string; name: string; slug: string; is_platform: boolean };
type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: "draft" | "published" | "archived";
  visibility: "global" | "exclusive";
  owner_org_id: string | null;
  cover_url: string | null;
  instructor_name: string | null;
};
type Module = { id: string; course_id: string; title: string; sort_order: number };
type Lesson = {
  id: string;
  module_id: string;
  course_id: string;
  slug: string;
  title: string;
  video_url: string | null;
  sort_order: number;
  is_preview: boolean;
};

const EMPTY_COURSE: Omit<Course, "id"> = {
  slug: "",
  title: "",
  subtitle: null,
  description: null,
  status: "draft",
  visibility: "global",
  owner_org_id: null,
  cover_url: null,
  instructor_name: null,
};

export function CourseManager({ orgs }: { orgs: Org[] }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Course | null>(null);
  const [creating, setCreating] = useState<Omit<Course, "id"> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.from("courses")
      .select("id, slug, title, subtitle, description, status, visibility, owner_org_id, cover_url, instructor_name")
      .order("title");
    setCourses((data as Course[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const saveCourse = async (payload: Omit<Course, "id"> & { id?: string }) => {
    setMsg(null);
    // Client-side guard mirroring the DB trigger: exclusive requires owner_org_id.
    if (payload.visibility === "exclusive" && !payload.owner_org_id) {
      setMsg("Cursos exclusivos exigem uma organização dona.");
      return false;
    }
    if (payload.visibility === "global") payload.owner_org_id = null;
    const { error } = payload.id
      ? await supabase.from("courses").update(payload).eq("id", payload.id)
      : await supabase.from("courses").insert(payload);
    if (error) { setMsg(error.message); return false; }
    await refresh();
    return true;
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir curso? Módulos e aulas serão removidos em cascata.")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) setMsg(error.message);
    else refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Cursos</h2>
        <button onClick={() => setCreating({ ...EMPTY_COURSE })}
          className="rounded-lg px-4 py-2 brand-btn text-sm font-medium">+ Novo curso</button>
      </div>
      {msg && <p className="mt-2 text-sm text-red-400">{msg}</p>}

      <div className="mt-3 brand-surface rounded-xl border brand-border overflow-hidden">
        {loading ? <p className="p-4 brand-text-muted text-sm">Carregando…</p> :
          courses.length === 0 ? <p className="p-4 brand-text-muted text-sm">Nenhum curso.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs brand-text-muted uppercase">
                <tr>
                  <th className="px-4 py-2">Curso</th>
                  <th className="px-4 py-2">Visibilidade</th>
                  <th className="px-4 py-2">Dona</th>
                  <th className="px-4 py-2">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => {
                  const owner = orgs.find((o) => o.id === c.owner_org_id);
                  return (
                    <tr key={c.id} className="border-t brand-border">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs brand-text-muted">{c.slug}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        {c.visibility === "global" ? "Global" : "Exclusivo"}
                      </td>
                      <td className="px-4 py-2.5 brand-text-muted">{owner?.name ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={c.status === "published" ? "text-emerald-400" : "brand-text-muted"}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right space-x-3">
                        <button onClick={() => setEditing(c)} className="text-xs hover:underline">Editar</button>
                        <button onClick={() => remove(c.id)} className="text-xs text-red-400 hover:underline">Excluir</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>

      {creating && (
        <CourseFormModal
          title="Novo curso" orgs={orgs} value={creating}
          onCancel={() => setCreating(null)}
          onSave={async (v) => { if (await saveCourse(v)) setCreating(null); }}
        />
      )}
      {editing && (
        <CourseFormModal
          title={`Editar: ${editing.title}`} orgs={orgs} value={editing}
          onCancel={() => setEditing(null)}
          onSave={async (v) => { if (await saveCourse({ ...v, id: editing.id })) setEditing(null); }}
          extra={<CurriculumEditor courseId={editing.id} />}
        />
      )}
    </div>
  );
}

function CourseFormModal({
  title, value, orgs, onCancel, onSave, extra,
}: {
  title: string;
  value: Omit<Course, "id"> | Course;
  orgs: Org[];
  onCancel: () => void;
  onSave: (v: Omit<Course, "id">) => void | Promise<void>;
  extra?: React.ReactNode;
}) {
  const [v, setV] = useState({ ...value });
  const upd = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV({ ...v, [k]: val });
  const isExclusive = v.visibility === "exclusive";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-auto py-10">
      <div className="w-full max-w-3xl brand-surface rounded-xl border brand-border p-6 mx-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{title}</h3>
          <button onClick={onCancel} className="brand-text-muted hover:text-white">✕</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs brand-text-muted">Slug</span>
            <input value={v.slug} onChange={(e) => upd("slug", e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm" />
          </label>
          <label className="block">
            <span className="text-xs brand-text-muted">Título</span>
            <input value={v.title} onChange={(e) => upd("title", e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs brand-text-muted">Subtítulo</span>
            <input value={v.subtitle ?? ""} onChange={(e) => upd("subtitle", e.target.value || null)}
              className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs brand-text-muted">Descrição</span>
            <textarea value={v.description ?? ""} onChange={(e) => upd("description", e.target.value || null)}
              rows={3} className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm" />
          </label>
          <label className="block">
            <span className="text-xs brand-text-muted">Capa (URL)</span>
            <input value={v.cover_url ?? ""} onChange={(e) => upd("cover_url", e.target.value || null)}
              className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm" />
          </label>
          <label className="block">
            <span className="text-xs brand-text-muted">Instrutor</span>
            <input value={v.instructor_name ?? ""} onChange={(e) => upd("instructor_name", e.target.value || null)}
              className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm" />
          </label>
          <label className="block">
            <span className="text-xs brand-text-muted">Status</span>
            <select value={v.status} onChange={(e) => upd("status", e.target.value as Course["status"])}
              className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm">
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs brand-text-muted">Visibilidade</span>
            <select value={v.visibility}
              onChange={(e) => {
                const vis = e.target.value as Course["visibility"];
                setV({ ...v, visibility: vis, owner_org_id: vis === "global" ? null : v.owner_org_id });
              }}
              className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm">
              <option value="global">Global (todas as organizações)</option>
              <option value="exclusive">Exclusivo de uma organização</option>
            </select>
          </label>
          {isExclusive && (
            <label className="block sm:col-span-2">
              <span className="text-xs brand-text-muted">Organização dona *</span>
              <select value={v.owner_org_id ?? ""}
                onChange={(e) => upd("owner_org_id", e.target.value || null)}
                className="mt-1 w-full rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm">
                <option value="">— selecione —</option>
                {orgs.filter((o) => !o.is_platform).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <span className="text-xs brand-text-muted mt-1 block">
                Obrigatório para cursos exclusivos. Isso define o isolamento RLS de módulos e aulas.
              </span>
            </label>
          )}
        </div>

        {extra && <div className="mt-6 border-t brand-border pt-6">{extra}</div>}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel}
            className="rounded-lg px-4 py-2 border brand-border text-sm">Cancelar</button>
          <button onClick={() => onSave(v)}
            className="rounded-lg px-5 py-2 brand-btn text-sm font-medium">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function CurriculumEditor({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModule, setNewModule] = useState("");

  const refresh = async () => {
    setLoading(true);
    const [{ data: ms }, { data: ls }] = await Promise.all([
      supabase.from("course_modules").select("*").eq("course_id", courseId).order("sort_order"),
      supabase.from("course_lessons").select("*").eq("course_id", courseId).order("sort_order"),
    ]);
    setModules((ms as Module[]) ?? []);
    setLessons((ls as Lesson[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [courseId]);

  const addModule = async () => {
    if (!newModule.trim()) return;
    const sort = (modules[modules.length - 1]?.sort_order ?? 0) + 1;
    await supabase.from("course_modules").insert({ course_id: courseId, title: newModule.trim(), sort_order: sort });
    setNewModule(""); refresh();
  };
  const delModule = async (id: string) => {
    if (!confirm("Excluir módulo e todas as suas aulas?")) return;
    await supabase.from("course_modules").delete().eq("id", id);
    refresh();
  };
  const addLesson = async (moduleId: string) => {
    const title = prompt("Título da aula");
    if (!title) return;
    const slug = prompt("Slug (ex: introducao)", title.toLowerCase().replace(/\s+/g, "-"));
    if (!slug) return;
    const video = prompt("URL do vídeo (Vimeo)", "") || null;
    const sort = lessons.filter((l) => l.module_id === moduleId).length + 1;
    await supabase.from("course_lessons").insert({
      module_id: moduleId, course_id: courseId, title, slug, video_url: video, sort_order: sort, is_preview: false,
    });
    refresh();
  };
  const delLesson = async (id: string) => {
    if (!confirm("Excluir aula?")) return;
    await supabase.from("course_lessons").delete().eq("id", id);
    refresh();
  };

  if (loading) return <p className="brand-text-muted text-sm">Carregando currículo…</p>;

  return (
    <div>
      <h4 className="text-sm font-medium uppercase tracking-widest brand-text-muted">Currículo</h4>
      <div className="mt-3 flex gap-2">
        <input value={newModule} onChange={(e) => setNewModule(e.target.value)}
          placeholder="Novo módulo"
          className="flex-1 rounded-lg px-3 py-2 brand-surface-2 border brand-border text-sm" />
        <button onClick={addModule} className="rounded-lg px-4 py-2 brand-btn text-sm">Adicionar</button>
      </div>

      <ul className="mt-4 space-y-3">
        {modules.map((m) => (
          <li key={m.id} className="brand-surface-2 rounded-lg border brand-border p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{m.title}</p>
              <div className="space-x-3 text-xs">
                <button onClick={() => addLesson(m.id)} className="hover:underline">+ Aula</button>
                <button onClick={() => delModule(m.id)} className="text-red-400 hover:underline">Excluir</button>
              </div>
            </div>
            <ul className="mt-2 space-y-1 pl-3">
              {lessons.filter((l) => l.module_id === m.id).map((l) => (
                <li key={l.id} className="flex items-center justify-between text-xs">
                  <span>
                    {l.title}
                    {l.video_url && <span className="brand-text-muted"> — {l.video_url.slice(0, 40)}…</span>}
                  </span>
                  <button onClick={() => delLesson(l.id)} className="text-red-400 hover:underline">Excluir</button>
                </li>
              ))}
              {lessons.filter((l) => l.module_id === m.id).length === 0 && (
                <li className="text-xs brand-text-muted">Sem aulas.</li>
              )}
            </ul>
          </li>
        ))}
        {modules.length === 0 && <li className="text-sm brand-text-muted">Sem módulos ainda.</li>}
      </ul>
    </div>
  );
}