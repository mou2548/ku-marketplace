/**
 * The single place where a backend enum becomes something a user can read.
 *
 * Research risk R1: 24 enum values across 5 tables, and `Pending` means a
 * different thing in each one. No component may branch on a raw enum string or
 * render one — everything goes through the maps below.
 *
 * Research principle 4 / WCAG 1.4.1: every status carries a tone AND an icon
 * name AND a plain-language sentence. Colour is never the only signal.
 *
 * Research risk R4: `resolveTransactionActor` answers "whose turn is it",
 * derived from the columns the API already returns. No new endpoint.
 */

export type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "trade";

/** Lucide icon name. Kept as a string so this module stays free of JSX. */
export type IconName = string;

export interface StatusPresentation {
  tone: Tone;
  /** Plain-language sentence shown to the user. Never the enum. */
  label: string;
  icon: IconName;
  /** Longer explanation for tooltips and empty states. */
  hint?: string;
}

/**
 * Severity contract. The tables below were first written one enum at a time,
 * with the tone judged per table, and the result was that several bad outcomes
 * landed on `neutral` — a rejected offer and a withdrawn one looked the same.
 * A tone is not a mood; it is a severity, and severity is decided here:
 *
 *   danger   Terminal failure, or a state that costs the viewer something.
 *            Cancelled, Rejected, Banned, Suspended, Violation_Confirmed,
 *            Appeal_Rejected, Expired ticket, Not_Selected, payment Reject.
 *   warning  Waiting on a human, or a clock running down.
 *            Pending, Waiting, Pending Refund, Appeal_Submitted, Closed,
 *            Warning sanction, Expired subscription.
 *   info     The system is moving and nobody is blocked.
 *            Processing, Listed, Under_Investigation, Appeal_Under_Review,
 *            Registered, Random allocation, Active giveaway.
 *   success  A good outcome that has actually happened.
 *            Completed, Accepted, Transferred, Received, Confirmed, Verified,
 *            Appeal_Upheld, Active account, Active subscription.
 *   neutral  A no-op: archived, or ended by the viewer's own choice with
 *            nothing lost. Unlisted, Withdrawn, Cancelled offer, Refunded,
 *            Deleted, Report_Dismissed.
 *   trade    A category accent, never a severity. PostType, Manual allocation.
 *
 * "Availability" is not success — an open giveaway has achieved nothing yet.
 * "Money returned" is not failure — a refunded deal is simply over.
 */


/* ------------------------------------------------------------------ *
 * Transaction
 * ------------------------------------------------------------------ */

export type TransactionStatus =
  | "Pending"
  | "Processing"
  | "Completed"
  | "Cancelled"
  | "Pending Refund"
  | "Refunded";

export const TRANSACTION_STATUS: Record<TransactionStatus, StatusPresentation> = {
  Pending: {
    tone: "warning",
    label: "Awaiting payment",
    icon: "Wallet",
    hint: "The buyer has not uploaded a transfer slip yet",
  },
  Processing: {
    tone: "info",
    label: "In progress",
    icon: "Loader",
    hint: "Payment confirmed, waiting on handover",
  },
  Completed: {
    tone: "success",
    label: "Completed",
    icon: "CircleCheck",
    hint: "The item changed hands successfully",
  },
  Cancelled: {
    tone: "danger",
    label: "Cancelled",
    icon: "CircleX",
  },
  "Pending Refund": {
    tone: "warning",
    label: "Awaiting refund",
    icon: "RotateCcw",
    hint: "Waiting on the seller to transfer the money back",
  },
  Refunded: {
    tone: "neutral",
    label: "Refunded",
    icon: "CheckCheck",
  },
};

/* ------------------------------------------------------------------ *
 * Offer — `Withdrawn` and `Cancelled` collapse to one user-facing state.
 * Research risk R6: the distinction is meaningful to the database and to
 * nobody else.
 * ------------------------------------------------------------------ */

export type OfferStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Cancelled"
  | "Withdrawn";

export const OFFER_STATUS: Record<OfferStatus, StatusPresentation> = {
  Pending: {
    tone: "warning",
    label: "Awaiting response",
    icon: "Hourglass",
  },
  Accepted: {
    tone: "success",
    label: "Accepted",
    icon: "Handshake",
  },
  Rejected: {
    tone: "danger",
    label: "Declined",
    icon: "CircleX",
  },
  Cancelled: {
    tone: "neutral",
    label: "Offer withdrawn",
    icon: "Undo2",
  },
  Withdrawn: {
    tone: "neutral",
    label: "Offer withdrawn",
    icon: "Undo2",
  },
};

/* ------------------------------------------------------------------ *
 * Item + Post
 * ------------------------------------------------------------------ */

export type ItemStatus = "Unlisted" | "Listed" | "Transferred";

export const ITEM_STATUS: Record<ItemStatus, StatusPresentation> = {
  // The schema's own word. "Not listed" read as a state nobody recognised
  // next to the two the spec actually names.
  Unlisted: { tone: "neutral", label: "Unlisted", icon: "Package" },
  Listed: { tone: "info", label: "Listed", icon: "Store" },
  Transferred: { tone: "success", label: "Handed over", icon: "PackageCheck" },
};

export type PostType = "SellOnly" | "TradeOnly" | "Both";

export const POST_TYPE: Record<PostType, StatusPresentation> = {
  SellOnly: { tone: "success", label: "For sale", icon: "Tag" },
  TradeOnly: { tone: "trade", label: "For trade", icon: "ArrowLeftRight" },
  Both: { tone: "trade", label: "Sale or trade", icon: "Sparkles" },
};

/**
 * `Item.condition` doubles as the rarity edge on an inventory slot.
 * Research P3 + the "game DNA, modern execution" principle: the border colour
 * IS the condition. The label still goes into the accessible name — never
 * colour alone.
 */
/**
 * `init.sql` stores a fifth grade, `Very Good`, that DatabaseSchema.pdf does
 * not list. The seed wins: it is what the database actually holds.
 */
export type ItemCondition =
  | "New"
  | "Very Good"
  | "Good"
  | "Acceptable"
  | "Poor";

export interface RarityPresentation {
  label: string;
  /** CSS custom property values consumed by --shadow-rarity. */
  edge: string;
  glow: string;
  fg: string;
}

export const ITEM_CONDITION: Record<ItemCondition, RarityPresentation> = {
  New: {
    label: "New",
    edge: "var(--rarity-new-edge)",
    glow: "var(--rarity-new-glow)",
    fg: "var(--rarity-new-fg)",
  },
  "Very Good": {
    label: "Very good",
    edge: "var(--rarity-verygood-edge)",
    glow: "var(--rarity-verygood-glow)",
    fg: "var(--rarity-verygood-fg)",
  },
  Good: {
    label: "Good",
    edge: "var(--rarity-good-edge)",
    glow: "var(--rarity-good-glow)",
    fg: "var(--rarity-good-fg)",
  },
  Acceptable: {
    label: "Acceptable",
    edge: "var(--rarity-acceptable-edge)",
    glow: "var(--rarity-acceptable-glow)",
    fg: "var(--rarity-acceptable-fg)",
  },
  Poor: {
    label: "Worn",
    edge: "var(--rarity-poor-edge)",
    glow: "var(--rarity-poor-glow)",
    fg: "var(--rarity-poor-fg)",
  },
};

/* ------------------------------------------------------------------ *
 * Giveaway ticket
 * ------------------------------------------------------------------ */

export type TicketStatus =
  | "Registered"
  | "Waiting"
  | "Received"
  | "Not_Selected"
  | "Expired";

export const TICKET_STATUS: Record<TicketStatus, StatusPresentation> = {
  Registered: {
    tone: "info",
    label: "Registered",
    icon: "TicketCheck",
    hint: "Waiting for the draw",
  },
  Waiting: {
    tone: "warning",
    label: "Ready to collect",
    icon: "QrCode",
    hint: "Show your QR to the giver within the pickup window",
  },
  Received: { tone: "success", label: "Collected", icon: "PartyPopper" },
  // Losing the draw is an outcome the entrant paid attention for, not a no-op.
  Not_Selected: { tone: "danger", label: "Not selected", icon: "CircleX" },
  Expired: { tone: "danger", label: "Pickup window closed", icon: "TimerOff" },
};

/**
 * The roster view of a ticket, for the giver looking at a list of entrants.
 * Coarser than `TicketStatus` on purpose: Waiting, Received and Expired all
 * collapse to `Selected`, because from the roster's point of view the place
 * was theirs regardless of what they did with it (see `getEntrants`).
 */
export type EntrantStatus = "Registered" | "Selected" | "Not_Selected";

export const ENTRANT_STATUS: Record<EntrantStatus, StatusPresentation> = {
  Registered: {
    tone: "info",
    label: "Registered",
    icon: "TicketCheck",
    hint: "In the draw, not chosen yet",
  },
  Selected: {
    tone: "success",
    label: "Chosen",
    icon: "CircleCheck",
    hint: "A place is theirs",
  },
  Not_Selected: { tone: "danger", label: "Not selected", icon: "CircleX" },
};

export type AllocationMethod = "FirstCome" | "Random" | "Manual";

export const ALLOCATION_METHOD: Record<AllocationMethod, StatusPresentation> = {
  FirstCome: {
    tone: "warning",
    label: "First come, first served",
    icon: "Zap",
    hint: "Places are given in the order people register",
  },
  Random: {
    tone: "info",
    label: "Random draw",
    icon: "Dices",
    hint: "Drawn at random when registration closes. Registering early makes no difference.",
  },
  Manual: {
    tone: "trade",
    label: "Giver picks",
    icon: "UserCheck",
    hint: "The giver chooses recipients from the list of people who registered",
  },
};

/* ------------------------------------------------------------------ *
 * Appointment card
 *
 * The values are `Pending | Confirmed | Rejected`, from Appointment_Card in
 * both DatabaseSchema.pdf §2.13 and init.sql. An earlier pass invented
 * Proposed/Accepted/Declined, which meant the component could never be handed
 * a real row.
 * ------------------------------------------------------------------ */

export type AppointmentStatus = "Pending" | "Confirmed" | "Rejected";

export const APPOINTMENT_STATUS: Record<AppointmentStatus, StatusPresentation> = {
  Pending: {
    tone: "warning",
    label: "Awaiting confirmation",
    icon: "Hourglass",
    hint: "The other side has not answered this meetup yet",
  },
  Confirmed: {
    tone: "success",
    label: "Meetup confirmed",
    icon: "CalendarCheck",
  },
  Rejected: {
    tone: "danger",
    label: "Meetup declined",
    icon: "CalendarX",
    hint: "Propose another time",
  },
};

/* ------------------------------------------------------------------ *
 * Giveaway post lifecycle
 * ------------------------------------------------------------------ */

export type GiveawayStatus = "Active" | "Closed" | "Completed";

export const GIVEAWAY_STATUS: Record<GiveawayStatus, StatusPresentation> = {
  // Open for entries is availability, not an achievement.
  Active: {
    tone: "info",
    label: "Open for entries",
    icon: "Gift",
  },
  Closed: {
    tone: "warning",
    label: "Entries closed",
    icon: "Lock",
    hint: "Recipients have been chosen; collection is still open",
  },
  Completed: {
    tone: "success",
    label: "Finished",
    icon: "CheckCheck",
  },
};

/* ------------------------------------------------------------------ *
 * Account standing and sanctions
 * ------------------------------------------------------------------ */

export type UserStatus = "Active" | "Suspended" | "Banned" | "Deleted";

export const USER_STATUS: Record<UserStatus, StatusPresentation> = {
  Active: { tone: "success", label: "Active", icon: "CircleCheck" },
  // An account that cannot be used is a failure state, not a nudge — the same
  // severity the Suspend sanction that caused it already carries.
  Suspended: {
    tone: "danger",
    label: "Suspended",
    icon: "ShieldAlert",
    hint: "Access returns automatically when the suspension expires",
  },
  Banned: {
    tone: "danger",
    label: "Banned",
    icon: "ShieldX",
    hint: "The email is locked and cannot register again",
  },
  Deleted: { tone: "neutral", label: "Closed", icon: "Minus" },
};

/** Sanction.type — the penalty an admin records against an account. */
export type SanctionType = "Warning" | "Suspend" | "Ban";

export const SANCTION_TYPE: Record<SanctionType, StatusPresentation> = {
  Warning: {
    tone: "warning",
    label: "Warning",
    icon: "ShieldAlert",
    hint: "Recorded on the account; access is unaffected",
  },
  Suspend: {
    tone: "danger",
    label: "Suspension",
    icon: "TimerOff",
    hint: "Access is blocked until the expiry date, then restored",
  },
  Ban: {
    tone: "danger",
    label: "Permanent ban",
    icon: "ShieldX",
    hint: "History is kept and the email is locked against re-registration",
  },
};

/* ------------------------------------------------------------------ *
 * Membership
 *
 * `Subscription_Payment.status` rejects with `Reject`, not `Rejected` — that
 * is what init.sql stores, so that is what is handled here.
 * ------------------------------------------------------------------ */

export type SubscriptionStatus = "Active" | "Expired" | "Cancelled";

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, StatusPresentation> = {
  Active: { tone: "success", label: "Active", icon: "Crown" },
  // Benefits have lapsed and renewing is an action the holder needs to take.
  Expired: {
    tone: "warning",
    label: "Expired",
    icon: "TimerOff",
    hint: "Renew to get the tier benefits back",
  },
  Cancelled: { tone: "neutral", label: "Cancelled", icon: "Minus" },
};

export type SubscriptionPaymentStatus = "Pending" | "Verified" | "Reject";

export const SUBSCRIPTION_PAYMENT_STATUS: Record<
  SubscriptionPaymentStatus,
  StatusPresentation
> = {
  Pending: {
    tone: "warning",
    label: "Slip under review",
    icon: "Hourglass",
    hint: "An admin is checking your transfer",
  },
  Verified: { tone: "success", label: "Payment verified", icon: "CircleCheck" },
  Reject: {
    tone: "danger",
    label: "Slip rejected",
    icon: "CircleX",
    hint: "The amount did not match; send a new slip",
  },
};

/* ------------------------------------------------------------------ *
 * Moderation
 * ------------------------------------------------------------------ */

export type ReportStatus =
  | "Pending"
  | "Under_Investigation"
  | "Violation_Confirmed"
  | "Report_Dismissed";

export const REPORT_STATUS: Record<ReportStatus, StatusPresentation> = {
  Pending: { tone: "warning", label: "Awaiting review", icon: "Clock" },
  Under_Investigation: {
    tone: "info",
    label: "Under investigation",
    icon: "Search",
  },
  Violation_Confirmed: {
    tone: "danger",
    label: "Violation confirmed",
    icon: "ShieldAlert",
  },
  Report_Dismissed: { tone: "neutral", label: "Dismissed", icon: "ShieldOff" },
};

export type AppealStatus =
  | "Not_Appealed"
  | "Appeal_Submitted"
  | "Appeal_Under_Review"
  | "Appeal_Upheld"
  | "Appeal_Rejected";

export const APPEAL_STATUS: Record<AppealStatus, StatusPresentation> = {
  Not_Appealed: { tone: "neutral", label: "Not appealed", icon: "Minus" },
  Appeal_Submitted: { tone: "warning", label: "Appeal submitted", icon: "Send" },
  Appeal_Under_Review: {
    tone: "info",
    label: "Appeal under review",
    icon: "Scale",
  },
  Appeal_Upheld: { tone: "success", label: "Appeal upheld", icon: "ShieldCheck" },
  Appeal_Rejected: { tone: "danger", label: "Appeal rejected", icon: "ShieldX" },
};

/* ================================================================== *
 * Whose turn is it — research risk R4.
 * ================================================================== */

export type DeliveryMethod = "Meetup" | "Shipping";
export type Party = "buyer" | "seller";

/** The subset of a transaction this module needs. Matches the API response. */
export interface TransactionLike {
  status: TransactionStatus;
  delivery_method: DeliveryMethod;
  /** Present when the transaction came from an accepted trade offer. */
  offer_id?: number | null;
  /** Cash top-up on a trade. Drives whether a slip is required at all. */
  additional_money?: number | null;
  payment_confirmed_by_buyer_at?: string | null;
  payment_confirmed_by_seller_at?: string | null;
  item_received_confirmed_by_buyer_at?: string | null;
  tracking_number?: string | null;
}

export interface ActorPrompt {
  /** Who the system is waiting on. `null` when the deal is over. */
  actor: Party | null;
  /** Second person when it is the viewer's turn, third person otherwise. */
  label: string;
  /**
   * The action the actor should take, if any — set regardless of whether
   * the actor is the viewer. Callers that only want to render a button for
   * the viewer's own turn already gate on `actor === viewer` themselves
   * (or on the tri-state "is it my turn" this implies); this field does not
   * do that gating itself, so a caller can also use it to know what step is
   * pending on the *other* side.
   */
  action?: string;
  tone: Tone;
}

/**
 * A trade with no cash top-up skips the entire payment sequence — flow 1's
 * second trade branch. Everything downstream of this is different, so it is
 * resolved once, here.
 */
export function requiresPayment(tx: TransactionLike): boolean {
  if (tx.offer_id == null) return true; // a straight purchase always pays
  return (tx.additional_money ?? 0) > 0;
}

export function resolveTransactionActor(
  tx: TransactionLike,
  viewer: Party,
): ActorPrompt {
  const you = (
    actor: Party,
    second: string,
    third: string,
    tone: Tone,
    action?: string,
  ): ActorPrompt => ({
    actor,
    label: actor === viewer ? second : third,
    action,
    tone,
  });

  switch (tx.status) {
    case "Pending":
      if (!requiresPayment(tx)) {
        return you(
          "buyer",
          "Your turn: propose a meetup",
          "Waiting on the proposer to arrange a meetup",
          "warning",
          "propose-appointment",
        );
      }
      if (!tx.payment_confirmed_by_buyer_at) {
        return you(
          "buyer",
          "Your turn: transfer the money and upload the slip",
          "Waiting on the buyer to pay and upload a slip",
          "warning",
          "upload-slip",
        );
      }
      return you(
        "seller",
        "Your turn: check the slip and confirm payment",
        "Waiting on the seller to check the slip",
        "warning",
        "review-slip",
      );

    case "Processing":
      if (tx.delivery_method === "Shipping") {
        if (!tx.tracking_number) {
          return you(
            "seller",
            "Your turn: enter the tracking number",
            "Waiting on the seller to enter a tracking number",
            "info",
            "enter-tracking",
          );
        }
        return you(
          "buyer",
          "Your turn: confirm once the parcel arrives",
          "Waiting on the buyer to confirm delivery",
          "info",
          "confirm-delivery",
        );
      }
      // Meetup ends with a scan, and only after both sides have met.
      return you(
        "buyer",
        "Your turn: scan the seller QR when you collect",
        "Waiting on the meetup and QR scan",
        "info",
        "scan-qr",
      );

    case "Pending Refund":
      return you(
        "seller",
        "Your turn: transfer the refund and upload the slip",
        "Waiting on the seller to transfer the money back",
        "warning",
        "refund-slip",
      );

    case "Completed":
      return { actor: null, label: "This deal is complete", tone: "success" };
    case "Cancelled":
      return { actor: null, label: "This deal was cancelled", tone: "danger" };
    case "Refunded":
      return { actor: null, label: "The refund is complete", tone: "neutral" };
  }
}

/* ================================================================== *
 * Deadlines — research risk R2.
 * Flow 1 runs four clocks and none of them are visible today. All four are
 * derived from timestamps the API already returns.
 * ================================================================== */

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

export type DeadlineKind =
  | "seller-confirm-payment"
  | "seller-ship"
  | "cancel-response"
  | "giveaway-pickup"
  | "ticket-rotation";

export interface Deadline {
  kind: DeadlineKind;
  /** Epoch milliseconds. */
  expiresAt: number;
  label: string;
  /** What becomes available once it passes — usually the report action. */
  onExpiry: "report" | "escalate" | "rotate" | "forfeit";
}

/** Seller has 24h to confirm a slip; the system re-reminds every 8h. */
export function sellerConfirmDeadline(paidAt: string): Deadline {
  return {
    kind: "seller-confirm-payment",
    expiresAt: new Date(paidAt).getTime() + 24 * HOUR,
    label: "The seller must confirm payment within 24 hours",
    onExpiry: "report",
  };
}

/** Shipping must arrive by the seller's estimate plus a 3 day grace period. */
export function shippingDeadline(estimatedDelivery: string): Deadline {
  return {
    kind: "seller-ship",
    expiresAt: new Date(estimatedDelivery).getTime() + 3 * DAY,
    label: "Parcel due",
    onExpiry: "report",
  };
}

/** A cancellation request escalates if unanswered for 72h. */
export function cancelResponseDeadline(requestedAt: string): Deadline {
  return {
    kind: "cancel-response",
    expiresAt: new Date(requestedAt).getTime() + 72 * HOUR,
    label: "The other party must respond to the cancellation within 72 hours",
    onExpiry: "escalate",
  };
}

/** Giveaway QR tickets rotate every 15 minutes (flow 3). */
export const TICKET_ROTATION_MS = 15 * 60 * 1000;

export function isExpired(deadline: Deadline, now = Date.now()): boolean {
  return now >= deadline.expiresAt;
}

/**
 * The report button appears exactly when the flow says it does — never as a
 * surprise, and never before a deadline has actually passed (research R2).
 */
export function canReport(
  deadlines: readonly Deadline[],
  now = Date.now(),
): boolean {
  return deadlines.some(
    (d) => d.onExpiry === "report" && isExpired(d, now),
  );
}
