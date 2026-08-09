import {
  getAppointment,
  getEntrants,
  getGiveaway,
  getGiveaways,
  getMessages,
  getRoom,
  getRoomMessages,
  getRooms,
  getTransaction,
  getTransactions,
  VIEWER_ID,
  type AppointmentSeed,
  type Entrant,
} from "@/lib/api/fixtures";
import type { GiveawayPost, Transaction } from "@/lib/api/types";
import { buildRooms, type RoomSummary } from "@/lib/rooms";
import { resolveTransactionActor } from "@/lib/status";

/**
 * The inbox, assembled once and shared by every screen that shows it — the
 * `/chat` list, the room's own sidebar, and the nav badge. Building it in one
 * place is what stops the three from disagreeing, the same reason the action
 * count is derived once (docs/design/ia.md §7).
 */
export async function getRoomSummaries(): Promise<RoomSummary[]> {
  const [rooms, transactions, giveaways] = await Promise.all([
    getRooms(),
    getTransactions(),
    getGiveaways(),
  ]);

  // Whose turn it is, per transaction — the inbox sorts on it.
  const needsYou = new Set<number>();
  for (const tx of transactions) {
    const viewer = tx.buyer_id === VIEWER_ID ? "buyer" : "seller";
    if (tx.buyer_id !== VIEWER_ID && tx.seller_id !== VIEWER_ID) continue;
    if (resolveTransactionActor(tx, viewer).actor === viewer) {
      needsYou.add(tx.transaction_id);
    }
  }

  const messages = (
    await Promise.all(rooms.map((r) => getRoomMessages(r.room_id)))
  ).flat();

  return buildRooms({
    rooms,
    messages,
    transactions,
    giveaways,
    viewerId: VIEWER_ID,
    needsYouByTransaction: needsYou,
  });
}

export interface RoomMessage {
  message_id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

export interface RoomDetail {
  summary: RoomSummary;
  messages: RoomMessage[];
  transaction?: Transaction;
  giveaway?: GiveawayPost;
  appointment?: AppointmentSeed;
  /**
   * Who else is in a giveaway room. `Chat_Room` stores no membership at all,
   * so this is reconstructed from the giveaway's tickets — see
   * docs/design/api-gaps.md. Absent for one-to-one transaction rooms, which
   * have exactly two people and need no roster.
   */
  entrants?: Entrant[];
}

/**
 * Everything one room needs to render, in one call.
 *
 * Two routes now open a room — `/chat/[roomId]`, and `/chat` itself, which
 * opens the first room beside the list on a wide screen. Loading it in both
 * places is how the two come to disagree about what a room contains, so it is
 * loaded here.
 *
 * Returns `undefined` when the room does not exist, or when the viewer is not
 * part of it — `buildRooms` already drops rooms that are not theirs, so a
 * missing summary means exactly that.
 */
export async function getRoomDetail(
  roomId: number,
  rooms?: RoomSummary[],
): Promise<RoomDetail | undefined> {
  const room = await getRoom(roomId);
  if (!room) return undefined;

  const summaries = rooms ?? (await getRoomSummaries());
  const summary = summaries.find((r) => r.room_id === room.room_id);
  if (!summary) return undefined;

  const [messages, transaction, giveaway] = await Promise.all([
    getRoomMessages(room.room_id),
    room.transaction_id ? getTransaction(room.transaction_id) : undefined,
    room.giveaway_id ? getGiveaway(room.giveaway_id) : undefined,
  ]);

  // The Appointment_Card row, if one has been proposed for this deal.
  const appointment = transaction
    ? await getAppointment(transaction.transaction_id)
    : undefined;

  // A giveaway room is the only kind with more than two people in it.
  const entrants = giveaway
    ? await getEntrants(giveaway.giveaway_id)
    : undefined;

  return {
    summary,
    transaction,
    giveaway,
    appointment,
    entrants,
    messages: messages.map((m) => ({
      message_id: m.message_id,
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at,
    })),
  };
}

/** Kept so callers that only need one transaction's thread do not import both. */
export { getMessages };
