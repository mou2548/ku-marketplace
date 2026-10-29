"use client";

import dynamic from "next/dynamic";

import type { TrendPoint } from "@/lib/api/admin";
import { formatBaht, formatCount } from "@/lib/admin-labels";

import { AdminScroll } from "./admin-table";
import { DAY_LONG, asDate } from "./sales-trend-format";

/**
 * recharts is the heaviest single dependency on the admin overview, and the
 * plot is decoration over the table below it, so it loads after the page is
 * interactive instead of in the route's first-load JavaScript (audit P03).
 * The placeholder holds the plot's exact height so nothing shifts when it
 * arrives.
 */
const SalesTrendPlot = dynamic(
  () => import("./sales-trend-plot").then((m) => m.SalesTrendPlot),
  {
    ssr: false,
    loading: () => (
      <div className="size-full animate-pulse rounded-[8px] bg-surface-sunken" />
    ),
  },
);

/**
 * Sales volume per day: one series, so one hue and no legend box (the heading
 * names it). Area under a 2px line for a trend over time, recessive grid and
 * axes, a crosshair tooltip for the exact figure, and the same numbers as a
 * table for anyone who cannot use the plot.
 */
export function SalesTrendChart({ points }: { points: TrendPoint[] }) {
  const empty = points.every((p) => p.amount === 0 && p.count === 0);

  return (
    <figure className="flex flex-col gap-2">
      <div className="h-56 w-full sm:h-64" aria-hidden={!empty ? true : undefined}>
        {empty ? (
          <p className="grid h-full place-items-center text-body-sm text-ink-muted">
            No sales in this range yet.
          </p>
        ) : (
          <SalesTrendPlot points={points} />
        )}
      </div>

      <details className="text-body-sm">
        <summary className="touch-target cursor-pointer text-meta text-ink-muted hover:text-ink">
          Show as a table
        </summary>
        <AdminScroll
          label="Sales per day"
          className="mt-2 max-h-64 overflow-y-auto rounded-[8px] border border-line"
        >
          <table className="w-full border-collapse text-body-sm">
            <caption className="sr-only">Sales per day</caption>
            <thead>
              <tr className="bg-surface-sunken text-left text-meta text-ink-secondary">
                <th scope="col" className="px-3 py-1.5 font-medium">Day</th>
                <th scope="col" className="px-3 py-1.5 text-right font-medium">Deals</th>
                <th scope="col" className="px-3 py-1.5 text-right font-medium">Completed</th>
                <th scope="col" className="px-3 py-1.5 text-right font-medium">Sales</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.day} className="border-t border-line">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    {DAY_LONG.format(asDate(p.day))}
                  </th>
                  <td data-numeric className="px-3 py-1.5 text-right">{formatCount(p.count)}</td>
                  <td data-numeric className="px-3 py-1.5 text-right">{formatCount(p.completed_count)}</td>
                  <td data-numeric className="px-3 py-1.5 text-right">{formatBaht(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminScroll>
      </details>
    </figure>
  );
}
