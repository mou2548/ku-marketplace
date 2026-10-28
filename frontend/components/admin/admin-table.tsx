import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import type { AdminUserRef } from "@/lib/api/admin";
import { cn } from "@/lib/utils";

import { AdminInitials } from "./admin-ui";

/**
 * Building blocks for the overview lists (users, deals, items, memberships):
 * a hairline table that scrolls inside itself, a search-and-filter row that
 * is a plain GET form (so every filter is a shareable URL and works without
 * JavaScript), and page links. Same visual language as `queue-table.tsx`.
 */

export function AdminTable({
  caption,
  minWidth = 640,
  head,
  children,
  empty,
}: {
  caption: string;
  minWidth?: number;
  head: React.ReactNode;
  children: React.ReactNode;
  /** Shown instead of the table when there are no rows. */
  empty?: string;
}) {
  if (empty)
    return (
      <p className="border-t border-line px-4 py-8 text-center text-body-sm text-ink-muted">
        {empty}
      </p>
    );
  return (
    <div className="overflow-x-auto border-t border-line">
      <table
        className="w-full border-collapse text-body-sm"
        style={{ minWidth }}
      >
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-surface-sunken text-left text-meta text-ink-secondary">
            {head}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AdminTh({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-4 py-2 font-medium [&+th]:border-l [&+th]:border-line",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}

export function AdminTd({
  children,
  align = "left",
  numeric,
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  numeric?: boolean;
  className?: string;
}) {
  return (
    <td
      data-numeric={numeric || undefined}
      className={cn(
        "border-l border-line px-4 py-2.5 first:border-l-0",
        align === "right" && "text-right",
        numeric && "whitespace-nowrap",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** A person in a table cell, linking to their admin page. */
export function AdminUserCell({ user }: { user: AdminUserRef }) {
  return (
    <Link
      href={`/admin/users/${user.user_id}`}
      className="flex min-w-0 items-center gap-2 hover:underline"
    >
      <AdminInitials name={user.name} size="sm" />
      <span className="min-w-0 truncate">{user.name}</span>
    </Link>
  );
}

export interface FilterSelect {
  name: string;
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}

/** Search box plus selects, submitted as a GET form to the same page. */
export function AdminFilterBar({
  action,
  query,
  placeholder,
  selects = [],
  hidden,
}: {
  action: string;
  query?: string;
  /** Omit to leave out the search box. */
  placeholder?: string;
  selects?: FilterSelect[];
  /** Filters that are kept but not shown, such as the owner from a user page. */
  hidden?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className="flex flex-wrap items-end gap-2 px-4 pb-3"
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {placeholder ? (
        <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
          <span className="sr-only">Search</span>
          <span className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={placeholder}
              className="min-h-10 w-full rounded-[10px] border border-line-default bg-surface pl-9 pr-3 text-body-sm text-ink placeholder:text-ink-disabled outline-none focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            />
          </span>
        </label>
      ) : null}
      {selects.map((select) => (
        <label key={select.name} className="flex flex-col gap-1">
          <span className="text-meta text-ink-muted">{select.label}</span>
          <select
            name={select.name}
            defaultValue={select.value}
            className="min-h-10 rounded-[10px] border border-line-default bg-surface px-3 text-body-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button
        type="submit"
        className="min-h-10 rounded-[10px] border border-line-default bg-surface px-3.5 text-body-sm text-ink hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Apply
      </button>
    </form>
  );
}

/** "Page 2 of 9" with previous/next links that keep the other filters. */
export function AdminPagination({
  path,
  params,
  page,
  totalPages,
  total,
}: {
  path: string;
  params: Record<string, string>;
  page: number;
  totalPages: number;
  total: number;
}) {
  const href = (p: number) =>
    `${path}?${new URLSearchParams({ ...params, page: String(p) })}`;
  const linkClass =
    "inline-flex min-h-10 items-center gap-1 rounded-[10px] border border-line-default px-3 text-body-sm text-ink hover:bg-surface-sunken";
  return (
    <nav
      aria-label="Pages"
      className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3"
    >
      <span data-numeric className="text-meta text-ink-muted">
        {total} in total · page {Math.min(page, Math.max(totalPages, 1))} of{" "}
        {Math.max(totalPages, 1)}
      </span>
      <span className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={linkClass}>
            <ChevronLeft aria-hidden className="size-4" />
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={href(page + 1)} className={linkClass}>
            Next
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        ) : null}
      </span>
    </nav>
  );
}

/** First value of a search param, or the fallback. */
export function param(
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback = "",
): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? fallback;
}
