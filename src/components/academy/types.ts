/** Forma mínima que TODAS as superfícies tenant-facing consomem. */
export type AcademyCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  cover_url?: string | null;
  banner_url?: string | null;
  instructor_name?: string | null;
  duration_minutes?: number | null;
  category_id?: string | null;
  level?: string | null;
  is_required?: boolean | null;
  is_featured?: boolean | null;
  visibility?: string | null;
  created_at?: string;
};

export function levelLabel(l?: string | null) {
  if (!l) return null;
  const map: Record<string, string> = {
    iniciante: "Iniciante",
    intermediario: "Intermediário",
    avancado: "Avançado",
  };
  return map[l] ?? l;
}

export function durationLabel(min?: number | null) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m ? ` ${m}min` : ""}` : `${m}min`;
}