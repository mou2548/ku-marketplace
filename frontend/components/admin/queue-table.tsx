"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock,
  CreditCard,
  FileText,
  Flag,
  Loader,
  Scale,
} from "lucide-react";

import {
  OVERDUE_AFTER_MS,
  waitingFor,
  type QueueKind,
  type QueueRow,
} from "@/lib/admin-labels";
import { cn } from "@/lib/utils";

import { AdminPill } from "./admin-ui";

const KIND_ICON: Record<QueueKind, typeof Flag> = {
  report: Flag,
  appeal: Scale,
  membership: CreditCard,
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "report", label: "Reports" },
  { id: "appeal", label: "Appeals" },
  { id: "membership", label: "Memberships" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];

type SortKey = "case" | "status" | "waiting";
interface Sort {
  key: SortKey;
  /** For "waiting", ascending means longest wait first. */
  dir: "asc" | "desc";
}

/** Status order when sorting by status: untouched cases first. */
const STATUS_RANK: Record<string, number> = {
  New: 0,
  "Slip to check": 1,
  "Under investigation": 2,
  "Under review": 2,
};

function compare(a: QueueRow, b: QueueRow, key: SortKey): number {
  if (key === "case")
    return a.title.localeCompare(b.title, undefined, { numeric: true });
  if (key === "status")
    return (
      (STATUS_RANK[a.status.label] ?? 9) - (STATUS_RANK[b.status.label] ?? 9) ||
      Date.parse(a.createdAt) - Date.parse(b.createdAt)
    );
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

/**
 * Every open case in one table, oldest first. The filter only narrows what is
 * on screen; the order stays oldest first so nothing waits unseen.
 * `now` comes from the server render so server and client agree on ages.
 */
export function QueueTable({ rows, now }: { rows: QueueRow[]; now: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>({ key: "waiting", dir: "asc" });
  const filtered =
    filter === "all" ? rows : rows.filter((row) => row.kind === filter);
  const shown = [...filtered].sort((a, b) => {
    const order = compare(a, b, sort.key);
    return sort.dir === "asc" ? order : -order;
  });
  const sortBy = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  return (
    <>
      <div
        role="group"
        aria-label="Filter the queue"
        className="inline-flex max-w-full flex-wrap rounded-[8px] border border-line-default p-0.5"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "min-h-8 rounded-[6px] px-2.5 text-meta transition-colors",
              filter === f.id
                ? "bg-surface-sunken font-medium text-ink"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative -mx-4 mt-3 overflow-x-auto border-t border-line">
        {shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-body-sm text-ink-muted">
            Nothing waiting here. New cases appear as soon as they are filed.
          </p>
        ) : (
          <table className="w-full min-w-[520px] border-collapse text-body-sm">
            <thead>
              <tr className="bg-surface-sunken text-left text-meta text-ink-secondary">
                <Th icon={<FileText />} sortKey="case" sort={sort} onSort={sortBy}>
                  Case
                </Th>
                <Th icon={<Loader />} sortKey="status" sort={sort} onSort={sortBy}>
                  Status
                </Th>
                <Th icon={<Clock />} sortKey="waiting" sort={sort} onSort={sortBy}>
                  Waiting
                </Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => {
                const Icon = KIND_ICON[row.kind];
                const overdue =
                  now - Date.parse(row.createdAt) > OVERDUE_AFTER_MS;
                return (
                  <tr
                    key={row.key}
                    className="border-t border-line hover:bg-surface-sunken/60"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Icon
                          aria-hidden
                          className="size-4 shrink-0 text-ink-muted"
                        />
                        <div className="min-w-0">
                          <Link
                            href={row.href}
                            className="font-medium text-ink hover:underline"
                          >
                            {row.title}
                          </Link>
                          <p className="text-meta text-ink-muted">
                            {row.detail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="border-l border-line px-4 py-2.5">
                      <AdminPill status={row.status} />
                    </td>
                    <td
                      data-numeric
                      className={cn(
                        "whitespace-nowrap border-l border-line px-4 py-2.5",
                        overdue
                          ? "font-medium text-tone-danger-fg"
                          : "text-ink-secondary",
                      )}
                    >
                      {waitingFor(row.createdAt, now)}
                      {overdue ? (
                        <span className="sr-only"> (overdue)</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Th({
  icon,
  sortKey,
  sort,
  onSort,
  children,
}: {
  icon: React.ReactNode;
  sortKey: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
  children: React.ReactNode;
}) {
  const active = sort.key === sortKey;
  // "waiting" ascending shows the oldest first, i.e. longest wait on top.
  const ariaSort = active
    ? sort.dir === "asc"
      ? sortKey === "waiting"
        ? "descending"
        : "ascending"
      : sortKey === "waiting"
        ? "ascending"
        : "descending"
    : "none";
  const Arrow = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className="whitespace-nowrap p-0 font-medium [&+th]:border-l [&+th]:border-line"
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "flex w-full items-center gap-1.5 px-4 py-2 text-left hover:text-ink",
          active && "text-ink",
        )}
      >
        <span aria-hidden className="text-ink-muted [&_svg]:size-3.5">
          {icon}
        </span>
        {children}
        <Arrow
          aria-hidden
          className={cn("size-3.5", active ? "text-ink" : "text-ink-muted/60")}
        />
      </button>
    </th>
  );
}
