import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Primitivas do Design System da Academy (Camada 1 — fixa).
 * Nenhuma delas aceita cor de tenant como prop: a marca entra apenas
 * pelos tokens --tenant-accent / --tenant-accent-contrast.
 */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("ax-eyebrow", className)}>{children}</p>;
}

export function Badge({
  tone,
  children,
  className,
}: {
  tone?: "neutral" | "accent" | "progress" | "done";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("ax-badge", className)} data-tone={tone && tone !== "neutral" ? tone : undefined}>
      {children}
    </span>
  );
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="ax-chip" data-selected={selected ? "true" : "false"} onClick={onClick}>
      {children}
    </button>
  );
}

export function Progress({ percent, className }: { percent: number; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className={cn("ax-progress", className)}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${v}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("ax-skeleton", className)} aria-hidden />;
}

export function CardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="ax-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2.5">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-3.5 w-4/5 rounded" />
          <Skeleton className="h-3 w-2/5 rounded" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ax-empty">
      <p className="ax-h3">{title}</p>
      {description && <p className="ax-body text-center text-[14px]">{description}</p>}
      {action}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <h2 className="ax-h2 truncate">{title}</h2>
        {subtitle && <p className="ax-meta mt-1 truncate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
