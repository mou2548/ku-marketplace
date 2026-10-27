"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import type { TrendPoint } from "@/lib/api/admin";
import { formatBaht, formatCount } from "@/lib/admin-labels";

const DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const DAY_LONG = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
/** Points are Bangkok calendar days ("2026-10-05"); read them as plain dates. */
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

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
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-line)"
                strokeDasharray="0"
              />
              <XAxis
                dataKey="day"
                tickFormatter={(day: string) => DAY_LABEL.format(asDate(day))}
                tickLine={false}
                axisLine={{ stroke: "var(--color-line-default)" }}
                tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => `฿${COMPACT.format(v)}`}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
                width={56}
                allowDecimals={false}
              />
              <Tooltip
                content={TrendTooltip}
                cursor={{ stroke: "var(--color-line-strong)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                name="Sales"
                stroke="var(--color-chart-series)"
                strokeWidth={2}
                fill="var(--color-chart-series)"
                fillOpacity={0.12}
                activeDot={{
                  r: 4,
                  fill: "var(--color-chart-series)",
                  stroke: "var(--color-surface)",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <details className="text-body-sm">
        <summary className="cursor-pointer text-meta text-ink-muted hover:text-ink">
          Show as a table
        </summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-[8px] border border-line">
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
        </div>
      </details>
    </figure>
  );
}

function TrendTooltip({
  active,
  payload,
}: TooltipContentProps<ValueType, NameType>) {
  const point = payload?.[0]?.payload as TrendPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-[8px] border border-line bg-surface px-3 py-2 text-body-sm shadow-overlay">
      <p className="text-meta text-ink-muted">{DAY_LONG.format(asDate(point.day))}</p>
      <p data-numeric className="font-semibold text-ink">
        {formatBaht(point.amount)}
      </p>
      <p data-numeric className="text-meta text-ink-secondary">
        {formatCount(point.count)} {point.count === 1 ? "deal" : "deals"},{" "}
        {formatCount(point.completed_count)} completed
      </p>
    </div>
  );
}
