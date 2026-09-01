import { apiFetch } from "./client";
import { authHeader } from "./session";
import { encodeTicketQr } from "@/lib/giveaway-qr";
import type { AllocationMethod, EntrantStatus, GiveawayStatus, TicketStatus } from "@/lib/status";
import type { ChatMessage, Entrant, GiveawayPost, GiveawayTicket, UserSummary } from "./types";

/**
 * Wires the 9 endpoints in the "Giveaway Allocation System" table of
 * `Software Project Proposal.pdf` to `giveaways.service.ts`'s actual response
 * shapes. Two things the raw backend does not give us, adapted here rather
 * than invented as new endpoints (frontend/CLAUDE.md §0):
 *
 * - There is still no standalone `GET /users/{id}`, but `giveaways.service.ts`
 *   now includes the `giver`/`receiver` relation on every endpoint that names
 *   one and returns a `{ user_id, name, isVerified }` summary alongside the
 *   raw id. `toUserSummary` reads that when present and only falls back to
 *   `placeholderUser`'s `User #<id>` if a caller is running against an older
 *   backend build that doesn't send it yet. See `docs/design/api-gaps.md` §3
 *   and §8.
 * - `ticket_status` is only ever `Waiting | Received | Expired`. What the UI
 *   needs — "pending the draw" vs "ready to collect" vs "not selected" vs
 *   "timed out" vs "forfeited" — is derived in `deriveTicketStatus` from the
 *   ticket status plus the giveaway's own status/method/deadline. It cannot
 *   tell "lost the draw" apart from "forfeited before the deadline": both are
 *   bare `Expired` with no other signal. See §8 in api-gaps.md.
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
  pickup_deadline: string | null;
  participant_count: number;
  status: string | null;
  images: RawImage[];
  created_at: string | null;
}

interface RawTicket {
  ticket_id: string;
  giveaway_id: string;
  receiver_id: number;
  receiver?: RawUserSummary;
  status: string | null;
  updated_at: string | null;
}

interface RawRecipient {
  recipient_id: string;
  receiver_id: number;
  receiver?: RawUserSummary;
  ticket_id: string;
  status: "selected" | "received";
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
  return raw === "Closed" ? "Closed" : "Active";
}

function toGiveawayPost(raw: RawGiveaway): GiveawayPost {
  return {
    giveaway_id: numFromLabel(raw.giveaway_id),
    item_name: raw.item_name,
    description: raw.description,
    pickup_location: raw.pickup_location,
    giver_id: raw.giver_id,
    allocation_method: toAllocationMethod(raw.allocation_method),
    // The backend has one deadline, not a separate signup window and pickup
    // window — it doubles as both. See api-gaps.md §8.
    registered_deadline: raw.pickup_deadline,
    pickup_start_date: null,
    pickup_end_date: null,
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
 * Folds `ticket_status` (`Waiting | Received | Expired`) plus the giveaway's
 * own state into the five-value status the UI already renders
 * (`lib/status.ts`'s `TicketStatus`). `Waiting` means two different things
 * depending on the method and whether the draw/select has happened yet, and
 * `Expired` means three different things the API does not distinguish
 * (lost the draw, forfeited, or timed out) — see api-gaps.md §8.
 */
function deriveTicketStatus(
  rawStatus: string | null,
  giveaway: Pick<GiveawayPost, "status" | "allocation_method" | "registered_deadline">,
  updatedAt: string | null,
): TicketStatus {
  if (rawStatus === "Received") return "Received";

  if (rawStatus === "Waiting") {
    // FirstCome has no draw to wait for — `join()` granting the ticket is
    // the win, so it means "ready to collect" immediately. Random/Manual
    // tickets stay "pending" until the giveaway closes (draw/select ran).
    const pendingDraw =
      giveaway.allocation_method !== "FirstCome" && giveaway.status === "Active";
    return pendingDraw ? "Registered" : "Waiting";
  }

  // rawStatus === "Expired": lost the draw, forfeited, or never collected in
  // time all land here. The best available signal is whether it happened
  // after the pickup deadline had already passed.
  const deadline = giveaway.registered_deadline
    ? Date.parse(giveaway.registered_deadline)
    : null;
  const changedAt = updatedAt ? Date.parse(updatedAt) : null;
  if (deadline !== null && changedAt !== null && changedAt > deadline) {
    return "Expired";
  }
  return "Not_Selected";
}

function toGiveawayTicket(raw: RawTicket, giveaway: GiveawayPost): GiveawayTicket {
  return {
    ticket_id: numFromLabel(raw.ticket_id),
    giveaway_id: giveaway.giveaway_id,
    receiver_id: raw.receiver_id,
    status: deriveTicketStatus(raw.status, giveaway, raw.updated_at),
    updated_at: raw.updated_at ?? giveaway.created_at,
    created_at: raw.updated_at ?? giveaway.created_at,
    giveaway,
  };
}

export interface RecipientRow {
  recipient_id: number;
  receiver_id: number;
  ticket_id: number;
  user: UserSummary;
  status: "selected" | "received";
}

function toRecipientRow(raw: RawRecipient): RecipientRow {
  return {
    recipient_id: numFromLabel(raw.recipient_id),
    receiver_id: raw.receiver_id,
    ticket_id: numFromLabel(raw.ticket_id),
    user: toUserSummary(raw.receiver, raw.receiver_id),
    status: raw.status,
  };
}

/* ------------------------------------------------------------------ *
 * Endpoints — "Giveaway Allocation System" table, Software Project
 * Proposal.pdf.
 * ------------------------------------------------------------------ */

export interface CreateGiveawayInput {
  item_name: string;
  description?: string;
  pickup_location: string;
  allocation_method: AllocationMethod;
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
 * `GET /giveaways/{id}/recipients`. Dual purpose, same as the backend
 * intends: before a Manual giveaway is drawn every entrant is still
 * `Waiting`, so this doubles as the entrant roster the giver picks from
 * (`ManageGiveaway`) and, after the draw, the recipient summary (spec §5.5).
 * It only ever returns `Waiting`/`Received` tickets — a forfeited or expired
 * one drops out of the list entirely, so §5.5's full four-state view is not
 * fully answerable from this endpoint alone. See api-gaps.md §8.
 */
export async function getRecipients(giveawayId: number): Promise<RecipientRow[]> {
  const raw = await apiFetch<RawRecipientsResponse>(`/giveaways/${giveawayId}/recipients`);
  return raw.recipients.map(toRecipientRow);
}

/**
 * Not a spec endpoint — a lookup built from `getRecipients` for the one thing
 * the detail page needs on load: "does the signed-in viewer already hold a
 * live ticket for this giveaway, and what does it say". Only sees
 * `Waiting`/`Received` tickets, same limits as `getRecipients` above.
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
    status: deriveTicketStatus(mine.status === "received" ? "Received" : "Waiting", giveaway, null),
    updated_at: giveaway.created_at,
    created_at: giveaway.created_at,
    giveaway,
  };
}

/**
 * Who else is in the giveaway's group chat room — real replacement for
 * `fixtures.ts`'s `getEntrants`. Same pending-draw heuristic as `getMyTicket`
 * above (`RecipientRow.status` is already flattened to `selected`/`received`
 * by the backend, so it's re-expanded through `deriveTicketStatus`), folded
 * down to the roster's narrower `Registered | Selected` (`EntrantStatus`
 * also allows `Not_Selected`, but `deriveTicketStatus` can never return it
 * for a synthetic `Received`/`Waiting` input — that value only comes from a
 * real `Expired` raw status, and `getRecipients` drops a forfeited/expired
 * ticket before this ever sees it; see api-gaps.md §8).
 */
export async function getEntrants(giveawayId: number, giveaway: GiveawayPost): Promise<Entrant[]> {
  const rows = await getRecipients(giveawayId);
  return rows.map((row) => {
    const ticketStatus = deriveTicketStatus(
      row.status === "received" ? "Received" : "Waiting",
      giveaway,
      null,
    );
    const status: EntrantStatus = ticketStatus === "Registered" ? "Registered" : "Selected";
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
): Promise<string> {
  const init = await authedInit();
  const raw = await apiFetch<{ token: string }>(
    `/giveaways/${giveawayId}/tickets/${ticketId}/qr/generate`,
    { ...init, method: "POST", body: JSON.stringify({}) },
  );
  return encodeTicketQr(giveawayId, ticketId, raw.token);
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
