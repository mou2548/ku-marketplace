"use client";

import { getCopy } from "@/lib/copy";
import { ArrowDownLeft, ArrowUpRight, Coins, PackageOpen, X } from "lucide-react";

import type { InventoryItem } from "./inventory-slot";
import { EmptySlot, InventoryGrid, InventorySlot } from "./inventory-slot";
import { Surface } from "./surface";
import { TextInput } from "./field";
import type { MoneyDirection } from "@/lib/offers";
import { cn } from "@/lib/utils";

/**
 * The trade bench — persona P3, research R5, design principle 6.
 *
 * A trade is two inventories negotiating, not a form. The old UI asked the
 * user to tick items in a list and type a number, which makes fairness
 * impossible to judge. Here both stacks sit facing each other with the cash
 * gap between them, so "who is getting the better deal" is answerable without
 * reading a single label.
 *
 * Layout: side-by-side on desktop, stacked on mobile — 360px cannot fit two
 * stacks abreast. The cash field stays in the middle, on the seam, so the
 * comparison survives the geometry change (docs/design/ia.md §5). The slots
 * carry the game DNA; their containers stay quiet enough for product photos
 * and the trade direction to remain the visual hierarchy.
 *
 * Items move by clicking: tap one in your inventory to place it on the bench,
 * tap it on the bench to take it back. GridList makes each slot a keyboard
 * button (Enter to act), so the whole bench works without a pointer — CLAUDE.md
 * §6.
 *
 * The sides are named for the viewer, not for the proposer. They used to be
 * `offered`/`wanted`, which meant something different depending on which side
 * of the offer you were on — and one call site duly filled them in backwards,
 * so the same trade drew in two different arrangements.
 */

export interface TradeBenchProps {
  /** What leaves the viewer. The editable side. */
  youGive: InventoryItem[];
  onYouGiveChange: (next: InventoryItem[]) => void;
  /** What comes to the viewer. Read-only — it is the other side's stack. */
  youGet: InventoryItem[];
  additionalMoney: number;
  onAdditionalMoneyChange: (value: number) => void;
  /** Which way the cash travels, so the field can say whose it is. */
  moneyDirection: MoneyDirection;
  /**
   * The other person, named. Without it both panels are the same plate with
   * the same grid and the direction rests entirely on two words.
   */
  counterpartyName?: string;
  /** Minimum number of empty wells to keep visible on the bench. */
  minSlots?: number;
  isReadOnly?: boolean;
  className?: string;
}

const OVERLINE =
  "text-overline text-ink-muted uppercase";

export function TradeBench({
  youGive,
  onYouGiveChange,
  youGet,
  additionalMoney,
  onAdditionalMoneyChange,
  moneyDirection,
  counterpartyName,
  minSlots = 3,
  isReadOnly = false,
  className,
}: TradeBenchProps) {
  const t = getCopy();
  const remove = (id: number) =>
    onYouGiveChange(youGive.filter((i) => i.item_id !== id));

  const emptyWells = Math.max(0, minSlots - youGive.length);
  const youPay = moneyDirection === "you-pay";

  return (
    <div
      className={cn(
        "grid gap-3 lg:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] lg:items-stretch lg:gap-4",
        className,
      )}
    >
      {/* ---- What you receive ---- *
       * First, on both axes. The question anyone opens an offer with is what
       * is in it for them, and on a phone the top of the column is the answer
       * they see without scrolling. */}
      <Surface
        as="section"
        shape="panel"
        className="overflow-hidden p-0"
        aria-label={t("offer.whatYouReceive")}
      >
        <div aria-hidden className="h-1 bg-tone-success-solid" />
        <div className="p-4">
          <header className="mb-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-[1.125rem] leading-[1.4] font-semibold">
                <ArrowDownLeft
                  aria-hidden
                  className="size-[1.125rem] shrink-0 text-tone-success-fg"
                />
                {t("offer.youGet")}
              </h3>
              <span data-numeric className="text-caption text-ink-muted">
                {t("offer.itemCount", { count: youGet.length })}
              </span>
            </div>
            <p className={cn("mt-1", OVERLINE)}>
              {counterpartyName
                ? t("offer.fromPerson", { name: counterpartyName })
                : t("offer.fromThem")}
            </p>
          </header>

          <InventoryGrid
            aria-label={t("offer.itemsComing")}
            items={youGet}
            selectionMode="none"
            className="grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4"
          >
            {(item: InventoryItem) => (
              <InventorySlot id={item.item_id} item={item} showName />
            )}
          </InventoryGrid>

          {youGet.length === 0 ? (
            <div className="flex min-h-16 items-center justify-center gap-2 rounded-control bg-surface-sunken text-body-sm text-ink-muted">
              <PackageOpen aria-hidden className="size-4" />
              <span>No item</span>
            </div>
          ) : null}
        </div>
      </Surface>

      {/* ---- The seam: cash gap + direction ---- */}
      <div className="flex shrink-0 flex-row items-center gap-3 rounded-card bg-tone-trade-bg/55 p-3 lg:flex-col lg:justify-center lg:text-center">
        {/* A bidirectional arrow sat here and stated no direction at all. The
            seam now says which way the cash travels in words, because that is
            the half of the trade the two item piles cannot show. */}
        <span
          aria-hidden
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-pill shadow-raised",
            isReadOnly && additionalMoney === 0
              ? "bg-surface text-ink-muted"
              : youPay
              ? "bg-tone-warning-bg text-tone-warning-fg"
              : "bg-tone-success-bg text-tone-success-fg",
          )}
        >
          {isReadOnly && additionalMoney === 0 ? (
            <Coins className="size-5" />
          ) : youPay ? (
            <ArrowUpRight className="size-5" />
          ) : (
            <ArrowDownLeft className="size-5" />
          )}
        </span>

        {additionalMoney > 0 ? (
          <p className="hidden text-center text-caption leading-[1.5] text-ink-secondary lg:block">
            <span className="font-semibold text-ink">
              {youPay
                ? t("offer.youAdd")
                : counterpartyName
                  ? t("offer.personAdds", { name: counterpartyName })
                  : t("offer.theyAdd")}
            </span>{" "}
            <span data-numeric>฿{additionalMoney.toLocaleString()}</span>
          </p>
        ) : null}

        {/* Whose money it is, said out loud. The proposer always puts up the
            cash, so on a received offer this is money arriving — labelling it
            "Add cash" told the wrong half of the trade to pay. */}
        {isReadOnly && additionalMoney === 0 ? (
          <div className="min-w-0 flex-1 lg:text-center">
            <p className="text-caption font-semibold text-ink-secondary">
              Cash
            </p>
            <p className="mt-0.5 text-meta text-ink-muted">No cash added</p>
          </div>
        ) : (
          <TextInput
            aria-label={
              youPay ? t("offer.yourExtraCash") : t("offer.theirExtraCash")
            }
            label={youPay ? t("offer.youAdd") : t("offer.theyAdd")}
            value={additionalMoney ? String(additionalMoney) : ""}
            onChange={(v) =>
              onAdditionalMoneyChange(Number(v.replace(/\D/g, "")) || 0)
            }
            isReadOnly={isReadOnly}
            inputMode="numeric"
            placeholder="0"
            icon={<Coins className="size-4" />}
            suffix={<span className="text-caption">{t("listing.thb")}</span>}
            className="flex-1 lg:w-full"
          />
        )}
      </div>

      {/* ---- What leaves you ---- */}
      <Surface
        as="section"
        shape="panel"
        className="overflow-hidden p-0"
        aria-label={t("offer.yourSide")}
      >
        <div aria-hidden className="h-1 bg-tone-trade-solid" />
        <div className="p-4">
          <header className="mb-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-[1.125rem] leading-[1.4] font-semibold">
                <ArrowUpRight
                  aria-hidden
                  className="size-[1.125rem] shrink-0 text-ink-muted"
                />
                {t("offer.youGive")}
              </h3>
              <span data-numeric className="text-caption text-ink-muted">
                {t("offer.itemCount", { count: youGive.length })}
              </span>
            </div>
            <p className={cn("mt-1", OVERLINE)}>
              {counterpartyName
                ? t("offer.toPerson", { name: counterpartyName })
                : t("offer.toThem")}
            </p>
          </header>

          <InventoryGrid
            aria-label={t("offer.onTable")}
            items={youGive}
            selectionMode="none"
            renderEmptyState={() => null}
            className="grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4"
          >
            {(item: InventoryItem) => (
              <InventorySlot
                id={item.item_id}
                item={item}
                showName
                onAction={isReadOnly ? undefined : () => remove(item.item_id)}
                badge={
                  /* Tapping the item removed it, with no X, no confirmation,
                   and a slot identical to the read-only ones opposite. The
                   only hint was a 13px line at the bottom of the panel. The
                   tap still works; it is just no longer the only way to find
                   out that it does. */
                  isReadOnly ? undefined : (
                    <span
                      aria-hidden
                      className="touch-target grid size-6 place-items-center rounded-pill bg-surface-inverse/80 text-white"
                    >
                      <X className="size-3.5" />
                    </span>
                  )
                }
              />
            )}
          </InventoryGrid>

          {isReadOnly && youGive.length === 0 ? (
            <div className="flex min-h-16 items-center justify-center gap-2 rounded-control bg-surface-sunken text-body-sm text-ink-muted">
              <PackageOpen aria-hidden className="size-4" />
              <span>No item</span>
            </div>
          ) : null}

          {emptyWells > 0 ? (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {Array.from({ length: emptyWells }, (_, i) => (
                <EmptySlot key={i} label={t("inventory.emptySlot")} />
              ))}
            </div>
          ) : null}

          {!isReadOnly && youGive.length > 0 ? (
            <p className="mt-3 text-caption leading-[1.5] text-ink-muted">
              {t("offer.tapToRemove")}
            </p>
          ) : null}
        </div>
      </Surface>
    </div>
  );
}

/**
 * The proposer's inventory panel. Kept separate from TradeBench so a page can
 * place it wherever the layout needs — a sheet on mobile, a rail on desktop.
 * Tapping an item hands it to `onAdd`, which places it on the bench.
 */
export function TradeSourcePanel({
  inventory,
  offeredIds,
  onAdd,
  className,
}: {
  inventory: InventoryItem[];
  offeredIds: Set<number>;
  onAdd: (item: InventoryItem) => void;
  className?: string;
}) {
  const t = getCopy();
  return (
    <Surface
      as="section"
      shape="panel"
      className={cn("overflow-hidden p-0", className)}
    >
      <div className="flex items-start gap-3 bg-brand-subtle/55 px-4 py-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-pill bg-surface text-ink-brand shadow-flat">
          <PackageOpen aria-hidden className="size-4" />
        </span>
        <div>
          <h3 className="text-[1.125rem] leading-[1.4] font-semibold">
            {t("offer.myInventory")}
          </h3>
          {/* This line used to live at the bottom of the "You give" panel, 13px
          and muted, pointing at a stash that was below the fold. An
          instruction belongs where the tap starts. */}
          <p className="mt-0.5 text-caption text-ink-muted">
            {t("offer.tapToPlace")}
          </p>
        </div>
      </div>
      <div className="p-4">
        <InventoryGrid
          aria-label={t("offer.myInventory")}
          items={inventory}
          selectionMode="none"
        >
          {(item: InventoryItem) => (
            <InventorySlot
              id={item.item_id}
              item={item}
              isPlaced={offeredIds.has(item.item_id)}
              showName
              onAction={() => onAdd(item)}
            />
          )}
        </InventoryGrid>
      </div>
    </Surface>
  );
}
