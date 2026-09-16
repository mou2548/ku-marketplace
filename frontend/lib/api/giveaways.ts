import { apiFetch } from "./client";
import { authHeader } from "./session";
import { encodeTicketQr } from "@/lib/giveaway-qr";
import type { AllocationMethod, EntrantStatus, GiveawayStatus, TicketStatus } from "@/lib/status";
import type { ChatMessage, Entrant, GiveawayPost, GiveawayTicket, UserSummary } from "./types";

/**
 * Wires the 9 endpoints in the "Giveaway Allocation System" table of
 * `Software Project Proposal.pdf` to `giveaways.service.ts`'s actual response
 * shapes. User summaries are adapted here because there is no standalone
 * `GET /users/{id}` endpoint:
 *
 * - There is still no standalone `GET /users/{id}`, but `giveaways.service.ts`
 *   now includes the `giver`/`receiver` relation on every endpoint that names
 *   one and returns a `{ user_id, name, isVerified }` summary alongside the
 *   raw id. `toUserSummary` reads that when present and only falls back to
 *   `placeholderUser`'s `User #<id>` if a caller is running against an older
 *   backend build that doesn't send it yet. See `docs/design/api-gaps.md` §3
 *   and §8.
 * Ticket outcomes and registration capacity are now explicit in the API, so
 * the adapter preserves them instead of guessing from timestamps.
 */

function numFromLabel(label: string): number {
  const match = label.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : NaN;
}

function placeholderUser(userId: number): UserSummary {
  return { user_id: userId, name: `User #${userId}`, isVerified: false };
}

interface RawUserSummary {
  user_id: number;
  name: string;
  isVerified: boolean;
}

function toUserSummary(raw: RawUserSummary | undefined, fallbackId: number): UserSummary {
  return raw ? { user_id: raw.user_id, name: raw.name, isVerified: raw.isVerified } : placeholderUser(fallbackId);
}

async function authedInit(): Promise<RequestInit> {
  return { headers: await authHeader() };
}

/* ------------------------------------------------------------------ *
 * Raw shapes off `giveaways.service.ts` (snake_case, ids as
 * "prefix_001" labels — `giveaways.controller.ts`'s `this.id()` accepts
 * either that label or a bare number back, so every call below sends plain
 * numbers).
 * ------------------------------------------------------------------ */

interface RawImage {
  image_url: string;
  display_order: number | null;
}

interface RawGiveaway {
  giveaway_id: string;
  item_name: string;
  description: string | null;
  pickup_location: string;
  giver_id: number;
  giver?: RawUserSummary;
  allocation_method: string;
  quantity: number;
  register_start: string | null;
  register_deadline: string | null;
  pickup_start: string | null;
  pickup_deadline: string | null;
  participant_count: number;
  remaining_slots: number;
  registration_open: boolean;
  all_registered_guaranteed: boolean;
  status: string | null;
  images: RawImage[];
  created_at: string | null;
}

interface RawTicket {
  ticket_id: string;
  giveaway_id: string;
  receiver_id: number;
  receiver?: RawUserSummary;
  queue_number: number;
  status: string | null;
  updated_at: string | null;
}

interface RawRecipient {
  recipient_id: string;
  receiver_id: number;
  receiver?: RawUserSummary;
  ticket_id: string;
  queue_number: number;
  status:
    | "registered"
    | "selected"
    | "not_selected"
    | "received"
    | "forfeited"
    | "expired";
  ticket_status: string;
}

interface RawRecipientsResponse {
  giveaway_id: string;
  recipients: RawRecipient[];
}

interface RawDrawOrSelectResult {
  giveaway_id: string;
  allocation_method: string;
  recipients: RawRecipient[];
  status: string;
}

/* ------------------------------------------------------------------ *
 * Adapters
 * ------------------------------------------------------------------ */

function toAllocationMethod(raw: string): AllocationMethod {
  if (raw === "FirstCome" || raw === "Random" || raw === "Manual") return raw;
  return "FirstCome";
}

function toGiveawayStatus(raw: string | null): GiveawayStatus {
  if (raw === "Closed" || raw === "Completed") return raw;
  return "Active";
}

function toGiveawayPost(raw: RawGiveaway): GiveawayPost {
  return {
    giveaway_id: numFromLabel(raw.giveaway_id),
    item_name: raw.item_name,
    description: raw.description,
    pickup_location: raw.pickup_location,
    giver_id: raw.giver_id,
    allocation_method: toAllocationMethod(raw.allocation_method),
    quantity: raw.quantity,
    register_start: raw.register_start,
    register_deadline: raw.register_deadline,
    pickup_start: raw.pickup_start,
    pickup_deadline: raw.pickup_deadline,
    registration_open: raw.registration_open,
    remaining_slots: raw.remaining_slots,
    all_registered_guaranteed: raw.all_registered_guaranteed,
    status: toGiveawayStatus(raw.status),
    created_at: raw.created_at ?? new Date().toISOString(),
    images: raw.images.map((image, index) => ({
      image_id: index,
      image_url: image.image_url,
      display_order: image.display_order ?? index,
    })),
    giver: toUserSummary(raw.giver, raw.giver_id),
    registered_count: raw.participant_count,
  };
}

/**
 * Preserve explicit ticket outcomes. Unknown values degrade to Registered so
 * an older server never fabricates a winning QR state.
 */
function toTicketStatus(rawStatus: string | null): TicketStatus {
  if (rawStatus === "Registered") return "Registered";
  if (rawStatus === "Waiting") return "Waiting";
  if (rawStatus === "Received") return "Received";
  if (rawStatus === "NotSelected") return "Not_Selected";
  if (rawStatus === "Forfeited") return "Forfeited";
  if (rawStatus === "Expired") return "Expired";
  return "Registered";
}

function toGiveawayTicket(raw: RawTicket, giveaway: GiveawayPost): GiveawayTicket {
  return {
    ticket_id: numFromLabel(raw.ticket_id),
    giveaway_id: giveaway.giveaway_id,
    receiver_id: raw.receiver_id,
    queue_number: raw.queue_number,
    status: toTicketStatus(raw.status),
    updated_at: raw.updated_at ?? giveaway.created_at,
    created_at: raw.updated_at ?? giveaway.created_at,
    giveaway,
  };
}

export interface RecipientRow {
  recipient_id: number;
  receiver_id: number;
  ticket_id: number;
  queue_number: number;
  user: UserSummary;
  status: RawRecipient["status"];
  ticket_status: TicketStatus;
}

function toRecipientRow(raw: RawRecipient): RecipientRow {
  return {
    recipient_id: numFromLabel(raw.recipient_id),
    receiver_id: raw.receiver_id,
    ticket_id: numFromLabel(raw.ticket_id),
    queue_number: raw.queue_number,
    user: toUserSummary(raw.receiver, raw.receiver_id),
    status: raw.status,
    ticket_status: toTicketStatus(raw.ticket_status),
  };
}

/* ------------------------------------------------------------------ *
 * Endpoints — "Giveaway Allocation System" table, Software Project
 * Proposal.pdf.
 * ------------------------------------------------------------------ */

export interface CreateGiveawayInput {
  item_name: string;
  quantity: number;
  description?: string;
  pickup_location: string;
  allocation_method: AllocationMethod;
  register_start?: string;
  register_deadline?: string;
  pickup_start?: string;
  pickup_deadline?: string;
  images?: { image_url: string; display_order: number }[];
}

/** `POST /giveaways` — `giver_id` comes from the JWT, not the body. */
export async function createGiveaway(input: CreateGiveawayInput): Promise<GiveawayPost> {
  const init = await authedInit();
  const raw = await apiFetch<RawGiveaway>("/giveaways", {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
  return toGiveawayPost(raw);
}

/** `GET /giveaways/{id}` */
export async function getGiveaway(giveawayId: number): Promise<GiveawayPost> {
  const raw = await apiFetch<RawGiveaway>(`/giveaways/${giveawayId}`);
  return toGiveawayPost(raw);
}

/**
 * `GET /giveaways` — not in the original spec table, added so the browse
 * screen (`giveaway/page.tsx`) reads real data instead of
 * `lib/api/fixtures.ts`. See `giveaways.service.ts`'s `findAll()`.
 */
export async function getGiveaways(): Promise<GiveawayPost[]> {
  const raw = await apiFetch<RawGiveaway[]>("/giveaways");
  return raw.map(toGiveawayPost);
}

/** `POST /giveaways/{id}/join` — `receiver_id` comes from the JWT, empty body. */
export async function joinGiveaway(
  giveawayId: number,
  giveaway: GiveawayPost,
): Promise<GiveawayTicket> {
  const init = await authedInit();
  const raw = await apiFetch<RawTicket>(`/giveaways/${giveawayId}/join`, {
    ...init,
    method: "POST",
    body: JSON.stringify({}),
  });
  return toGiveawayTicket(raw, giveaway);
}

/** `POST /giveaways/{id}/draw` — Random only. */
export async function drawGiveaway(giveawayId: number): Promise<RecipientRow[]> {
  const init = await authedInit();
  const raw = await apiFetch<RawDrawOrSelectResult>(`/giveaways/${giveawayId}/draw`, {
    ...init,
    method: "POST",
    body: JSON.stringify({}),
  });
  return raw.recipients.map(toRecipientRow);
}

/** `POST /giveaways/{id}/select` — Manual only. */
export async function selectRecipients(
  giveawayId: number,
  receiverIds: number[],
): Promise<RecipientRow[]> {
  const init = await authedInit();
  const raw = await apiFetch<RawDrawOrSelectResult>(`/giveaways/${giveawayId}/select`, {
    ...init,
    method: "POST",
    body: JSON.stringify({ receiver_ids: receiverIds }),
  });
  return raw.recipients.map(toRecipientRow);
}

/**
 * Full entrant and outcome roster. Registered, selected, not selected,
 * received, forfeited, and expired remain distinguishable.
 */
export async function getRecipients(giveawayId: number): Promise<RecipientRow[]> {
  const raw = await apiFetch<RawRecipientsResponse>(`/giveaways/${giveawayId}/recipients`);
  return raw.recipients.map(toRecipientRow);
}

/**
 * Not a spec endpoint — a lookup built from `getRecipients` for the one thing
 * the detail page needs on load: "does the signed-in viewer already hold a
 * ticket for this giveaway, and what does it say".
 */
export async function getMyTicket(
  giveawayId: number,
  giveaway: GiveawayPost,
  viewerId: number,
): Promise<GiveawayTicket | undefined> {
  const rows = await getRecipients(giveawayId);
  const mine = rows.find((row) => row.receiver_id === viewerId);
  if (!mine) return undefined;
  return {
    ticket_id: mine.ticket_id,
    giveaway_id: giveaway.giveaway_id,
    receiver_id: mine.receiver_id,
    queue_number: mine.queue_number,
    status: mine.ticket_status,
    updated_at: giveaway.created_at,
    created_at: giveaway.created_at,
    giveaway,
  };
}

/**
 * Who else is in the giveaway's group chat room, including a truthful outcome
 * status for the giver's roster.
 */
export async function getEntrants(giveawayId: number): Promise<Entrant[]> {
  const rows = await getRecipients(giveawayId);
  return rows.map((row) => {
    const statusByTicket: Record<TicketStatus, EntrantStatus> = {
      Registered: "Registered",
      Waiting: "Selected",
      Received: "Selected",
      Not_Selected: "Not_Selected",
      Forfeited: "Forfeited",
      Expired: "Expired",
    };
    const status = statusByTicket[row.ticket_status];
    return { receiver_id: row.receiver_id, user: row.user, status };
  });
}

/** `POST /giveaways/recipients/{id}/forfeit` — `id` is the ticket id. */
export async function forfeitTicket(ticketId: number): Promise<void> {
  const init = await authedInit();
  await apiFetch(`/giveaways/recipients/${ticketId}/forfeit`, {
    ...init,
    method: "POST",
    body: JSON.stringify({ confirm: true }),
  });
}

/**
 * `POST /giveaways/{id}/tickets/{ticket_id}/qr/generate`. QR wire format
 * (`{ g, t, token }`) is in `lib/giveaway-qr.ts` — kept out of this module so
 * `decodeTicketQr` can be imported from a Client Component without dragging
 * `lib/api/session.ts` (`next/headers`, server-only) into the client bundle.
 */
export async function generateTicketQr(
  giveawayId: number,
  ticketId: number,
): Promise<{ token: string; expiresInSeconds: number }> {
  const init = await authedInit();
  const raw = await apiFetch<{ token: string; expires_in_seconds?: number }>(
    `/giveaways/${giveawayId}/tickets/${ticketId}/qr/generate`,
    { ...init, method: "POST", body: JSON.stringify({}) },
  );
  return {
    token: encodeTicketQr(giveawayId, ticketId, raw.token),
    // Server hands back one code per 15-minute window with the time it has
    // left, so a reopened ticket keeps the original countdown.
    expiresInSeconds: raw.expires_in_seconds ?? 15 * 60,
  };
}

/** `POST /giveaways/{id}/tickets/{ticket_id}/qr/scan` */
export async function scanTicketQr(
  giveawayId: number,
  ticketId: number,
  token: string,
): Promise<boolean> {
  const init = await authedInit();
  const raw = await apiFetch<{ valid: boolean }>(
    `/giveaways/${giveawayId}/tickets/${ticketId}/qr/scan`,
    { ...init, method: "POST", body: JSON.stringify({ token }) },
  );
  return raw.valid;
}

/* ------------------------------------------------------------------ *
 * §6 Chat & Image System, extended to giveaways — a group chat (the
 * giver plus every entrant), not in the original endpoint table. Same
 * wire shape as `lib/api/chat.ts`'s transaction messages.
 * ------------------------------------------------------------------ */

interface RawGiveawayMessage {
  message_id: number;
  room_id: number;
  sender_id: number;
  sender: RawUserSummary;
  content: string | null;
  image_urls: string[] | null;
  images_expired: boolean;
  created_at: string;
}

function toGiveawayMessage(raw: RawGiveawayMessage): ChatMessage {
  return {
    message_id: raw.message_id,
    room_id: raw.room_id,
    sender_id: raw.sender_id,
    sender: toUserSummary(raw.sender, raw.sender_id),
    content: raw.content,
    image_urls: raw.image_urls,
    images_expired: raw.images_expired,
    created_at: raw.created_at,
  };
}

/**
 * `GET /giveaways/{id}/message`. Wrapped in `{ room_id, messages }` — a
 * brand-new room with zero messages still needs to report its `room_id`
 * (lazily created server-side on first call).
 */
export async function getGiveawayMessages(
  giveawayId: number,
): Promise<{ roomId: number; messages: ChatMessage[] }> {
  const init = await authedInit();
  const raw = await apiFetch<{ room_id: number; messages: RawGiveawayMessage[] }>(
    `/giveaways/${giveawayId}/message`,
    init,
  );
  return { roomId: raw.room_id, messages: raw.messages.map(toGiveawayMessage) };
}

/** `POST /giveaways/{id}/message` — up to 5 image_urls (§6.1), enforced server-side too. */
export async function sendGiveawayMessage(
  giveawayId: number,
  input: { content?: string; image_urls?: string[] },
): Promise<ChatMessage> {
  const init = await authedInit();
  const raw = await apiFetch<RawGiveawayMessage>(`/giveaways/${giveawayId}/message`, {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
  return toGiveawayMessage(raw);
}
