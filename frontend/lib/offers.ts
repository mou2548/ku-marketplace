/**
 * An offer, from the point of view of whoever is looking at it.
 *
 * The list and the detail screen used to work this out separately, and they
 * disagreed: the list drew both piles from the proposer's side ("Offered" /
 * "In return for") while the detail screen drew them from the viewer's ("You
 * give" / "You get"). Opening an offer therefore swapped the two piles and
 * changed the vocabulary at the same time.
 *
 * So it is derived once, here, the way `lib/inbox.ts` owns the action counts
 * and `lib/rooms.ts` owns the chat inbox. Both screens render what this
 * returns and neither reasons about who proposed what.
 *
 * The direction of the money is part of the answer: `additional_money` is
 * always put up by the proposer, which means it is money out for one side and
 * money in for the other. A bare "+฿2,000" chip sitting between two piles said
 * neither.
 */

import type { Item, Offer, UserSummary } from "@/lib/api/types";
import { formatPrice } from "@/lib/format-price";

export type MoneyDirection = "you-pay" | "you-receive";

export interface OfferSides {
  /** Everything that comes to the viewer, cash excluded. */
  youGet: Item[];
  /** Everything that leaves the viewer, cash excluded. */
  youGive: Item[];
  /** `additional_money`, always a positive number or zero. */
  money: number;
  moneyDirection: MoneyDirection;
  /** The other person, whichever side of the offer the viewer is on. */
  counterparty: UserSummary;
  viewerIsProposer: boolean;
}

export function offerSides(offer: Offer, viewerId: number): OfferSides {
  const viewerIsProposer = offer.proposer_id === viewerId;
  const money = Math.max(0, offer.additional_money);

  // A trade always moves exactly one unit of the post's item, whatever
  // `Item.quantity` says — see `acceptOffer`'s hardcoded `quantity: 1`.
  // Multi-listing means that field can now be the item's total stock across
  // every channel, not what's actually on the table in this one trade; the
  // composer already builds its own preview slot the same way (offer-composer
  // line ~99), this just does the same for the read-only review screens.
  const postSlot: Item = { ...offer.post.item, quantity: 1 };

  // The proposer puts up their items plus the cash and receives the post's
  // item. The post's owner is the mirror of that.
  return viewerIsProposer
    ? {
        youGet: [postSlot],
        youGive: offer.items,
        money,
        moneyDirection: "you-pay",
        counterparty: offer.post.seller,
        viewerIsProposer,
      }
    : {
        youGet: offer.items,
        youGive: [postSlot],
        money,
        moneyDirection: "you-receive",
        counterparty: offer.proposer,
        viewerIsProposer,
      };
}

/**
 * One item is named; more than one is counted. A card that spells out four
 * item names is no faster to read than the photos it sits under.
 */
function pile(items: Item[]): string {
  if (items.length === 0) return "nothing";
  if (items.length === 1) return items[0].name;
  return `${items.length} items`;
}

/**
 * The card's plain-language line, so an offer can be read without decoding two
 * rows of thumbnails.
 */
export function describeOffer(sides: OfferSides): string {
  const { youGet, youGive, money, moneyDirection } = sides;

  const getPart =
    money > 0 && moneyDirection === "you-receive"
      ? `${pile(youGet)} plus ${formatPrice(money)}`
      : pile(youGet);

  const givePart =
    money > 0 && moneyDirection === "you-pay"
      ? `${pile(youGive)} plus ${formatPrice(money)}`
      : pile(youGive);

  return `You get ${getPart}, and give ${givePart}.`;
}
