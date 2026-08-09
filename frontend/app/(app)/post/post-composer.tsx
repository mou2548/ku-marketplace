"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import {
  ArrowLeftRight,
  Check,
  Coins,
  Gift,
  MapPin,
  Package,
  Plus,
  Sparkles,
  Store,
} from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { DatePickerField } from "@/components/kit/date-picker";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import { TwoColumn } from "@/components/kit/two-column";
import type { Item } from "@/lib/api/types";
import {
  ALLOCATION_METHOD,
  ITEM_CONDITION,
  POST_TYPE,
  type AllocationMethod,
  type PostType,
} from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * Pick, set terms, publish — on one screen.
 *
 * Multi-select is here because persona P2 clears a dorm room in a weekend and
 * posting twelve things one form at a time is the reason people give up
 * halfway. Terms apply to the whole selection; anything that needs different
 * terms is a second pass, which is still faster than twelve forms.
 *
 * Giving something away is a fourth kind of listing, not a different route.
 * It used to live at `/giveaway/new` behind a free-text form, which meant an
 * owner typed out an item they had already put in their inventory, and the
 * decision "sell it, trade it, or give it away" was split across two screens
 * that did not know about each other.
 */

/**
 * `PostType` is a backend enum and Giveaway is not one of its values — a
 * giveaway is a different table entirely. The extra member lives here, in the
 * screen that offers the choice, and never leaves it.
 */
type ListingKind = PostType | "Giveaway";

export function PostComposer({
  items,
  listedItemIds,
  initialKind = "SellOnly",
}: {
  items: Item[];
  listedItemIds: number[];
  initialKind?: ListingKind;
}) {
  const router = useRouter();
  const toast = useToast();
  const tz = getLocalTimeZone();
  const listed = useMemo(() => new Set(listedItemIds), [listedItemIds]);

  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [kind, setKind] = useState<ListingKind>(initialKind);
  const [price, setPrice] = useState("");
  const [wanted, setWanted] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  // Giveaway terms.
  const [place, setPlace] = useState("");
  const [method, setMethod] = useState<AllocationMethod>("Random");
  const [closeAt, setCloseAt] = useState<DateValue | null>(
    today(tz).add({ days: 2 }),
  );
  const [pickupFrom, setPickupFrom] = useState<DateValue | null>(
    today(tz).add({ days: 2 }),
  );
  const [pickupTo, setPickupTo] = useState<DateValue | null>(
    today(tz).add({ days: 5 }),
  );

  const unlisted = items.filter((i) => !listed.has(i.item_id));
  const alreadyListed = items.filter((i) => listed.has(i.item_id));

  const isGiveaway = kind === "Giveaway";
  const wantsPrice = kind === "SellOnly" || kind === "Both";
  const wantsTradeTerms = kind === "TradeOnly" || kind === "Both";
  const canPublish =
    picked.size > 0 &&
    (isGiveaway
      ? place.trim().length > 0 && !!closeAt
      : !wantsPrice || Number(price) > 0);

  function toggle(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function publish() {
    setBusy(true);
    // POST /giveaways or POST /posts, once per selected item. A giveaway
    // carries the item's name and description across because the giveaway
    // table has no item_id to point at (docs/design/api-gaps.md).
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);

    if (isGiveaway) {
      toast.show(
        picked.size === 1
          ? "Giveaway posted. Registration is open."
          : `Posted ${picked.size} giveaways. Registration is open.`,
      );
      router.push("/giveaway");
      return;
    }

    toast.show(
      picked.size === 1
        ? "Listed. It is live in the market now."
        : `Listed ${picked.size} items. They are live in the market now.`,
    );
    router.push("/");
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Surface
          shape="card"
          elevation="flat"
          fill="none"
          className="texture-grid flex flex-col items-center gap-3 px-6 py-12 text-center"
        >
          <span className="grid size-12 place-items-center rounded-pill bg-brand-subtle text-ink-brand">
            <Package aria-hidden className="size-5" />
          </span>
          <p className="max-w-sm text-[0.9375rem] leading-[1.7] text-ink-muted">
            You have nothing in your inventory yet. Add an item and you can list
            it from here straight away.
          </p>
          <LinkButton href="/inventory/new">
            <Plus className="size-4" />
            Add an item
          </LinkButton>
        </Surface>
      </div>
    );
  }

  /**
   * The stash, beside the terms rather than above them — the same arrangement
   * the trade composer uses, and the reason this screen no longer leaves half
   * a laptop window empty. On a phone it stacks first: you still pick, then set
   * the terms.
   */
  const stash = (
    <Surface as="section" shape="panel" className="flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-overline text-ink-muted uppercase">
          Your items
        </h2>
        <Link
          href="/inventory/new"
          className="flex items-center gap-1 text-[0.875rem] font-medium text-ink-brand hover:underline"
        >
          <Plus aria-hidden className="size-4" />
          Add
        </Link>
      </div>

      {unlisted.length === 0 ? (
        <Surface
          shape="card"
          elevation="flat"
          className="bg-brand-subtle border-l-4 border-l-brand p-4 text-[0.875rem] leading-[1.7] text-ink-secondary"
        >
          Everything you own is already on the market. Add a new item to list
          something else.
        </Surface>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {unlisted.map((item) => (
            <li key={item.item_id}>
              <ItemPick
                item={item}
                isPicked={picked.has(item.item_id)}
                onToggle={() => toggle(item.item_id)}
              />
            </li>
          ))}
        </ul>
      )}

      {alreadyListed.length > 0 ? (
        <details className="text-[0.8125rem] text-ink-muted">
          <summary className="cursor-pointer">
            {alreadyListed.length} already on the market
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {alreadyListed.map((item) => (
              <li key={item.item_id} className="flex items-center gap-2">
                <span className="truncate">{item.name}</span>
                <StatusBadge
                  status={POST_TYPE.SellOnly}
                  size="sm"
                  iconOnly
                  className="shrink-0"
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Surface>
  );

  return (
    <TwoColumn rail={stash} railFirst>
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
          Post to the market
        </h1>
        <p className="text-[0.9375rem] leading-[1.7] text-ink-muted">
          Pick what you want to list, set the terms once, publish. Selling,
          trading and giving away all start here.
        </p>
      </header>

      {/* Terms only appear once something is picked: an empty form above an
          empty selection is two decisions presented as one. */}
      {picked.size > 0 ? (
        <section className="flex flex-col gap-5">
          <RadioGroupField
            label="What kind of listing is this"
            value={kind}
            onChange={(v) => setKind(v as ListingKind)}
            variant="card"
          >
            <Radio value="SellOnly" description="Cash only, no trades">
              <span className="flex items-center gap-2">
                <Store aria-hidden className="size-4" />
                {POST_TYPE.SellOnly.label}
              </span>
            </Radio>
            <Radio value="TradeOnly" description="Trades only, not for sale">
              <span className="flex items-center gap-2">
                <ArrowLeftRight aria-hidden className="size-4" />
                {POST_TYPE.TradeOnly.label}
              </span>
            </Radio>
            <Radio
              value="Both"
              description="Buy it or trade for it. One post accepts both."
            >
              <span className="flex items-center gap-2">
                <Sparkles aria-hidden className="size-4" />
                {POST_TYPE.Both.label}
              </span>
            </Radio>
            <Radio
              value="Giveaway"
              description="Free. People register, and recipients are chosen by the method you pick below."
            >
              <span className="flex items-center gap-2">
                <Gift aria-hidden className="size-4" />
                Give away
              </span>
            </Radio>
          </RadioGroupField>

          {isGiveaway ? (
            <>
              <TextInput
                label="Pickup location"
                value={place}
                onChange={setPlace}
                isRequired
                icon={<MapPin className="size-4" />}
                placeholder="e.g. Outside Engineering Building 1"
              />

              {/* Radio cards, not a dropdown: the three options carry three
                  different social contracts and the giver is choosing on
                  behalf of everyone who will register (research R7). */}
              <RadioGroupField
                label="How will recipients be chosen"
                value={method}
                onChange={(v) => setMethod(v as AllocationMethod)}
                variant="card"
                hint="This is shown on the post before anyone registers"
              >
                <Radio value="Random" description={ALLOCATION_METHOD.Random.hint}>
                  {ALLOCATION_METHOD.Random.label}
                </Radio>
                <Radio
                  value="FirstCome"
                  description={ALLOCATION_METHOD.FirstCome.hint}
                >
                  {ALLOCATION_METHOD.FirstCome.label}
                </Radio>
                <Radio
                  value="Manual"
                  description="You come back and pick recipients yourself. The other two are handled for you."
                >
                  {ALLOCATION_METHOD.Manual.label}
                </Radio>
              </RadioGroupField>

              <DatePickerField
                label="Registration closes"
                value={closeAt}
                onChange={setCloseAt}
                minValue={today(tz)}
                hint="At this point recipients are chosen by the method above and a chat room opens for them"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <DatePickerField
                  label="Pickup opens"
                  value={pickupFrom}
                  onChange={setPickupFrom}
                  minValue={closeAt ?? today(tz)}
                />
                <DatePickerField
                  label="Pickup closes"
                  value={pickupTo}
                  onChange={setPickupTo}
                  minValue={pickupFrom ?? today(tz)}
                />
              </div>

              <p className="rounded-control bg-tone-warning-bg p-3 text-[0.8125rem] leading-[1.6] text-tone-warning-fg">
                Recipients who do not collect within this window lose their
                ticket automatically.
              </p>
            </>
          ) : null}

          {wantsPrice ? (
            <TextInput
              label="Price"
              value={price}
              onChange={(v) => setPrice(v.replace(/\D/g, ""))}
              inputMode="numeric"
              isRequired
              icon={<Coins className="size-4" />}
              suffix={<span className="text-[0.8125rem]">THB</span>}
              hint={
                picked.size > 1
                  ? "This price applies to every item you selected. List them separately if they should differ."
                  : undefined
              }
            />
          ) : null}

          {wantsTradeTerms ? (
            <TextAreaField
              label="What do you want in trade"
              value={wanted}
              onChange={setWanted}
              rows={3}
              placeholder="e.g. Chemistry 1 textbook, or Calculus 2 notes"
              hint="Being specific filters out a lot of offers that miss the mark"
            />
          ) : null}

          <TextAreaField
            label={isGiveaway ? "Anything else to say" : "Listing description"}
            value={description}
            onChange={setDescription}
            rows={3}
            placeholder={
              isGiveaway
                ? "Why you are giving it away, what state it is in, any conditions"
                : "Meetup conditions, times that suit you, or anything else worth saying"
            }
          />
        </section>
      ) : null}

      <Surface
        shape="card"
        className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-[20] flex flex-wrap items-center gap-3 p-3"
      >
        <p className="min-w-0 flex-1 text-[0.875rem]">
          {picked.size === 0 ? (
            <span className="text-ink-muted">Pick at least one item</span>
          ) : (
            <span data-numeric className="font-medium">
              {picked.size} selected
            </span>
          )}
        </p>

        <Button
          size="lg"
          isDisabled={!canPublish}
          isLoading={busy}
          onPress={publish}
        >
          {isGiveaway ? (
            <>
              <Gift className="size-5" />
              Post giveaway
            </>
          ) : (
            <>
              <Store className="size-5" />
              Publish
            </>
          )}
        </Button>
      </Surface>
    </TwoColumn>
  );
}

function ItemPick({
  item,
  isPicked,
  onToggle,
}: {
  item: Item;
  isPicked: boolean;
  onToggle: () => void;
}) {
  const rarity = ITEM_CONDITION[item.condition];
  const primary = item.images.find((i) => i.is_primary) ?? item.images[0];

  return (
    <button
      type="button"
      aria-pressed={isPicked}
      onClick={onToggle}
      className="w-full text-left"
    >
      <Surface
        as="div"
        shape="card"
        elevation={isPicked ? "floating" : "raised"}
        className={cn(
          "flex items-center gap-3 p-3 transition-shadow",
          isPicked && "ring-2 ring-brand",
        )}
      >
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-[0.375rem]",
            isPicked
              ? "bg-brand text-on-brand shadow-raised"
              : "bg-surface-sunken shadow-sunken",
          )}
        >
          {isPicked ? (
            <Check aria-hidden className="size-3.5" strokeWidth={3} />
          ) : null}
        </span>

        <span
          className="block w-14 shrink-0 overflow-hidden rounded-slot"
          style={{ boxShadow: `0 0 0 2px ${rarity.edge}` }}
        >
          <PostImage src={primary?.image_url} alt="" aspectRatio={1} sizes="56px" />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[0.9375rem] font-semibold">
            {item.name}
          </span>
          <span className="truncate text-[0.8125rem] text-ink-muted">
            {item.category}
            <span aria-hidden> · </span>
            <span style={{ color: rarity.fg }}>{rarity.label}</span>
          </span>
        </span>
      </Surface>
    </button>
  );
}
