"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Handshake, MessagesSquare, Store } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { EmptyState } from "@/components/kit/empty-state";
import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { useStatusText } from "@/lib/i18n/status-text";
import type { GiveawayTicket, Transaction } from "@/lib/api/types";
import { deadlineFor } from "@/lib/inbox";
import {
  resolveTransactionActor,
  TICKET_STATUS,
  TRANSACTION_STATUS,
  type PromptAction,
  type TransactionStatus,
} from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * History, not conversation.
 *
 * The chat moved to `/chat` when the rooms were unified, which left this screen
 * free to do the job its name implies: every transaction the student has ever
 * been part of, in full, with nothing filtered away by default.
 *
 * A record you cannot find is not a record, so cancelled and refunded deals are
 * as visible as completed ones — those are exactly the ones people come looking
 * for.
 *
 * Offers are deliberately absent. They had a section here as well as a whole
 * tab of their own at `/offers`, so the same row appeared twice with different
 * actions attached. An offer is not yet a deal; it lives in the inbox until it
 * becomes one.
 */

type Lens = "all" | "buying" | "selling";
type StatusFilter = "all" | TransactionStatus;

const LENSES: Array<{ id: Lens; label: string }> = [
  { id: "all", label: "All" },
  { id: "buying", label: "Buying" },
  { id: "selling", label: "Selling" },
];

const STATUSES: StatusFilter[] = [
  "all",
  "Pending",
  "Processing",
  "Completed",
  "Cancelled",
  "Pending Refund",
  "Refunded",
];

export function HistoryList({
  transactions,
  tickets,
  viewerId,
}: {
  transactions: Transaction[];
  tickets: GiveawayTicket[];
  viewerId: number;
}) {
  const t = useTranslations();
  const st = useStatusText();
  const [lens, setLens] = useState<Lens>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const rows = useMemo(() => {
    return transactions
      .filter((tx) => {
        const isBuyer = tx.buyer_id === viewerId;
        if (tx.buyer_id !== viewerId && tx.seller_id !== viewerId) return false;
        if (lens === "buying" && !isBuyer) return false;
        if (lens === "selling" && isBuyer) return false;
        if (status !== "all" && tx.status !== status) return false;
        return true;
      })
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }, [transactions, lens, status, viewerId]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">{t("history.title")}</h1>
        <p className="text-body-sm text-ink-muted">
          Every deal you have been part of, including the ones that were
          cancelled or refunded.
        </p>
      </header>

      <div className="flex flex-wrap gap-4">
        <Filters
          label={t("history.side")}
          options={LENSES.map((l) => ({ id: l.id, label: l.label }))}
          value={lens}
          onChange={(v) => setLens(v as Lens)}
        />
        <Filters
          label={t("history.status")}
          options={STATUSES.map((s) => ({
            id: s,
            label: s === "all" ? "All" : st.of(TRANSACTION_STATUS[s]).label,
          }))}
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Handshake className="size-6" />}
          title={t("history.emptyTitle")}
          description={t("history.emptyBody")}
          action={
            <LinkButton href="/">
              <Store className="size-4" />{t("history.goToMarket")}</LinkButton>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((tx) => (
            <li key={tx.transaction_id}>
              <DealRow tx={tx} viewerId={viewerId} />
            </li>
          ))}
        </ul>
      )}

      {tickets.length > 0 ? (
        <section className="flex flex-col gap-2 border-t border-line pt-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[1.125rem] font-semibold">{t("history.giveaways")}</h2>
            <Link
              href="/giveaway"
              className="text-body-sm font-medium text-ink-brand hover:underline"
            >{t("history.seeAll")}</Link>
          </div>
          <ul className="flex flex-col gap-2">
            {tickets.map((ticket) => (
              <li key={ticket.ticket_id}>
                <Link href={`/giveaway/${ticket.giveaway_id}/ticket/${ticket.ticket_id}`}>
                  <Surface
                    as="div"
                    shape="card"
                    elevation="raised"
                    interactive
                    className="flex items-center gap-3 p-4"
                  >
                    {/* The photo the giveaway already carries, rather than a
                        generic gift icon on every row. */}
                    <span className="block w-14 shrink-0 overflow-hidden rounded-slot">
                      <PostImage
                        src={ticket.giveaway.images[0]?.image_url}
                        alt=""
                        aspectRatio={1}
                        sizes="56px"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {ticket.giveaway.item_name}
                      </p>
                      <p className="truncate text-caption text-ink-muted">
                        from {ticket.giveaway.giver.name} · collect at{" "}
                        {ticket.giveaway.pickup_location}
                      </p>
                    </div>
                    <StatusBadge status={TICKET_STATUS[ticket.status]} size="sm" />
                  </Surface>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

    </div>
  );
}

function Filters({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-overline text-ink-muted uppercase">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              // 44px, not 36px: ten of these wrap across the top of the
              // screen and it is the densest control cluster in the product.
              "min-h-11 rounded-pill px-3.5 text-caption font-medium",
              "transition-colors duration-[--dur-fast]",
              // --brand is green-600 at 4.04:1 against white, which CLAUDE.md
              // §4 calls an absolute rule with one exemption: labels at 16px
              // weight 600. A 13px weight-500 chip is not that exemption.
              // --bg-brand-band is green-700, 5.88:1, and is already the token
              // for solid brand chrome carrying a white label.
              value === o.id
                ? "bg-brand-band text-on-brand-strong shadow-raised"
                : "bg-surface-sunken text-ink-secondary shadow-sunken hover:bg-gray-200",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * One row carries the whole record: what, with whom, how it was handed over,
 * how much, where it got to, and whose move it is. The previous version showed
 * a name and a status pill, which is not a history — it is a teaser.
 */
/**
 * What the button says when it is the viewer's move. Keyed by the same
 * `PromptAction` the deal screen switches on, so the two cannot drift.
 */
const ACTION_CTA: Record<PromptAction | "none", string> = {
  "propose-appointment": "Arrange the meetup",
  "upload-slip": "Upload your slip",
  "review-slip": "Check the slip",
  "enter-tracking": "Add the tracking number",
  "confirm-delivery": "Confirm it arrived",
  "scan-qr": "Scan at handover",
  "refund-slip": "Upload the refund slip",
  none: "Open the deal",
};

function DealRow({ tx, viewerId }: { tx: Transaction; viewerId: number }) {
  const st = useStatusText();
  const viewer = tx.buyer_id === viewerId ? "buyer" : "seller";
  const prompt = resolveTransactionActor(tx, viewer);
  const isViewersTurn = prompt.actor === viewer;
  const deadline = deadlineFor(tx);
  const other = viewer === "buyer" ? tx.seller : tx.buyer;
  const isTrade = tx.offer_id != null;

  /**
   * Two facts, not six.
   *
   * The row used to build Deal number, Type, Handover, Amount, Started and
   * sometimes Tracking, and render them as a two-column grid at 360px under
   * 11px uppercase labels — three rows of micro-type between the photograph
   * and the action, on a screen the owner called too dense. Amount and date
   * are what someone scanning their history is looking for. The deal number
   * and the tracking number are lookups, and they are on the deal itself.
   * "Handover" only ever said "Meetup": PRODUCT.md makes a trade meetup-only.
   */
  const facts: Array<[string, string]> = [
    [
      isTrade ? "Trade" : "Sale",
      tx.final_amount > 0 ? `฿${tx.final_amount.toLocaleString("en-GB")}` : "No money",
    ],
    [
      "Started",
      new Date(tx.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    ],
  ];

  return (
    <Surface shape="card" className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* A row of pure type is unreadable at a glance in a product where
            every record has a photograph attached to it. */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Link
            href={`/market/${tx.post_id}`}
            aria-hidden
            tabIndex={-1}
            className="block w-16 shrink-0 overflow-hidden rounded-slot"
          >
            <PostImage
              src={
                tx.post.item.images.find((i) => i.is_primary)?.image_url ??
                tx.post.item.images[0]?.image_url
              }
              alt=""
              aspectRatio={1}
              sizes="64px"
            />
          </Link>

          <div className="min-w-0">
            {/* The item was a dead string; it is the one thing on the row a
                student wants to open. */}
            <Link
              href={`/market/${tx.post_id}`}
              className="block truncate font-semibold hover:underline"
            >
              {tx.post.item.name}
            </Link>
            <p className="truncate text-caption text-ink-muted">
              {viewer === "buyer" ? "Bought from" : "Sold to"} {other.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {deadline ? <CountdownPill deadline={deadline} /> : null}
          <StatusBadge status={TRANSACTION_STATUS[tx.status]} size="sm" />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-meta tracking-[0.06em] text-ink-muted uppercase">
              {label}
            </dt>
            <dd data-numeric className="truncate text-body-sm font-medium">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        {/* The turn used to be a solid pill at 12px with no whitespace-nowrap,
            so "Your turn: transfer the money and upload the slip" wrapped to
            three lines inside a fully rounded shape, below the register's
            floor for text a reader acts on. It is a sentence; it is set as
            one, and the weight carries whose turn it is. */}
        <span
          className={cn(
            "min-w-0 flex-1 text-body-sm",
            isViewersTurn ? "font-semibold text-ink" : "text-ink-muted",
          )}
        >
          {st.key(prompt.labelKey)}
        </span>

        {/* ActorPrompt carries `action` — "upload-slip", "scan-qr" — and this
            row threw it away. The code knew the viewer had to upload a slip
            and offered them a chat. */}
        <LinkButton
          variant={isViewersTurn ? "primary" : "secondary"}
          size="md"
          href={`/history/${tx.transaction_id}`}
        >
          <MessagesSquare className="size-4" />
          {isViewersTurn ? ACTION_CTA[prompt.action ?? "none"] : "Go to chat"}
        </LinkButton>
      </div>
    </Surface>
  );
}
