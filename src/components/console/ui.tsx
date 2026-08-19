import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Primitivas do Console (Camada 3 do Design System).
 * Neutras por definição: nenhuma delas aceita cor de tenant.
 */

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; onClick?: () => void }[];
}) {
  return (
    <header className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-xs c-muted">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {b.onClick ? (
                <button onClick={b.onClick} className="hover:underline">{b.label}</button>
              ) : (
                <span>{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.45rem] font-medium tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm c-muted max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  footer,
  padded = true,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("c-card overflow-hidden", className)}>
      {(title || actions) && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b c-divide px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-medium">{title}</h2>}
            {description && <p className="mt-1 text-xs c-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children && <div className={padded ? "p-5" : ""}>{children}</div>}
      {footer && <div className="border-t c-divide px-5 py-3">{footer}</div>}
    </section>
  );
}

export function Button({
  variant = "secondary",
  size,
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm";
}) {
  return <button {...rest} type={type} className={cn("c-btn", rest.className)} data-variant={variant} data-size={size} />;
}

export function Badge({ tone, children }: { tone?: "ok" | "warn" | "danger" | "info"; children: ReactNode }) {
  return <span className="c-badge" data-tone={tone}>{children}</span>;
}

export function Field({
  label,
  hint,
  children,
  className,
}: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] c-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("c-input mt-1", props.className)} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("c-select mt-1", props.className)} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("c-textarea mt-1", props.className)} />;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  className,
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-45" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="c-input pl-8"
      />
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: { label: string; value: ReactNode; hint?: string; tone?: "ok" | "warn" | "danger" }) {
  return (
    <div className="c-card px-4 py-3.5">
      <p className="text-[11px] uppercase tracking-[0.08em] c-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-medium tabular-nums leading-none">{value}</p>
      {hint && (
        <p
          className="mt-1.5 text-xs c-muted"
          style={tone ? { color: `var(--c-${tone === "danger" ? "danger" : tone})` } : undefined}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-xs c-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="c-skel h-6 flex-1" style={{ maxWidth: c === 0 ? undefined : 140 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

/** Ação destrutiva com confirmação inline (sem window.confirm). */
export function ConfirmAction({
  label,
  confirmLabel = "Confirmar",
  question,
  onConfirm,
  size = "sm",
}: {
  label: string;
  confirmLabel?: string;
  question?: string;
  onConfirm: () => void | Promise<void>;
  size?: "sm";
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!armed) {
    return <Button variant="ghost" size={size} onClick={() => setArmed(true)}>{label}</Button>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      {question && <span className="text-[11px] c-muted">{question}</span>}
      <Button
        variant="danger"
        size={size}
        disabled={busy}
        onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); setArmed(false); }}
      >
        {busy ? "…" : confirmLabel}
      </Button>
      <Button variant="ghost" size={size} onClick={() => setArmed(false)}>Cancelar</Button>
    </span>
  );
}

/** Feedback de salvamento discreto. */
export function SaveState({ state }: { state: null | { kind: "ok" | "err" | "busy"; text: string } }) {
  if (!state) return null;
  const color = state.kind === "err" ? "var(--c-danger)" : state.kind === "ok" ? "var(--c-ok)" : "var(--c-muted)";
  return (
    <span role="status" className="text-xs" style={{ color }}>
      {state.kind === "busy" ? "Salvando…" : state.text}
    </span>
  );
}

export function SectionGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-5", className)}>{children}</div>;
}
