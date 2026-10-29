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

import { DAY_LABEL, DAY_LONG, asDate } from "./sales-trend-format";

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * The recharts half of `SalesTrendChart`, in its own module so it can be
 * loaded lazily. Fills its parent, which sets the height.
 */
export function SalesTrendPlot({ points }: { points: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        // The wrapper is aria-hidden (the table below carries the numbers), so
        // the plot must not take keyboard focus either (audit P04).
        accessibilityLayer={false}
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
