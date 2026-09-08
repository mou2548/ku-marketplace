"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Handshake, MessagesSquare, Store } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { SelectField, SelectOption } from "@/components/kit/choice";
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

const LENSES: Lens[] = ["all", "buying", "selling"];

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

  const statusOptions = STATUSES.map((item) => ({
    id: item,
    label:
      item === "all" ? t("history.all") : st.of(TRANSACTION_STATUS[item]).label,
  }));

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
      <header>
        <p className="text-overline font-semibold text-ink-brand uppercase">
          {t("history.purchaseRecord")}
        </p>
        <h1 className="mt-1 text-h1">{t("history.title")}</h1>
        <p className="mt-1 max-w-2xl text-body-sm text-ink-muted">
          {t("history.intro")}
        </p>
      </header>

      <div className="flex flex-col gap-4 border-b border-line sm:flex-row sm:items-end sm:justify-between">
        <fieldset>
          <legend className="sr-only">{t("history.side")}</legend>
          <div className="flex gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {LENSES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={lens === item}
                onClick={() => setLens(item)}
                className={cn(
                  "min-h-11 shrink-0 border-b-2 px-0.5 text-body transition-colors duration-[--dur-fast]",
                  lens === item
                    ? "border-brand font-semibold text-ink"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {t(`history.${item}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <SelectField
          aria-label={t("history.status")}
          selectedKey={status}
          onSelectionChange={(key) => setStatus(key as StatusFilter)}
          items={statusOptions}
          className="w-full pb-3 sm:w-56"
        >
          {(option) => (
            <SelectOption id={option.id} textValue={option.label}>
              {option.label}
            </SelectOption>
          )}
        </SelectField>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Handshake className="size-6" />}
          title={t("history.emptyTitle")}
          description={t("history.emptyBody")}
          action={
            <LinkButton href="/feed">
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
                        {t("history.giveawayMeta", {
                          name: ticket.giveaway.giver.name,
                          location: ticket.giveaway.pickup_location,
                        })}
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
  "propose-appointment": "arrangeMeetup",
  "upload-slip": "uploadSlip",
  "review-slip": "reviewSlip",
  "enter-tracking": "enterTracking",
  "confirm-delivery": "confirmDelivery",
  "scan-qr": "scanHandover",
  "refund-slip": "refundSlip",
  none: "openDeal",
};

function DealRow({ tx, viewerId }: { tx: Transaction; viewerId: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const st = useStatusText();
  const viewer = tx.buyer_id === viewerId ? "buyer" : "seller";
  const prompt = resolveTransactionActor(tx, viewer);
  const isViewersTurn = prompt.actor === viewer;
  const deadline = deadlineFor(tx);
  const other = viewer === "buyer" ? tx.seller : tx.buyer;
  const isTrade = tx.offer_id != null;

  const date = new Date(tx.created_at).toLocaleDateString(
    locale === "th" ? "th-TH" : "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );
  const amount =
    tx.final_amount > 0
      ? `฿${tx.final_amount.toLocaleString("en-GB")}`
      : t("history.noMoney");

  return (
    <Surface shape="card" className="overflow-hidden p-0">
      <div
        aria-hidden
        className={cn("h-1", isTrade ? "bg-tone-trade-solid" : "bg-brand")}
      />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-overline font-semibold text-ink-muted uppercase">
            {isTrade ? t("history.trade") : t("history.sale")} · {date}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {deadline ? <CountdownPill deadline={deadline} /> : null}
            <StatusBadge status={TRANSACTION_STATUS[tx.status]} size="sm" />
          </div>
        </div>

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
              {viewer === "buyer"
                ? t("history.boughtFrom", { name: other.name })
                : t("history.soldTo", { name: other.name })}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center justify-between gap-4 sm:justify-start">
            <span className="text-caption text-ink-muted">
              {t("history.total")}
            </span>
            <span data-numeric className="text-body-lg font-semibold text-ink">
              {amount}
            </span>
          </div>
        {/* The turn used to be a solid pill at 12px with no whitespace-nowrap,
            so "Your turn: transfer the money and upload the slip" wrapped to
            three lines inside a fully rounded shape, below the register's
            floor for text a reader acts on. It is a sentence; it is set as
            one, and the weight carries whose turn it is. */}
        <span
          className={cn(
            "min-w-0 flex-1 text-body-sm sm:text-right",
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
          {isViewersTurn
            ? t(`history.${ACTION_CTA[prompt.action ?? "none"]}`)
            : t("history.goToChat")}
        </LinkButton>
        </div>
      </div>
    </Surface>
  );
}
