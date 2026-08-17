import { memo, useRef } from "react";
import { CourseCard } from "./CourseCard";
import type { AcademyCourse } from "./types";

type Props = {
  title: string;
  items: AcademyCourse[];
  progress?: Record<string, { percent: number }>;
  myListIds?: Set<string>;
  onToggleList?: (id: string) => void;
  /** Nome de categoria fixo do rail; senão resolve por curso. */
  categoryName?: string;
  categoryNames?: Record<string, string>;
};

export const CourseRail = memo(function CourseRail({
  title,
  items,
  progress,
  myListIds,
  onToggleList,
  categoryName,
  categoryNames,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.88), behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <section className="academy-rail group/rail">
      <div className="academy-container flex items-end justify-between gap-4">
        <h2 className="academy-rail-title">{title}</h2>
        <div className="hidden items-center gap-2 opacity-0 transition group-hover/rail:opacity-100 md:flex">
          <button className="academy-icon-btn h-9 w-9" onClick={() => scrollBy(-1)} aria-label="Anterior">‹</button>
          <button className="academy-icon-btn h-9 w-9" onClick={() => scrollBy(1)} aria-label="Próximo">›</button>
        </div>
      </div>
      <div className="academy-container mt-3.5">
        <div ref={ref} className="academy-rail-scroller">
          {items.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              categoryName={categoryName ?? (c.category_id ? categoryNames?.[c.category_id] : undefined)}
              percent={progress?.[c.id]?.percent ?? 0}
              inMyList={myListIds?.has(c.id) ?? false}
              onToggleList={onToggleList}
            />
          ))}
        </div>
      </div>
    </section>
  );
});