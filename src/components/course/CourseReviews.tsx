import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

type Review = {
  id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  organization_id: string;
};

type Props = { courseId: string; canReview: boolean };

function Stars({ value, size = "text-base", onPick }: { value: number; size?: string; onPick?: (n: number) => void }) {
  return (
    <div className={`inline-flex ${size}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={onPick ? () => onPick(n) : undefined}
          disabled={!onPick}
          className={(onPick ? "cursor-pointer " : "cursor-default ") + "px-0.5"}
          aria-label={`${n} estrelas`}
        >
          <span className={n <= value ? "text-yellow-400" : "text-white/20"}>★</span>
        </button>
      ))}
    </div>
  );
}

export function CourseReviews({ courseId, canReview }: Props) {
  const { session, memberships } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [authors, setAuthors] = useState<Record<string, { full_name: string | null; avatar_url: string | null }>>({});
  const [myRating, setMyRating] = useState(0);
  const [myBody, setMyBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("course_reviews").select("*").eq("course_id", courseId).order("created_at", { ascending: false });
    const rs = (data as Review[]) ?? [];
    setReviews(rs);
    const userIds = Array.from(new Set(rs.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      const map: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => (map[p.id] = p));
      setAuthors(map);
    }
    if (session?.user) {
      const mine = rs.find((r) => r.user_id === session.user.id);
      if (mine) { setMyRating(mine.rating); setMyBody(mine.body ?? ""); }
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [courseId, session?.user?.id]);

  const { avg, count } = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const s = reviews.reduce((acc, r) => acc + (r.rating ?? 0), 0);
    return { avg: s / reviews.length, count: reviews.length };
  }, [reviews]);

  const submit = async () => {
    if (!session?.user || !myRating) return;
    const orgId = memberships[0]?.organization_id;
    if (!orgId) { setError("Vincule-se a uma organização para avaliar."); return; }
    setSaving(true); setError(null);
    const { error } = await supabase.from("course_reviews").upsert(
      { user_id: session.user.id, course_id: courseId, organization_id: orgId, rating: myRating, body: myBody || null },
      { onConflict: "user_id,course_id" },
    );
    setSaving(false);
    if (error) { setError(error.message); return; }
    await load();
  };

  return (
    <section className="mt-10">
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-medium">Avaliações</h2>
        {count > 0 && (
          <span className="text-sm brand-text-muted">
            <span className="text-yellow-400">★</span> {avg.toFixed(1)} · {count} {count === 1 ? "avaliação" : "avaliações"}
          </span>
        )}
      </div>

      {canReview && session?.user && (
        <div className="mt-4 brand-surface rounded-lg border brand-border p-4">
          <p className="text-sm brand-text-muted">Sua avaliação</p>
          <div className="mt-2"><Stars value={myRating} size="text-2xl" onPick={setMyRating} /></div>
          <textarea
            value={myBody}
            onChange={(e) => setMyBody(e.target.value.slice(0, 500))}
            placeholder="Conte em poucas palavras o que achou (opcional)"
            className="mt-3 w-full bg-transparent border brand-border rounded-md p-2 text-sm resize-none h-20"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs brand-text-muted">{myBody.length}/500</span>
            <button onClick={submit} disabled={!myRating || saving} className="px-4 py-2 rounded brand-btn text-sm font-medium disabled:opacity-40">
              {saving ? "Salvando…" : "Enviar avaliação"}
            </button>
          </div>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
      )}

      <ul className="mt-6 space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="brand-surface rounded-lg border brand-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{authors[r.user_id]?.full_name ?? "Aluno"}</p>
              <Stars value={r.rating} />
            </div>
            {r.body && <p className="mt-2 text-sm brand-text-muted whitespace-pre-wrap">{r.body}</p>}
          </li>
        ))}
        {reviews.length === 0 && <li className="text-sm brand-text-muted">Nenhuma avaliação ainda. Seja o primeiro.</li>}
      </ul>
    </section>
  );
}