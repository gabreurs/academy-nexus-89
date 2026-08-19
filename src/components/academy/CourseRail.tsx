import { memo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CourseCard } from "./CourseCard";
import type { AcademyCourse } from "./types";

type Props = {
  title: string;
  subtitle?: string;
  items: AcademyCourse[];
  progress?: Record<string, { percent: number }>;
  ratings?: Record<string, { avg: number; count: number }>;
  myListIds?: Set<string>;
  onToggleList?: (id: string) => void;
  /** Nome de categoria fixo do rail; senão resolve por curso. */
  categoryName?: string;
  categoryNames?: Record<string, string>;
};

export const CourseRail = memo(function CourseRail({
  title,
  subtitle,
  items,
  progress,
  ratings,
  myListIds,
  onToggleList,
  categoryName,
  categoryNames,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <section className="academy-rail group/rail">
      <div className="ax-container grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <h2 className="ax-h3 truncate">{title}</h2>
          {subtitle && <p className="ax-meta mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className="hidden items-center gap-1.5 opacity-0 transition group-hover/rail:opacity-100 md:flex">
          <button className="ax-iconbtn" data-size="sm" onClick={() => scrollBy(-1)} aria-label="Anterior">
            <ChevronLeft size={16} />
          </button>
          <button className="ax-iconbtn" data-size="sm" onClick={() => scrollBy(1)} aria-label="Próximo">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="ax-container mt-3">
        <div ref={ref} className="ax-rail-scroller">
          {items.map((c) => (
            <div key={c.id} className="ax-rail-item">
              <CourseCard
                course={c}
                categoryName={categoryName ?? (c.category_id ? categoryNames?.[c.category_id] : undefined)}
                percent={progress?.[c.id]?.percent ?? 0}
                rating={ratings?.[c.id]}
                inMyList={myListIds?.has(c.id) ?? false}
                onToggleList={onToggleList}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
