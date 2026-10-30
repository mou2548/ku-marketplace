import type { GiveawayPhase } from "@/lib/giveaway-phase";
import {
  resolveTransactionActor,
  type AllocationMethod,
  type AppointmentStatus,
  type DeadlineKind,
  type Lifecycle,
  type OfferStatus,
  type Party,
  type TicketStatus,
  type Tone,
  type TransactionLike,
} from "@/lib/status";

/**
 * The two badge tiers of the quiet-badges style (owner decision 2026-10-30,
 * docs/redesign/quiet-badges/plan.md).
 *
 *   act   The viewer has to do something. A calm solid fill: warning or
 *         danger.
 *   info  Everything else. A soft neutral fill, or the soft green for a good
 *         outcome.
 *
 * A value is "act now" when its tone is warning or danger, it is still open,
 * AND the person looking at it is the one who must act (owner ruling
 * 2026-10-30: the other side of the same deal sees the information tier).
 * An ended state (cancelled, expired, rejected, not selected, violation
 * confirmed) is information, and so is a category, which is not a state at
 * all. Where the actor cannot be derived from API data, the caller passes
 * nothing and the badge stays information tier.
 */
export type BadgeTier = "act" | "info";

/** What a badge is painted with. One per tier and severity, nothing else. */
export type BadgePaint = "act-warning" | "act-danger" | "success" | "neutral";

export function badgeTier(
  tone: Tone,
  lifecycle: Lifecycle,
  viewerActs = false,
): BadgeTier {
  if (!viewerActs) return "info";
  switch (lifecycle) {
    case "ended":
    case "category":
      return "info";
    case "open":
      switch (tone) {
        case "warning":
        case "danger":
          return "act";
        case "neutral":
        case "info":
        case "success":
        case "trade":
          return "info";
      }
  }
}

export function badgePaint(
  tone: Tone,
  lifecycle: Lifecycle,
  viewerActs = false,
): BadgePaint {
  if (badgeTier(tone, lifecycle, viewerActs) === "act") {
    return tone === "danger" ? "act-danger" : "act-warning";
  }
  switch (tone) {
    case "success":
      return "success";
    case "neutral":
    case "info":
    case "warning":
    case "danger":
    case "trade":
      return "neutral";
  }
}

/* ------------------------------------------------------------------ *
 * Whose turn: the viewer side of the tier, from the "whose turn" logic
 * already used by history, the inbox, the room list and the stepper.
 * ------------------------------------------------------------------ */

/** A deal: the party `resolveTransactionActor` is waiting on. */
export function viewerActsOnTransaction(
  tx: TransactionLike,
  viewer: Party,
): boolean {
  return resolveTransactionActor(tx, viewer).actor === viewer;
}

/** An offer is answered by the person who received it, while it is pending. */
export function viewerActsOnOffer(
  status: OfferStatus,
  direction: "received" | "sent",
): boolean {
  switch (status) {
    case "Pending":
      return direction === "received";
    case "Accepted":
    case "Rejected":
    case "Cancelled":
    case "Withdrawn":
      return false;
  }
}

/**
 * A pending meetup is answered by the side it awaits — the appointment
 * card's own `awaitingViewer`.
 */
export function viewerActsOnAppointment(
  status: AppointmentStatus,
  awaitingViewer: boolean,
): boolean {
  switch (status) {
    case "Pending":
      return awaitingViewer;
    case "Confirmed":
    case "Rejected":
      return false;
  }
}

/**
 * A `Waiting` ticket is a place to collect: the holder shows the QR. Seen by
 * anyone else (the giver's roster) no single actor can be derived, so it is
 * information.
 */
export function viewerActsOnTicket(
  status: TicketStatus,
  viewerHoldsTicket: boolean,
): boolean {
  switch (status) {
    case "Waiting":
      return viewerHoldsTicket;
    case "Registered":
    case "Received":
    case "Not_Selected":
    case "Forfeited":
    case "Expired":
      return false;
  }
}

/** Only a Manual giver acts on a closed registration: choosing recipients. */
export function viewerActsOnGiveawayPhase(
  phase: GiveawayPhase,
  method: AllocationMethod,
  viewerIsGiver: boolean,
): boolean {
  switch (phase) {
    case "closed":
      return viewerIsGiver && method === "Manual";
    case "upcoming":
    case "open":
    case "full":
    case "pickup":
    case "finished":
      return false;
  }
}

/**
 * A deal clock (`deadlineFor`) belongs to the side that must move before it
 * runs out; the other side sees it as information. `viewerId` is the
 * viewer's user id, compared with who asked for a cancellation or return.
 * The shipping estimate is a grace period for both sides, not a deadline
 * either of them acts on, and the giveaway clocks are not deal clocks.
 */
export function viewerActsOnDeadline(
  kind: DeadlineKind,
  tx: { cancellation_requested_by?: number | null },
  viewer: Party,
  viewerId: number,
): boolean {
  switch (kind) {
    case "seller-confirm-payment":
      return viewer === "seller";
    case "refund-confirmation":
      return viewer === "buyer";
    case "cancel-response":
    case "return-response":
      return tx.cancellation_requested_by != null && tx.cancellation_requested_by !== viewerId;
    case "seller-ship":
    case "giveaway-registration":
    case "giveaway-pickup":
    case "ticket-rotation":
      return false;
  }
}
