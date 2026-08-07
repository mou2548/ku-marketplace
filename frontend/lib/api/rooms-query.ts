import {
  getGiveaways,
  getMessages,
  getRoomMessages,
  getRooms,
  getTransactions,
  VIEWER_ID,
} from "@/lib/api/fixtures";
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

/** Kept so callers that only need one transaction's thread do not import both. */
export { getMessages };
