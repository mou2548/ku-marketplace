import { apiFetch } from "./client";
import { authHeader } from "./session";
import type { AppointmentCardData, ChatMessage, UserSummary } from "./types";

/**
 * Wires §6's "Chat & Image System" table to `transactions.service.ts`'s
 * actual response shapes — text + up to 5 images per message, and
 * `Appointment_Card` propose/respond for `Meetup`-delivery transactions.
 *
 * Two things adapted here rather than invented as new endpoints
 * (frontend/CLAUDE.md §0):
 *
 * - `Appointment_Card` has no "pinned" column — `deriveAppointmentView` in
 *   `lib/appointment.ts` derives it from history instead (kept out of this
 *   file since it needs to be callable from a Client Component, and this
 *   module pulls in `lib/api/session.ts`'s `next/headers` import).
 * - The backend's `date`/`time` are full ISO timestamps (`date` is midnight
 *   UTC, `time` is a `1970-01-01`-epoch wall-clock value — see
 *   `AppointmentCard.time @db.Time(6)` in schema.prisma). `toAppointmentCard`
 *   slices them down to the plain `"YYYY-MM-DD"`/`"HH:mm:ss"` strings
 *   `components/kit/appointment-card.tsx` already expects.
 */

interface RawUserSummary {
  user_id: number;
  name: string;
  isVerified: boolean;
}

function toUserSummary(raw: RawUserSummary): UserSummary {
  return { user_id: raw.user_id, name: raw.name, isVerified: raw.isVerified };
}

interface RawChatMessage {
  message_id: number;
  room_id: number;
  sender_id: number;
  sender: RawUserSummary;
  content: string | null;
  image_urls: string[] | null;
  images_expired: boolean;
  created_at: string;
}

function toChatMessage(raw: RawChatMessage): ChatMessage {
  return {
    message_id: raw.message_id,
    room_id: raw.room_id,
    sender_id: raw.sender_id,
    sender: toUserSummary(raw.sender),
    content: raw.content,
    image_urls: raw.image_urls,
    images_expired: raw.images_expired,
    created_at: raw.created_at,
  };
}

interface RawAppointmentCard {
  appointment_id: number;
  transaction_id: number;
  proposed_by: number;
  proposer: RawUserSummary;
  date: string;
  time: string;
  location: string;
  status: "Pending" | "Confirmed" | "Rejected";
  deleted_at: string | null;
  created_at: string;
}

function toAppointmentCard(raw: RawAppointmentCard): AppointmentCardData {
  return {
    appointment_id: raw.appointment_id,
    transaction_id: raw.transaction_id,
    proposed_by: raw.proposed_by,
    proposer: toUserSummary(raw.proposer),
    date: raw.date.slice(0, 10),
    time: raw.time.slice(11, 19),
    location: raw.location,
    status: raw.status,
    deleted_at: raw.deleted_at ?? null,
    created_at: raw.created_at,
  };
}

async function authedInit(): Promise<RequestInit> {
  return { headers: await authHeader() };
}

/**
 * GET /transactions/{id}/message. Wrapped in `{ room_id, messages }` — a
 * brand-new room with zero messages still needs to report its `room_id`
 * (the room is lazily created server-side the first time this is called),
 * which a bare `[]` cannot carry. `rooms-query.ts` uses `roomId` to build
 * `RoomSummary.room_id` for a transaction the viewer has never opened yet.
 */
export async function getChatHistory(
  transactionId: number,
): Promise<{ roomId: number; messages: ChatMessage[] }> {
  const init = await authedInit();
  const raw = await apiFetch<{ room_id: number; messages: RawChatMessage[] }>(
    `/transactions/${transactionId}/message`,
    init,
  );
  return { roomId: raw.room_id, messages: raw.messages.map(toChatMessage) };
}

/** POST /transactions/{id}/message — up to 5 image_urls (§6.1), enforced server-side too. */
export async function sendMessage(
  transactionId: number,
  input: { content?: string; image_urls?: string[] },
): Promise<ChatMessage> {
  const init = await authedInit();
  const raw = await apiFetch<RawChatMessage>(`/transactions/${transactionId}/message`, {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
  return toChatMessage(raw);
}

/** GET /transactions/{id}/appointment-cards */
export async function getAppointmentCards(transactionId: number): Promise<AppointmentCardData[]> {
  const init = await authedInit();
  const raw = await apiFetch<RawAppointmentCard[]>(
    `/transactions/${transactionId}/appointment-cards`,
    init,
  );
  return raw.map(toAppointmentCard);
}

/** POST /transactions/{id}/appointment-cards — Meetup-delivery transactions only (§6.3). */
export async function createAppointment(
  transactionId: number,
  input: { date: string; time: string; location: string },
): Promise<AppointmentCardData> {
  const init = await authedInit();
  const raw = await apiFetch<RawAppointmentCard>(
    `/transactions/${transactionId}/appointment-cards`,
    { ...init, method: "POST", body: JSON.stringify(input) },
  );
  return toAppointmentCard(raw);
}

/** POST /appointment-cards/{id}/respond — the proposer cannot respond to their own card. */
export async function respondAppointment(
  appointmentId: number,
  response: "confirm" | "reject",
): Promise<AppointmentCardData> {
  const init = await authedInit();
  const raw = await apiFetch<RawAppointmentCard>(`/appointment-cards/${appointmentId}/respond`, {
    ...init,
    method: "POST",
    body: JSON.stringify({ response }),
  });
  return toAppointmentCard(raw);
}

/**
 * §7.1/§7.5.3 — GET /admin/transactions/{id}/message, for an admin reviewing
 * a Transaction-type report's evidence. Same shape as `getChatHistory`, just
 * a different (participant-check-free) route; reused here rather than
 * duplicated since the adapter is identical.
 */
export async function getAdminChatHistory(
  transactionId: number,
): Promise<{ roomId: number | null; messages: ChatMessage[] }> {
  const init = await authedInit();
  const raw = await apiFetch<{ room_id: number | null; messages: RawChatMessage[] }>(
    `/admin/transactions/${transactionId}/message`,
    init,
  );
  return { roomId: raw.room_id, messages: raw.messages.map(toChatMessage) };
}

/** §7.1/§7.5.3 — GET /admin/transactions/{id}/appointment-cards, admin variant of `getAppointmentCards`. */
export async function getAdminAppointmentCards(
  transactionId: number,
): Promise<AppointmentCardData[]> {
  const init = await authedInit();
  const raw = await apiFetch<RawAppointmentCard[]>(
    `/admin/transactions/${transactionId}/appointment-cards`,
    init,
  );
  return raw.map(toAppointmentCard);
}
