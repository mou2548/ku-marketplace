import { cn } from "@/lib/utils";

import { Surface } from "./surface";

/**
 * Design principle 10: nothing is empty. A blank list reading "No data"
 * tells the user nothing about whether the product is broken, whether they did
 * something wrong, or what to do next.
 *
 * Every zero-state carries three things: a mark, a sentence explaining *why* it
 * is empty, and exactly one action.
 */
export interface EmptyStateProps {
  /** A lucide icon element, sized by the caller. */
  icon?: React.ReactNode;
  title: string;
  /** Why it is empty — not a restatement of the title. */
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Surface
      shape="panel"
      elevation="flat"
      fill="none"
      className={cn(
        "texture-grid flex flex-col items-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="grid size-14 place-items-center rounded-pill bg-brand-subtle text-ink-brand">
          {icon}
        </span>
      ) : null}
      <h3 className="text-[1.125rem] leading-[1.4] font-semibold">{title}</h3>
      <p className="max-w-sm text-[0.875rem] leading-[1.65] text-ink-muted">
        {description}
      </p>
      {action ? <div className="pt-1">{action}</div> : null}
    </Surface>
  );
}
