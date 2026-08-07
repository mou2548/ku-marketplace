"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

import type { InboxEntry } from "@/lib/inbox";
import { cn } from "@/lib/utils";

import { CountdownPill } from "./countdown-pill";
import { TONE_WASH } from "./tone";

/**
 * Revised 2026-08-07. The first build made "what is waiting on you" the whole
 * home page (decision D2), which pushed the marketplace below a wall of admin
 * rows — a dashboard where a market should be.
 *
 * The finding behind D2 still holds: research R4 says "whose turn is it" is the
 * most-asked question, and persona P2 needs one place that lists every
 * obligation. What was wrong was the weight given to it. So it is a strip:
 * one line by default, expandable, above the feed, and gone entirely when
 * there is nothing waiting.
 */
export function ActionStrip({ entries }: { entries: InboxEntry[] }) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  const soonest = entries.find((e) => e.deadline)?.deadline;

  return (
    <section
      aria-label="Waiting on you"
      className="overflow-hidden rounded-card bg-brand-band text-white shadow-raised"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-3 px-4 text-left"
      >
        <span
          data-numeric
          className="grid size-6 shrink-0 place-items-center rounded-pill bg-white text-[0.75rem] font-bold text-brand-strong"
        >
          {entries.length}
        </span>

        <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">
          {entries.length === 1
            ? entries[0].prompt.label
            : `${entries.length} things need you`}
          <span className="hidden text-white/70 sm:inline">
            {" "}
            · {entries[0].title}
          </span>
        </span>

        {soonest ? (
          <span className="hidden shrink-0 sm:block">
            <CountdownPill deadline={soonest} className="bg-white/15 text-white" />
          </span>
        ) : null}

        {open ? (
          <ChevronUp aria-hidden className="size-4 shrink-0" />
        ) : (
          <ChevronDown aria-hidden className="size-4 shrink-0" />
        )}
      </button>

      {open ? (
        <ul className="flex flex-col gap-px bg-white/10">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={entry.href}
                className="grid grid-cols-[1fr_auto] items-center gap-3 bg-brand-band px-4 py-3 transition-colors hover:bg-brand-strong sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.9375rem] font-medium">
                    {entry.title}
                  </span>
                  <span className="block truncate text-[0.8125rem] text-white/70">
                    with {entry.counterparty}
                    {entry.amount ? ` · ฿${entry.amount.toLocaleString("en-GB")}` : ""}
                  </span>
                </span>

                <span className="hidden justify-self-start sm:block">
                  {entry.deadline ? (
                    <CountdownPill
                      deadline={entry.deadline}
                      className="bg-white/15 text-white"
                    />
                  ) : null}
                </span>

                <span
                  className={cn(
                    "justify-self-end rounded-pill px-2.5 py-1 text-[0.8125rem] font-medium whitespace-nowrap",
                    TONE_WASH[entry.prompt.tone],
                  )}
                >
                  {entry.prompt.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
