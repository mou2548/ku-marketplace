"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getLocalTimeZone,
  now,
  toCalendarDateTime,
  type CalendarDateTime,
} from "@internationalized/date";
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
  Users,
} from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { DatePickerField } from "@/components/kit/date-picker";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { Notice } from "@/components/patterns/notice";
import { useToast } from "@/components/kit/toast";
import { useStatusText } from "@/lib/status-text";
import { createGiveaway } from "@/lib/actions/giveaways";
import { publishListing } from "@/lib/actions/posts";
import type { ApiError } from "@/lib/api/client";
import { wireIdToNumber } from "@/lib/api/posts";
import type { Item } from "@/lib/api/types";
import {
  ALLOCATION_METHOD,
  ITEM_CONDITION,
  ITEM_STATUS,
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

/**
 * What the form is about to ask, shown while nothing is picked. Kept in step
 * with the fields below it — these are the four decisions the composer makes,
 * not marketing copy.
 */
const STEPS: Array<[key: string, label: string, detail: string]> = [
  ["pick", "Pick from your stuff", "Tick one or more items in the list above"],
  ["kind", "Say how it is going out", "For sale, for trade, both, or given away"],
  ["terms", "Set the terms once", "A price, what you want in trade, or a pickup place and a closing date"],
  ["publish", "Publish", "It appears in the market straight away and offers come to your inbox"],
];

export function PostComposer({
  items,
  listedItemIds,
  initialKind = "SellOnly",
}: {
  items: Item[];
  listedItemIds: number[];
  initialKind?: ListingKind;
}) {
  const st = useStatusText();
  const router = useRouter();
  const toast = useToast();
  const tz = getLocalTimeZone();
  const nowDT = toCalendarDateTime(now(tz));
  const listed = useMemo(() => new Set(listedItemIds), [listedItemIds]);

  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [kind, setKind] = useState<ListingKind>(initialKind);
  const [price, setPrice] = useState("");
  const [wanted, setWanted] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  // Giveaway terms.
  const [place, setPlace] = useState("");
  const [giveawayQuantity, setGiveawayQuantity] = useState("1");
  const [method, setMethod] = useState<AllocationMethod>("Random");
  const [registerStart, setRegisterStart] = useState<CalendarDateTime | null>(
    nowDT,
  );
  const [closeAt, setCloseAt] = useState<CalendarDateTime | null>(
    nowDT.add({ days: 2 }),
  );
  const [pickupStart, setPickupStart] = useState<CalendarDateTime | null>(
    nowDT.add({ days: 2 }),
  );
  const [pickupTo, setPickupTo] = useState<CalendarDateTime | null>(
    nowDT.add({ days: 5 }),
  );

  const unlisted = items.filter((i) => !listed.has(i.item_id));
  const alreadyListed = items.filter((i) => listed.has(i.item_id));

  const isGiveaway = kind === "Giveaway";
  const wantsPrice = kind === "SellOnly" || kind === "Both";
  const wantsTradeTerms = kind === "TradeOnly" || kind === "Both";
  const canPublish =
    picked.size > 0 &&
    (isGiveaway
      ? place.trim().length > 0 &&
        Number(giveawayQuantity) > 0 &&
        !!registerStart &&
        !!closeAt &&
        !!pickupStart &&
        !!pickupTo
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

    if (isGiveaway) {
      // POST /giveaways, once per selected item. A giveaway carries the
      // item's name, description and primary image across because the
      // giveaway table has no item_id to point at (docs/design/api-gaps.md
      // §1). Capacity and the separate registration/pickup deadlines are sent
      // explicitly. Collection has one final deadline in the API.
      const pickedItems = items.filter((i) => picked.has(i.item_id));
      try {
        const created = [];
        for (const item of pickedItems) {
          const primary = item.images.find((i) => i.is_primary) ?? item.images[0];
          created.push(
            await createGiveaway({
              item_name: item.name,
              quantity: Number(giveawayQuantity),
              description: description || item.description || undefined,
              pickup_location: place,
              allocation_method: method,
              register_start: registerStart
                ? registerStart.toDate(tz).toISOString()
                : undefined,
              register_deadline: closeAt
                ? closeAt.toDate(tz).toISOString()
                : undefined,
              pickup_start: pickupStart
                ? pickupStart.toDate(tz).toISOString()
                : undefined,
              pickup_deadline: pickupTo
                ? pickupTo.toDate(tz).toISOString()
                : undefined,
              images: primary ? [{ image_url: primary.image_url, display_order: 0 }] : [],
            }),
          );
        }
        toast.success(
          created.length === 1
            ? "Giveaway posted. Registration is open."
            : `Posted ${created.length} giveaways. Registration is open.`,
        );
        // Straight to the new post when there's exactly one — /giveaway's
        // "Open" tab lists real giveaways now (getGiveaways in
        // lib/api/giveaways.ts), but jumping to the post itself skips a
        // redundant round trip through the list.
        router.push(created.length === 1 ? `/giveaway/${created[0].giveaway_id}` : "/giveaway");
      } catch (error) {
        toast.error((error as ApiError).message ?? "Could not post the giveaway.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const pickedItems = items.filter((item) => picked.has(item.item_id));
    try {
      const created = await Promise.all(
        pickedItems.map((item) =>
          publishListing({
            item_id: item.item_id,
            post_type: kind,
            price: wantsPrice ? Number(price) : 0,
            quantity_total: item.quantity,
          }),
        ),
      );

      toast.success(
        created.length === 1
          ? "Listed. It is live in the market now."
          : `Listed ${created.length} items. They are live in the market now.`,
      );
      router.push(
        created.length === 1
          ? `/market/${wireIdToNumber(created[0].post_id)}`
          : "/feed",
      );
    } catch (error) {
      toast.error((error as ApiError).message ?? "Could not publish the listing.");
    } finally {
      setBusy(false);
    }
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
          <p className="max-w-sm text-body text-ink-muted">
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
          className="flex items-center gap-1 text-body-sm font-medium text-ink-brand hover:underline"
        >
          <Plus aria-hidden className="size-4" />
          Add
        </Link>
      </div>

      {unlisted.length === 0 ? (
        <Notice tone="brand" className="text-body-sm text-ink-secondary">
          Everything you own is already on the market. Add a new item to list
          something else.
        </Notice>
      ) : (
        // `min-w-0` on each item: a grid track defaults to `min-width:auto`,
        // so without it the row cannot shrink below its content and the page
        // scrolls sideways at 360px.
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {unlisted.map((item) => (
            <li key={item.item_id} className="min-w-0">
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
        <details className="text-caption text-ink-muted">
          <summary className="cursor-pointer">
            {alreadyListed.length} already on the market
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {alreadyListed.map((item) => (
              <li key={item.item_id} className="flex items-center gap-2">
                <span className="truncate">{item.name}</span>
                <StatusBadge
                  status={ITEM_STATUS.Listed}
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

  const publishBar = (
    <Surface
      shape="card"
      className="sticky action-bar-bottom z-[20] mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 p-3"
    >
      <p className="min-w-0 flex-1 text-body-sm">
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
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex max-w-prose flex-col gap-1">
        <h1 className="text-h1">Post to the market</h1>
        <p className="text-body text-ink-muted">
          Pick what you want to list, set the terms once, publish. Selling,
          trading and giving away all start here.
        </p>
      </header>

      {stash}

      {/* Terms only appear once something is picked: an empty form above an
          empty selection is two decisions presented as one. But an empty page
          is not the alternative — before anything is picked this says what the
          form is about to ask for, so the screen has a shape to fill in rather
          than a single disabled bar in a blank half-window. */}
      {picked.size === 0 ? (
        <ol className="grid items-stretch gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map(([step, label, detail], i) => (
            <li key={step}>
              <Surface
                shape="card"
                elevation="flat"
                className="flex h-full items-start gap-3 p-4"
              >
                <span
                  aria-hidden
                  data-numeric
                  className="grid size-6 shrink-0 place-items-center rounded-pill bg-gray-100 text-meta font-semibold text-ink-muted"
                >
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body font-medium">{label}</span>
                  <span className="text-caption leading-[1.6] text-ink-muted">
                    {detail}
                  </span>
                </span>
              </Surface>
            </li>
          ))}
        </ol>
      ) : null}

      {picked.size > 0 ? (
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <RadioGroupField
            label="What kind of listing is this"
            value={kind}
            onChange={(v) => setKind(v as ListingKind)}
            variant="card"
          >
            <Radio value="SellOnly" description="Cash only, no trades">
              <span className="flex items-center gap-2">
                <Store aria-hidden className="size-4" />
                {st.of(POST_TYPE.SellOnly).label}
              </span>
            </Radio>
            <Radio value="TradeOnly" description="Trades only, not for sale">
              <span className="flex items-center gap-2">
                <ArrowLeftRight aria-hidden className="size-4" />
                {st.of(POST_TYPE.TradeOnly).label}
              </span>
            </Radio>
            <Radio
              value="Both"
              description="Buy it or trade for it. One post accepts both."
            >
              <span className="flex items-center gap-2">
                <Sparkles aria-hidden className="size-4" />
                {st.of(POST_TYPE.Both).label}
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

              <TextInput
                label="Maximum recipients"
                value={giveawayQuantity}
                onChange={(value) =>
                  setGiveawayQuantity(value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                isRequired
                icon={<Users className="size-4" />}
                hint="The number of people who can receive this giveaway"
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
                <Radio value="Random" description={st.of(ALLOCATION_METHOD.Random).hint}>
                  {st.of(ALLOCATION_METHOD.Random).label}
                </Radio>
                <Radio
                  value="FirstCome"
                  description={st.of(ALLOCATION_METHOD.FirstCome).hint}
                >
                  {st.of(ALLOCATION_METHOD.FirstCome).label}
                </Radio>
                <Radio
                  value="Manual"
                  description="You come back and pick recipients yourself. The other two are handled for you."
                >
                  {st.of(ALLOCATION_METHOD.Manual).label}
                </Radio>
              </RadioGroupField>

              <DatePickerField
                label="Registration opens"
                value={registerStart}
                onChange={setRegisterStart}
                minValue={nowDT}
                showTimeField
                hint="Nobody can register before this time"
              />

              <DatePickerField
                label="Registration closes"
                value={closeAt}
                onChange={setCloseAt}
                minValue={registerStart ?? nowDT}
                showTimeField
                hint="At this point recipients are chosen by the method above and a chat room opens for them"
              />

              <DatePickerField
                label="Pickup window opens"
                value={pickupStart}
                onChange={setPickupStart}
                minValue={closeAt ?? nowDT}
                showTimeField
                hint="Recipients can start collecting from this time"
              />

              <DatePickerField
                label="Pickup deadline"
                value={pickupTo}
                onChange={setPickupTo}
                minValue={pickupStart?.add({ minutes: 1 }) ?? nowDT}
                showTimeField
                hint="Selected recipients must collect by this date"
              />

              <p className="rounded-control bg-tone-warning-bg p-3 text-caption leading-[1.6] text-tone-warning-fg">
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
              suffix={<span className="text-caption">THB</span>}
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

      {publishBar}
    </div>
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
  const st = useStatusText();
  const rarity = ITEM_CONDITION[item.condition];
  const primary = item.images.find((i) => i.is_primary) ?? item.images[0];

  return (
    <button
      type="button"
      aria-pressed={isPicked}
      onClick={onToggle}
      className="w-full min-w-0 text-left"
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
          className="block size-14 shrink-0 overflow-hidden rounded-slot ring-2 ring-[var(--slot-edge)]"
          style={{ "--slot-edge": rarity.edge } as React.CSSProperties}
        >
          <PostImage
            src={primary?.image_url}
            alt=""
            aspectRatio={1}
            sizes="56px"
            className="h-full"
          />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-body font-semibold">
            {item.name}
          </span>
          <span className="truncate text-caption text-ink-muted">
            {item.category}
            <span aria-hidden> · </span>
            <span className="font-medium text-ink-secondary">
              {st.of(rarity).label}
            </span>
          </span>
        </span>
      </Surface>
    </button>
  );
}
