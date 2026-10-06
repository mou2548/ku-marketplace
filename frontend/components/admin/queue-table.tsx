"use client";

import { useState } from "react";
import Link from "next/link";
import {
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

/**
 * Every open case in one table, oldest first. The filter only narrows what is
 * on screen; the order stays oldest first so nothing waits unseen.
 * `now` comes from the server render so server and client agree on ages.
 */
export function QueueTable({ rows, now }: { rows: QueueRow[]; now: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown =
    filter === "all" ? rows : rows.filter((row) => row.kind === filter);

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
                <Th icon={<FileText />}>Case</Th>
                <Th icon={<Loader />}>Status</Th>
                <Th icon={<Clock />}>Waiting</Th>
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
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-4 py-2 font-medium [&+th]:border-l [&+th]:border-line"
    >
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="text-ink-muted [&_svg]:size-3.5">
          {icon}
        </span>
        {children}
      </span>
    </th>
  );
}
