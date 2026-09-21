import { ApiError } from "./client";
import { getAppointmentCards, getChatHistory } from "@/lib/api/chat";
import { getEntrants, getGiveawayMessages, getGiveaways, getMyTicket } from "@/lib/api/giveaways";
import { getTransaction, getTransactions } from "@/lib/api/transactions";
import type {
  AppointmentCardData,
  ChatMessage,
  Entrant,
  GiveawayPost,
  Transaction,
} from "@/lib/api/types";
import { deriveAppointmentView } from "@/lib/appointment";
import { buildRooms, type RoomSummary } from "@/lib/rooms";
import {
  resolveTransactionActor,
  type Party,
  type TicketStatus,
} from "@/lib/status";

/**
 * Giveaway chats the viewer may currently access: the giver and selected
 * recipients. Expired, forfeited and unselected tickets remain in giveaway
 * history but do not grant access to the winners' shared conversation.
 */
interface ViewerGiveaway {
  giveaway: GiveawayPost;
  ticketStatus?: TicketStatus;
}

async function myGiveaways(viewerId: number): Promise<ViewerGiveaway[]> {
  const all = await getGiveaways();
  const mine = await Promise.all(
    all.map(async (giveaway): Promise<ViewerGiveaway | undefined> => {
      if (giveaway.giver_id === viewerId) return { giveaway };
      const ticket = await getMyTicket(giveaway.giveaway_id, giveaway, viewerId).catch(
        () => undefined,
      );
      return ticket && (ticket.status === "Waiting" || ticket.status === "Received")
        ? { giveaway, ticketStatus: ticket.status }
        : undefined;
    }),
  );
  return mine.filter((entry): entry is ViewerGiveaway => entry !== undefined);
}

/**
 * The inbox, assembled once and shared by every screen that shows it — the
 * `/chat` list, the room's own sidebar, and the nav badge. Building it in one
 * place is what stops the three from disagreeing, the same reason the action
 * count is derived once (docs/design/ia.md §7).
 *
 * There is no "list my chat rooms" endpoint (see `lib/rooms.ts`), so this
 * starts from "my transactions" and "my giveaways" — both real — and reads
 * each one's chat state to learn its `room_id` and last message.
 */
export async function getRoomSummaries(viewerId: number): Promise<RoomSummary[]> {
  const [transactions, giveaways] = await Promise.all([
    getTransactions(),
    myGiveaways(viewerId),
  ]);

  const [transactionRooms, giveawayRooms] = await Promise.all([
    Promise.all(
      transactions.map(async (transaction) => {
        const [{ roomId, messages }, appointments] = await Promise.all([
          getChatHistory(transaction.transaction_id),
          // Proposing and declining a meetup are conversation events the inbox
          // has to see, and they live on `Appointment_Card` rather than on the
          // transaction. Only a Meetup deal has any, so a Shipping deal does
          // not pay for the extra call; a failure here must not cost the
          // student their whole inbox, so it degrades to "no cards".
          transaction.delivery_method === "Meetup"
            ? getAppointmentCards(transaction.transaction_id).catch(() => [])
            : Promise.resolve([] as AppointmentCardData[]),
        ]);
        const last = messages.at(-1);
        const viewer: Party = transaction.buyer_id === viewerId ? "buyer" : "seller";
        return {
          transaction,
          roomId,
          viewerId,
          lastMessage: last?.content ?? undefined,
          lastMessageAt: last?.created_at,
          lastMessageSenderId: last?.sender_id,
          appointments,
          needsYou: resolveTransactionActor(transaction, viewer).actor === viewer,
        };
      }),
    ),
    Promise.all(
      giveaways.map(async ({ giveaway, ticketStatus }) => {
        let chat;
        try {
          chat = await getGiveawayMessages(giveaway.giveaway_id);
        } catch (error) {
          // Eligibility can change between loading tickets and opening rooms.
          if (error instanceof ApiError && [403, 404].includes(error.status)) return undefined;
          throw error;
        }
        const { roomId, messages } = chat;
        const last = messages.at(-1);
        return {
          giveaway,
          roomId,
          lastMessage: last?.content ?? undefined,
          lastMessageAt: last?.created_at,
          lastMessageSenderId: last?.sender_id,
          ticketStatus,
        };
      }),
    ),
  ]);

  return buildRooms({ transactionRooms, giveawayRooms: giveawayRooms.filter((room) => room !== undefined) });
}

export interface RoomDetail {
  summary: RoomSummary;
  messages: ChatMessage[];
  transaction?: Transaction;
  giveaway?: GiveawayPost;
  /**
   * The card currently worth showing — see `deriveAppointmentView` in
   * `lib/appointment.ts`. Only ever set for a transaction room; a giveaway
   * room has no `Appointment_Card` concept at all.
   */
  appointment?: AppointmentCardData;
  /**
   * Who else is in a giveaway room — real (`lib/api/giveaways.ts`'s
   * `getEntrants`, `GET /giveaways/{id}/recipients`). Outcome states remain
   * visible instead of disappearing from the roster.
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
 * part of it — a failed real fetch (401/403/404) means exactly that, since
 * every real endpoint behind this already checks membership itself.
 */
export async function getRoomDetail(
  roomId: number,
  viewerId: number,
  rooms?: RoomSummary[],
): Promise<RoomDetail | undefined> {
  const summaries = rooms ?? (await getRoomSummaries(viewerId));
  const summary = summaries.find((r) => r.room_id === roomId);
  if (!summary) return undefined;

  try {
    if (summary.transaction) {
      const transactionId = summary.transaction.transaction_id;
      const [{ messages }, transaction, cards] = await Promise.all([
        getChatHistory(transactionId),
        getTransaction(transactionId),
        getAppointmentCards(transactionId),
      ]);
      const { pinned, pending } = deriveAppointmentView(cards);
      return { summary, transaction, appointment: pending ?? pinned, messages };
    }

    if (summary.giveaway) {
      const giveaway = summary.giveaway;
      const [{ messages }, entrants] = await Promise.all([
        getGiveawayMessages(giveaway.giveaway_id),
        getEntrants(giveaway.giveaway_id),
      ]);
      return { summary, giveaway, entrants, messages };
    }
  } catch {
    return undefined;
  }

  return undefined;
}
