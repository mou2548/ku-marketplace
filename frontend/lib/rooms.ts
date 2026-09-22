/**
 * Every conversation in one shape.
 *
 * `Chat_Room` makes the room the primary object: `room_id` is the key, and both
 * `transaction_id` and `giveaway_id` are nullable. A sale, a trade, and a
 * giveaway are the same thing to the database, and the review asked for them to
 * be the same thing to the student too — one inbox, one room, one URL.
 *
 * There is no "list my chat rooms" endpoint, backend-side or otherwise — a
 * `Chat_Room` row is only ever created lazily, the first time someone reads or
 * writes its messages (see `lib/api/chat.ts`/`lib/api/giveaways.ts`). So the
 * inbox is built the other way around: `rooms-query.ts` starts from "my
 * transactions" and "my giveaways" (both real, known upfront) and fetches each
 * one's chat state to learn its `room_id` and last message. This module is the
 * pure part of that — no I/O, just the shape and the sort.
 */

import type {
  AppointmentCardData,
  GiveawayPost,
  Transaction,
  UserSummary,
} from "@/lib/api/types";
import type { TicketStatus, Tone } from "@/lib/status";

export type RoomKind = "Sale" | "Trade" | "Giveaway";

export const ROOM_KIND_TONE: Record<RoomKind, Tone> = {
  Sale: "success",
  Trade: "trade",
  Giveaway: "warning",
};

export interface RoomSummary {
  room_id: number;
  kind: RoomKind;
  /** The other person. For a giveaway room that is the giver. */
  counterparty: UserSummary;
  /** What the conversation is about. */
  subject: string;
  /** The primary image of the item or giveaway that identifies this room. */
  subjectImage?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: number;
  /**
   * When this conversation last moved — the newest of its last message and
   * every timestamp the flow stamps on the way through (see
   * `transactionActivityAt`). This, not `lastMessageAt`, is what `recent`
   * sorts on: accepting an offer, approving a slip, proposing a meetup and
   * asking to cancel are all things the other side needs to see, and none of
   * them writes a chat message. `lastMessageAt` stays what it says it is —
   * the preview line's own timestamp.
   */
  lastActivityAt?: string;
  /** True when the flow is waiting on the viewer — sorts these to the top. */
  needsYou: boolean;
  href: string;
  transaction?: Transaction;
  giveaway?: GiveawayPost;
  /** Present when the viewer joined this giveaway rather than created it. */
  giveawayTicketStatus?: TicketStatus;
}

/** A trade and a sale are both transactions; the difference is whether an
 * offer created it. That distinction matters to the student — a trade has a
 * second pile of items behind it — so the inbox shows it. */
export function roomKind(transaction?: Transaction): RoomKind {
  if (!transaction) return "Giveaway";
  return transaction.offer_id != null ? "Trade" : "Sale";
}

export interface TransactionRoomSource {
  transaction: Transaction;
  roomId: number;
  viewerId: number;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: number;
  /**
   * Every `Appointment_Card` on this transaction, not just the live one —
   * a superseded card's `deleted_at` is the only stamp a "let's meet later
   * instead" leaves behind. Omitted for a Shipping deal, which has none.
   */
  appointments?: readonly AppointmentCardData[];
  /** Whose turn it is — sorts this room to the top of the inbox. */
  needsYou: boolean;
}

export interface GiveawayRoomSource {
  giveaway: GiveawayPost;
  roomId: number;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: number;
  ticketStatus?: TicketStatus;
}

/**
 * The newest of a set of ISO timestamps, ignoring the null, undefined and
 * unparseable ones. Returns the original string rather than a number so the
 * value stays the same shape as every other timestamp on `RoomSummary`.
 */
export function latestTimestamp(
  values: ReadonlyArray<string | null | undefined>,
): string | undefined {
  let newest: string | undefined;
  let newestMs = -Infinity;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isFinite(ms) || ms <= newestMs) continue;
    newest = value;
    newestMs = ms;
  }
  return newest;
}

/**
 * When a deal last moved, from the columns flow 1 already stamps.
 *
 * The inbox used to order on the last chat message alone, which meant the only
 * events that floated a room to the top were the ones a student typed. Every
 * other thing that actually needs their attention — an accepted offer opening
 * the room in the first place, a slip uploaded, a slip approved, a meetup
 * proposed, a cancellation asked for, a refund sent — left the row exactly
 * where it was, often far down a list, because none of them writes a message.
 *
 * `Transaction` has no `updated_at` (schema.prisma), so "when did this last
 * move" is assembled from the individual step columns instead. Two steps stamp
 * nothing at all and so cannot be seen here — see docs/design/api-gaps.md.
 */
export function transactionActivityAt(
  transaction: Transaction,
  appointments: readonly AppointmentCardData[] = [],
): string | undefined {
  return latestTimestamp([
    // The deal itself appearing is an event: an accepted offer or a completed
    // purchase is exactly the "a conversation just started" case.
    transaction.created_at,
    transaction.payment_confirmed_by_buyer_at,
    transaction.payment_confirmed_by_seller_at,
    transaction.item_received_confirmed_by_buyer_at,
    transaction.item_received_confirmed_by_seller_at,
    transaction.cancellation_requested_at,
    transaction.refund_submitted_at,
    transaction.item_return_confirmed_at,
    ...appointments.flatMap((card) => [card.created_at, card.deleted_at]),
  ]);
}

/**
 * How the inbox is ordered. `recent` is the default and the one the real-time
 * refresh relies on: whoever last typed floats to the top. `name` and
 * `counterparty` are the student-chosen alternatives (item name, other person).
 */
export type RoomSortMode = "recent" | "name" | "counterparty";

/** `lastActivityAt` already folds in `lastMessageAt` (see `buildRooms`); the
 * fallback is for a `RoomSummary` assembled without it. */
function recencyOf(room: RoomSummary): number {
  const value = room.lastActivityAt ?? room.lastMessageAt;
  return value ? Date.parse(value) : 0;
}

function byRecency(a: RoomSummary, b: RoomSummary): number {
  return recencyOf(b) - recencyOf(a);
}

/**
 * Orders rooms for display. `recent` is pure recency — whoever interacted last
 * sits on top, the way a messaging inbox (Instagram, Messenger) behaves: a new
 * message, incoming or outgoing, floats its room to the very top with nothing
 * pinned above it. `name` and `counterparty` reorder alphabetically and fall
 * back to recency to break ties, so the latest reply still rises within them.
 *
 * ("Your turn" is not a sort key — it stays a per-row badge, `RoomRow`'s
 * `needsYou` chip — because an inbox that reshuffles by whose turn it is stops
 * matching the "newest on top" rule the student expects from every chat app.)
 */
export function sortRooms(rooms: RoomSummary[], mode: RoomSortMode): RoomSummary[] {
  const within =
    mode === "name"
      ? (a: RoomSummary, b: RoomSummary) =>
          a.subject.localeCompare(b.subject) || byRecency(a, b)
      : mode === "counterparty"
        ? (a: RoomSummary, b: RoomSummary) =>
            a.counterparty.name.localeCompare(b.counterparty.name) || byRecency(a, b)
        : byRecency;

  return [...rooms].sort(within);
}

export function buildRooms({
  transactionRooms,
  giveawayRooms,
}: {
  transactionRooms: TransactionRoomSource[];
  giveawayRooms: GiveawayRoomSource[];
}): RoomSummary[] {
  const summaries: RoomSummary[] = [
    ...transactionRooms.map(
      ({
        transaction,
        roomId,
        viewerId,
        lastMessage,
        lastMessageAt,
        lastMessageSenderId,
        appointments,
        needsYou,
      }): RoomSummary => ({
        room_id: roomId,
        kind: roomKind(transaction),
        counterparty: transaction.buyer_id === viewerId ? transaction.seller : transaction.buyer,
        subject: transaction.post.item.name,
        subjectImage:
          transaction.post.item.images.find((image) => image.is_primary)?.image_url ??
          transaction.post.item.images[0]?.image_url ??
          null,
        lastMessage,
        lastMessageAt,
        lastMessageSenderId,
        lastActivityAt: latestTimestamp([
          lastMessageAt,
          transactionActivityAt(transaction, appointments),
        ]),
        needsYou,
        href: `/chat/${roomId}`,
        transaction,
      }),
    ),
    ...giveawayRooms.map(
      ({
        giveaway,
        roomId,
        lastMessage,
        lastMessageAt,
        lastMessageSenderId,
        ticketStatus,
      }): RoomSummary => ({
        room_id: roomId,
        kind: "Giveaway",
        counterparty: giveaway.giver,
        subject: giveaway.item_name ?? "",
        subjectImage: giveaway.images[0]?.image_url ?? null,
        lastMessage,
        lastMessageAt,
        lastMessageSenderId,
        // Only two things a giveaway room can be ordered on today: a message,
        // and the giveaway opening — which is what puts a freshly created room
        // on top at all rather than at the bottom with no timestamp. Being
        // selected, forfeiting and letting a pickup window lapse all move
        // `Giveaway_Ticket.updated_at`, but `/giveaways/{id}/recipients` does
        // not return it (docs/design/api-gaps.md), so they cannot be seen here.
        lastActivityAt: latestTimestamp([lastMessageAt, giveaway.created_at]),
        // A giveaway has no "your turn" concept the way a transaction does.
        needsYou: false,
        href: `/chat/${roomId}`,
        giveaway,
        giveawayTicketStatus: ticketStatus,
      }),
    ),
  ];

  // Default order: most recent on top. `sortRooms` owns the rule so the server
  // render and the client's live re-sort never disagree.
  return sortRooms(summaries, "recent");
}
