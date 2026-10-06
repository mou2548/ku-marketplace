import type { AdminLabel, AdminTone } from "@/lib/admin-labels";
import { cn } from "@/lib/utils";

/**
 * The admin workspace's surface vocabulary. Admin is a scanning tool, not a
 * student screen, so it follows the minimal direction the team approved on
 * 2026-10-05: hairline boxes on a white page, no shadows, colour kept to soft
 * status pills and the one primary action. This is an admin-only exception to
 * CLAUDE.md §3.1 "depth over outline"; student surfaces keep their shadows.
 */

const PILL_TONE: Record<AdminTone, string> = {
  neutral: "bg-tone-neutral-bg text-tone-neutral-fg",
  info: "bg-tone-info-bg text-tone-info-fg",
  warning: "bg-tone-warning-bg text-tone-warning-fg",
  danger: "bg-tone-danger-bg text-tone-danger-fg",
  success: "bg-tone-success-bg text-tone-success-fg",
};

/** A status as text on a soft wash. The words carry the meaning; the wash
 * only groups, so it never stands alone (WCAG 1.4.1). */
export function AdminPill({
  status,
  className,
}: {
  status: AdminLabel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-pill px-2.5 text-meta font-medium leading-[1.7]",
        PILL_TONE[status.tone],
        className,
      )}
    >
      {status.label}
    </span>
  );
}

export function AdminBox({
  as: Tag = "section",
  className,
  children,
  ...rest
}: {
  as?: "section" | "div";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(
        "min-w-0 overflow-hidden rounded-[12px] border border-line bg-surface",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function AdminBoxHeader({
  icon,
  title,
  titleId,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  titleId?: string;
  /** Right-aligned controls. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
      <h2
        id={titleId}
        className="flex items-center gap-2 text-body font-medium tracking-[-0.01em]"
      >
        {icon ? (
          <span aria-hidden className="text-ink-muted [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
        {title}
      </h2>
      {children ? (
        <div className="ml-auto flex items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

/** Initials in a neutral disc — admin lists never load avatars. */
export function AdminInitials({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full bg-surface-sunken font-semibold text-ink-secondary",
        size === "sm" ? "size-6 text-[0.64rem]" : "size-8 text-[0.72rem]",
      )}
    >
      {initials || "?"}
    </span>
  );
}

export function AdminPageHeader({
  overline,
  title,
  description,
  children,
}: {
  overline?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {overline ? (
          <p className="text-caption text-ink-muted">{overline}</p>
        ) : null}
        <h1 className="mt-0.5 text-[1.75rem] font-medium leading-tight tracking-[-0.025em] text-balance">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-body-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </header>
  );
}

/** Photos attached to a report or an appeal, opened full size in a new tab. */
export function EvidenceGrid({
  urls,
  label,
}: {
  urls?: string[] | null;
  label: string;
}) {
  if (!urls?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-meta text-ink-muted">
        {label} ({urls.length})
      </p>
      <ul className="grid grid-cols-3 gap-2">
        {urls.map((url, index) => (
          <li key={url}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square overflow-hidden rounded-[8px] bg-surface-sunken"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin-only evidence view, arbitrary host */}
              <img
                src={url}
                alt={`${label}, photo ${index + 1}`}
                className="size-full object-cover"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Label/value pairs in two columns. */
export function AdminFacts({
  facts,
}: {
  facts: Array<[label: string, value: React.ReactNode]>;
}) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-body-sm">
      {facts.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-ink-muted">{label}</dt>
          <dd className="min-w-0 text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
