"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock, Radio } from "lucide-react";

import { AdminPill } from "@/components/admin/admin-ui";
import {
  AdminTable,
  AdminTd,
  AdminTh,
  AdminUserCell,
} from "@/components/admin/admin-table";
import { unwrapAction } from "@/lib/action-result";
import { pollAdminTransactions } from "@/lib/actions/admin";
import type { AdminTransactionRow } from "@/lib/api/admin";
import type { PageResult } from "@/lib/api/sellers";
import {
  transactionStatusLabel,
  formatBaht,
  formatCount,
} from "@/lib/admin-labels";
import { formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";

/** How often the table asks again (team choice 2026-10-27: polling). */
const POLL_MS = 5_000;
/** How long a new or changed row stays marked. */
const MARK_MS = 8_000;

const rowKey = (row: AdminTransactionRow) =>
  `${row.status}|${row.locking_report_id ?? ""}`;

/**
 * Every deal, kept current by polling the same query every few seconds while
 * the tab is visible. A row that is new or whose status changed since the
 * last poll is marked for a few seconds, and the change is announced to
 * screen readers once, politely. The page keys this on the query, so a new
 * filter or page starts fresh from the server's `initial`.
 */
export function LiveTransactions({
  initial,
  query,
}: {
  initial: PageResult<AdminTransactionRow>;
  query: string;
}) {
  const [page, setPage] = useState(initial);
  const [marked, setMarked] = useState<Map<number, number>>(new Map());
  const [announcement, setAnnouncement] = useState("");
  const [stale, setStale] = useState(false);
  const known = useRef(
    new Map(initial.data.map((row) => [row.transaction_id, rowKey(row)])),
  );

  useEffect(() => {
    let cancelled = false;
    // One request at a time: a slow response can never land after, and
    // overwrite, a newer one.
    let inFlight = false;
    async function poll() {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const next = await unwrapAction(pollAdminTransactions(query));
        if (cancelled) return;
        const now = Date.now();
        const changed: number[] = [];
        for (const row of next.data) {
          const before = known.current.get(row.transaction_id);
          if (before !== rowKey(row)) changed.push(row.transaction_id);
        }
        known.current = new Map(
          next.data.map((row) => [row.transaction_id, rowKey(row)]),
        );
        setPage(next);
        setStale(false);
        if (changed.length) {
          setMarked((prev) => {
            const copy = new Map(prev);
            for (const id of changed) copy.set(id, now + MARK_MS);
            return copy;
          });
          setAnnouncement(
            `${changed.length} ${changed.length === 1 ? "deal" : "deals"} updated`,
          );
        }
      } catch {
        if (!cancelled) setStale(true);
      } finally {
        inFlight = false;
      }
    }
    const timer = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [query]);

  // Drop marks once they expire.
  useEffect(() => {
    if (marked.size === 0) return;
    const timer = window.setTimeout(() => {
      const now = Date.now();
      setMarked((prev) => new Map([...prev].filter(([, until]) => until > now)));
    }, 1_000);
    return () => window.clearTimeout(timer);
  }, [marked]);

  return (
    <>
      <p className="flex items-center gap-1.5 px-4 pb-2 text-meta text-ink-muted">
        <Radio aria-hidden className="size-3.5" />
        {stale
          ? "Could not refresh. Retrying."
          : `Updates every ${POLL_MS / 1000} seconds`}
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
      </p>
      <AdminTable
        caption="All transactions, newest first"
        minWidth={880}
        empty={page.data.length ? undefined : "No deal matches these filters."}
        head={
          <>
            <AdminTh>Deal</AdminTh>
            <AdminTh>Item</AdminTh>
            <AdminTh>Buyer</AdminTh>
            <AdminTh>Seller</AdminTh>
            <AdminTh align="right">Qty</AdminTh>
            <AdminTh align="right">Amount</AdminTh>
            <AdminTh>Status</AdminTh>
          </>
        }
      >
        {page.data.map((row) => {
          const isMarked = marked.has(row.transaction_id);
          return (
            <tr
              key={row.transaction_id}
              className={cn(
                "border-t border-line transition-colors duration-700 motion-reduce:transition-none",
                isMarked ? "bg-brand-subtle" : "hover:bg-surface-sunken/60",
              )}
            >
              <AdminTd numeric>
                <span className="font-medium text-ink">
                  #{row.transaction_id}
                </span>
                {isMarked ? (
                  <span className="ml-1.5 text-meta font-medium text-ink-brand">
                    Updated
                  </span>
                ) : null}
                <span className="block text-meta text-ink-muted">
                  {formatDateTime(row.created_at)}
                </span>
              </AdminTd>
              <AdminTd>
                <Link
                  href={`/admin/items/${row.item_id}`}
                  className="hover:underline"
                >
                  {row.item_name}
                </Link>
                <span className="block text-meta text-ink-muted">
                  {row.kind === "buy" ? "Purchase" : "Trade"} ·{" "}
                  {row.delivery_method}
                </span>
              </AdminTd>
              <AdminTd>
                <AdminUserCell user={row.buyer} />
              </AdminTd>
              <AdminTd>
                <AdminUserCell user={row.seller} />
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatCount(row.quantity)}
              </AdminTd>
              <AdminTd align="right" numeric>
                {formatBaht(row.total_amount)}
              </AdminTd>
              <AdminTd>
                <span className="flex flex-wrap items-center gap-1.5">
                  <AdminPill status={transactionStatusLabel(row.status)} />
                  {row.locking_report_id ? (
                    <Link
                      href={`/admin/reports/${row.locking_report_id}`}
                      className="inline-flex items-center gap-1 text-meta text-ink-secondary hover:underline"
                    >
                      <Lock aria-hidden className="size-3.5" />
                      Report #{row.locking_report_id}
                    </Link>
                  ) : null}
                </span>
              </AdminTd>
            </tr>
          );
        })}
      </AdminTable>
    </>
  );
}
