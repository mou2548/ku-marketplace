"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

import { useStatusText } from "@/lib/i18n/status-text";
import type { InboxEntry } from "@/lib/inbox";

import { CountdownPill } from "./countdown-pill";

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
  const t = useTranslations();
  const st = useStatusText();
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  const soonest = entries.find((e) => e.deadline)?.deadline;

  return (
    <section
      aria-label={t("deal.waitingOnYou")}
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
          className="grid size-6 shrink-0 place-items-center rounded-pill bg-white text-meta font-bold text-brand-strong"
        >
          {entries.length}
        </span>

        <span className="min-w-0 flex-1 truncate text-body font-medium">
          {entries.length === 1
            ? st.key(entries[0].prompt.labelKey)
            : `${entries.length} things need you`}
          {/* Was text-white/70 on --green-700: 3.78:1. Steps back by weight now. */}
          <span className="hidden font-normal sm:inline">
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
                  <span className="block truncate text-body font-medium">
                    {entry.title}
                  </span>
                  <span className="block truncate text-caption font-normal">
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

                {/* The strip is already a solid brand band, so a TONE_SOLID
                    pill on it was a fill on a fill — and the tone underneath
                    could not be read against green anyway. White on the band
                    is 5.88:1 and says the same thing. */}
                <span className="justify-self-end rounded-pill bg-white/15 px-2.5 py-1 text-caption font-medium whitespace-nowrap text-white">
                  {st.key(entry.prompt.labelKey)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
