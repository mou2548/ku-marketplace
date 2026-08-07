/**
 * Every conversation in one shape.
 *
 * `Chat_Room` makes the room the primary object: `room_id` is the key, and both
 * `transaction_id` and `giveaway_id` are nullable. A sale, a trade, and a
 * giveaway are the same thing to the database, and the review asked for them to
 * be the same thing to the student too — one inbox, one room, one URL.
 *
 * So this module answers the three questions the inbox needs and the schema
 * does not store directly: what kind of conversation is it, who is it with, and
 * what was said last. All derived; no new endpoint.
 */

import type { ChatRoom, ChatSeed } from "@/lib/api/fixtures";
import type { GiveawayPost, Transaction, UserSummary } from "@/lib/api/types";
import type { Tone } from "@/lib/status";

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
  lastMessage?: string;
  lastMessageAt?: string;
  /** True when the flow is waiting on the viewer — sorts these to the top. */
  needsYou: boolean;
  href: string;
  transaction?: Transaction;
  giveaway?: GiveawayPost;
}

/**
 * A trade and a sale are both transactions; the difference is whether an offer
 * created it. That distinction matters to the student — a trade has a second
 * pile of items behind it — so the inbox shows it.
 */
export function roomKind(
  room: ChatRoom,
  transaction?: Transaction,
): RoomKind {
  if (room.giveaway_id != null) return "Giveaway";
  return transaction?.offer_id != null ? "Trade" : "Sale";
}

export interface BuildRoomsInput {
  rooms: ChatRoom[];
  messages: ChatSeed[];
  transactions: Transaction[];
  giveaways: GiveawayPost[];
  viewerId: number;
  /** Whose turn it is, keyed by transaction id. */
  needsYouByTransaction: Set<number>;
}

export function buildRooms({
  rooms,
  messages,
  transactions,
  giveaways,
  viewerId,
  needsYouByTransaction,
}: BuildRoomsInput): RoomSummary[] {
  const summaries: RoomSummary[] = [];

  for (const room of rooms) {
    const transaction =
      room.transaction_id != null
        ? transactions.find((t) => t.transaction_id === room.transaction_id)
        : undefined;
    const giveaway =
      room.giveaway_id != null
        ? giveaways.find((g) => g.giveaway_id === room.giveaway_id)
        : undefined;

    // A room the viewer is not part of should not be in their inbox.
    const isParticipant = transaction
      ? transaction.buyer_id === viewerId || transaction.seller_id === viewerId
      : giveaway
        ? giveaway.giver_id === viewerId
        : false;
    if (!isParticipant) continue;

    const counterparty = transaction
      ? transaction.buyer_id === viewerId
        ? transaction.seller
        : transaction.buyer
      : giveaway!.giver;

    const roomMessages = messages
      .filter((m) => m.room_id === room.room_id)
      .sort((a, b) => a.message_id - b.message_id);
    const last = roomMessages.at(-1);

    summaries.push({
      room_id: room.room_id,
      kind: roomKind(room, transaction),
      counterparty,
      subject: transaction?.post.item.name ?? giveaway?.item_name ?? "",
      lastMessage: last?.content,
      lastMessageAt: last?.created_at,
      needsYou: transaction
        ? needsYouByTransaction.has(transaction.transaction_id)
        : false,
      href: `/chat/${room.room_id}`,
      transaction,
      giveaway,
    });
  }

  // Rooms waiting on the viewer come first regardless of recency: research R4
  // says whose turn it is outranks when someone last typed.
  return summaries.sort((a, b) => {
    if (a.needsYou !== b.needsYou) return a.needsYou ? -1 : 1;
    const at = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bt = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return bt - at;
  });
}
