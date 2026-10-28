"use client";

import { useState } from "react";
import Link from "next/link";
import { ListBox, Popover, Select, SelectValue } from "react-aria-components";
import {
  ArrowUpDown,
  ChevronDown,
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

import { SelectOption } from "@/components/kit/choice";

import { AdminButton } from "./admin-controls";
import { AdminScroll } from "./admin-table";
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

/** The same kind of sort control as the market feed: one menu of orders. */
const SORTS = [
  { id: "oldest", label: "Waiting longest" },
  { id: "newest", label: "Newest first" },
  { id: "status", label: "Status (new first)" },
  { id: "case", label: "Case number" },
] as const;

type SortKey = (typeof SORTS)[number]["id"];

/** Status order when sorting by status: untouched cases first. */
const STATUS_RANK: Record<string, number> = {
  New: 0,
  "Slip to check": 1,
  "Under investigation": 2,
  "Under review": 2,
};

const age = (row: QueueRow) => Date.parse(row.createdAt);

function compare(a: QueueRow, b: QueueRow, key: SortKey): number {
  switch (key) {
    case "newest":
      return age(b) - age(a);
    case "status":
      return (
        (STATUS_RANK[a.status.label] ?? 9) -
          (STATUS_RANK[b.status.label] ?? 9) || age(a) - age(b)
      );
    case "case":
      return a.title.localeCompare(b.title, undefined, { numeric: true });
    default:
      return age(a) - age(b);
  }
}

/**
 * Every open case in one table, oldest first. The filter only narrows what is
 * on screen; the order stays oldest first so nothing waits unseen.
 * `now` comes from the server render so server and client agree on ages.
 */
export function QueueTable({ rows, now }: { rows: QueueRow[]; now: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("oldest");
  const filtered =
    filter === "all" ? rows : rows.filter((row) => row.kind === filter);
  const shown = [...filtered].sort((a, b) => compare(a, b, sort));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
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
                "touch-target min-h-8 rounded-[6px] px-2.5 text-meta transition-colors",
                filter === f.id
                  ? "bg-surface-sunken font-medium text-ink"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Select
          aria-label="Sort the queue"
          selectedKey={sort}
          onSelectionChange={(key) => setSort(key as SortKey)}
          className="shrink-0"
        >
          <AdminButton className="min-h-9 gap-1.5 px-3">
            <ArrowUpDown aria-hidden className="text-ink-muted" />
            <SelectValue className="text-body-sm">
              {({ selectedText }) => selectedText}
            </SelectValue>
            <ChevronDown aria-hidden className="text-ink-muted" />
          </AdminButton>
          <Popover
            placement="bottom end"
            className="z-[90] min-w-52 overflow-auto rounded-[10px] border border-line bg-surface p-1 shadow-overlay data-[entering]:anim-pop-in data-[exiting]:anim-fade-out"
          >
            <ListBox className="outline-none">
              {SORTS.map((option) => (
                <SelectOption
                  key={option.id}
                  id={option.id}
                  textValue={option.label}
                >
                  {option.label}
                </SelectOption>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      <AdminScroll
        label="Queue cases"
        className="relative -mx-4 mt-3 border-t border-line"
      >
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
                            className="touch-link font-medium text-ink hover:underline"
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
      </AdminScroll>
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
