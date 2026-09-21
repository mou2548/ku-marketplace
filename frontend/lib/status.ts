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
  /**
   * Message key under `status.` in messages/{en,th}.json — not the words.
   *
   * The words used to live here as English literals, which made this file the
   * one place a bilingual product could not become bilingual: every screen
   * reads its vocabulary from these tables. The key is deliberately not called
   * `label`, so a caller that renders it raw is obviously wrong rather than
   * subtly English-only.
   */
  labelKey: string;
  icon: IconName;
  /** Longer explanation for tooltips and empty states. Also a key. */
  hintKey?: string;
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
    labelKey: "transaction.Pending.label",
    icon: "Wallet",
    hintKey: "transaction.Pending.hint",
  },
  Processing: {
    tone: "info",
    labelKey: "transaction.Processing.label",
    icon: "Loader",
    hintKey: "transaction.Processing.hint",
  },
  Completed: {
    tone: "success",
    labelKey: "transaction.Completed.label",
    icon: "CircleCheck",
    hintKey: "transaction.Completed.hint",
  },
  Cancelled: {
    tone: "danger",
    labelKey: "transaction.Cancelled.label",
    icon: "CircleX",
  },
  "Pending Refund": {
    tone: "warning",
    labelKey: "transaction.Pending Refund.label",
    icon: "RotateCcw",
    hintKey: "transaction.Pending Refund.hint",
  },
  Refunded: {
    tone: "neutral",
    labelKey: "transaction.Refunded.label",
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
    labelKey: "offer.Pending.label",
    icon: "Hourglass",
  },
  Accepted: {
    tone: "success",
    labelKey: "offer.Accepted.label",
    icon: "Handshake",
  },
  Rejected: {
    tone: "danger",
    labelKey: "offer.Rejected.label",
    icon: "CircleX",
  },
  Cancelled: {
    tone: "neutral",
    labelKey: "offer.Cancelled.label",
    icon: "Undo2",
  },
  Withdrawn: {
    tone: "neutral",
    labelKey: "offer.Withdrawn.label",
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
  Unlisted: { tone: "neutral", labelKey: "item.Unlisted.label", icon: "Package" },
  Listed: { tone: "info", labelKey: "item.Listed.label", icon: "Store" },
  Transferred: { tone: "success", labelKey: "item.Transferred.label", icon: "PackageCheck" },
};

export type PostType = "SellOnly" | "TradeOnly" | "Both";

export const POST_TYPE: Record<PostType, StatusPresentation> = {
  SellOnly: { tone: "success", labelKey: "postType.SellOnly.label", icon: "Tag" },
  TradeOnly: { tone: "trade", labelKey: "postType.TradeOnly.label", icon: "ArrowLeftRight" },
  Both: { tone: "trade", labelKey: "postType.Both.label", icon: "Sparkles" },
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
  /** Message key under `status.` — see StatusPresentation.labelKey. */
  labelKey: string;
  /** CSS custom property values consumed by --shadow-rarity. */
  edge: string;
  glow: string;
  fg: string;
}

export const ITEM_CONDITION: Record<ItemCondition, RarityPresentation> = {
  New: {
    labelKey: "condition.New.label",
    edge: "var(--rarity-new-edge)",
    glow: "var(--rarity-new-glow)",
    fg: "var(--rarity-new-fg)",
  },
  "Very Good": {
    labelKey: "condition.Very Good.label",
    edge: "var(--rarity-verygood-edge)",
    glow: "var(--rarity-verygood-glow)",
    fg: "var(--rarity-verygood-fg)",
  },
  Good: {
    labelKey: "condition.Good.label",
    edge: "var(--rarity-good-edge)",
    glow: "var(--rarity-good-glow)",
    fg: "var(--rarity-good-fg)",
  },
  Acceptable: {
    labelKey: "condition.Acceptable.label",
    edge: "var(--rarity-acceptable-edge)",
    glow: "var(--rarity-acceptable-glow)",
    fg: "var(--rarity-acceptable-fg)",
  },
  Poor: {
    labelKey: "condition.Poor.label",
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
  | "Forfeited"
  | "Expired";

export const TICKET_STATUS: Record<TicketStatus, StatusPresentation> = {
  Registered: {
    tone: "info",
    labelKey: "ticket.Registered.label",
    icon: "TicketCheck",
    hintKey: "ticket.Registered.hint",
  },
  Waiting: {
    tone: "warning",
    labelKey: "ticket.Waiting.label",
    icon: "QrCode",
    hintKey: "ticket.Waiting.hint",
  },
  Received: { tone: "success", labelKey: "ticket.Received.label", icon: "PartyPopper" },
  // Losing the draw is an outcome the entrant paid attention for, not a no-op.
  Not_Selected: { tone: "danger", labelKey: "ticket.Not_Selected.label", icon: "CircleX" },
  Forfeited: {
    tone: "neutral",
    labelKey: "ticket.Forfeited.label",
    icon: "Undo2",
    hintKey: "ticket.Forfeited.hint",
  },
  Expired: { tone: "danger", labelKey: "ticket.Expired.label", icon: "TimerOff" },
};

/**
 * The roster view of a ticket, for the giver looking at a list of entrants.
 * Roster-facing outcomes. Waiting and Received collapse to Selected because
 * both mean a place was allocated; forfeiture and expiry stay distinct.
 */
export type EntrantStatus =
  | "Registered"
  | "Selected"
  | "Not_Selected"
  | "Forfeited"
  | "Expired";

export const ENTRANT_STATUS: Record<EntrantStatus, StatusPresentation> = {
  Registered: {
    tone: "info",
    labelKey: "entrant.Registered.label",
    icon: "TicketCheck",
    hintKey: "entrant.Registered.hint",
  },
  Selected: {
    tone: "success",
    labelKey: "entrant.Selected.label",
    icon: "CircleCheck",
    hintKey: "entrant.Selected.hint",
  },
  Not_Selected: { tone: "danger", labelKey: "entrant.Not_Selected.label", icon: "CircleX" },
  Forfeited: { tone: "neutral", labelKey: "entrant.Forfeited.label", icon: "Undo2" },
  Expired: { tone: "danger", labelKey: "entrant.Expired.label", icon: "TimerOff" },
};

export type AllocationMethod = "FirstCome" | "Random" | "Manual";

export const ALLOCATION_METHOD: Record<AllocationMethod, StatusPresentation> = {
  FirstCome: {
    tone: "warning",
    labelKey: "allocation.FirstCome.label",
    icon: "Zap",
    hintKey: "allocation.FirstCome.hint",
  },
  Random: {
    tone: "info",
    labelKey: "allocation.Random.label",
    icon: "Dices",
    hintKey: "allocation.Random.hint",
  },
  Manual: {
    tone: "trade",
    labelKey: "allocation.Manual.label",
    icon: "UserCheck",
    hintKey: "allocation.Manual.hint",
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
    labelKey: "appointment.Pending.label",
    icon: "Hourglass",
    hintKey: "appointment.Pending.hint",
  },
  Confirmed: {
    tone: "success",
    labelKey: "appointment.Confirmed.label",
    icon: "CalendarCheck",
  },
  Rejected: {
    tone: "danger",
    labelKey: "appointment.Rejected.label",
    icon: "CalendarX",
    hintKey: "appointment.Rejected.hint",
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
    labelKey: "giveaway.Active.label",
    icon: "Gift",
  },
  Closed: {
    tone: "warning",
    labelKey: "giveaway.Closed.label",
    icon: "Lock",
    hintKey: "giveaway.Closed.hint",
  },
  Completed: {
    tone: "success",
    labelKey: "giveaway.Completed.label",
    icon: "CheckCheck",
  },
};

/* ------------------------------------------------------------------ *
 * Account standing and sanctions
 * ------------------------------------------------------------------ */

export type UserStatus = "Active" | "Suspended" | "Banned" | "Deleted";

export const USER_STATUS: Record<UserStatus, StatusPresentation> = {
  Active: { tone: "success", labelKey: "user.Active.label", icon: "CircleCheck" },
  // An account that cannot be used is a failure state, not a nudge — the same
  // severity the Suspend sanction that caused it already carries.
  Suspended: {
    tone: "danger",
    labelKey: "user.Suspended.label",
    icon: "ShieldAlert",
    hintKey: "user.Suspended.hint",
  },
  Banned: {
    tone: "danger",
    labelKey: "user.Banned.label",
    icon: "ShieldX",
    hintKey: "user.Banned.hint",
  },
  Deleted: { tone: "neutral", labelKey: "user.Deleted.label", icon: "Minus" },
};

/** Sanction.type — the penalty an admin records against an account. */
export type SanctionType = "Warning" | "Suspend" | "Ban";

export const SANCTION_TYPE: Record<SanctionType, StatusPresentation> = {
  Warning: {
    tone: "warning",
    labelKey: "sanction.Warning.label",
    icon: "ShieldAlert",
    hintKey: "sanction.Warning.hint",
  },
  Suspend: {
    tone: "danger",
    labelKey: "sanction.Suspend.label",
    icon: "TimerOff",
    hintKey: "sanction.Suspend.hint",
  },
  Ban: {
    tone: "danger",
    labelKey: "sanction.Ban.label",
    icon: "ShieldX",
    hintKey: "sanction.Ban.hint",
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
  Active: { tone: "success", labelKey: "subscription.Active.label", icon: "Crown" },
  // Benefits have lapsed and renewing is an action the holder needs to take.
  Expired: {
    tone: "warning",
    labelKey: "subscription.Expired.label",
    icon: "TimerOff",
    hintKey: "subscription.Expired.hint",
  },
  Cancelled: { tone: "neutral", labelKey: "subscription.Cancelled.label", icon: "Minus" },
};

export type SubscriptionPaymentStatus = "Pending" | "Verified" | "Reject";

export const SUBSCRIPTION_PAYMENT_STATUS: Record<
  SubscriptionPaymentStatus,
  StatusPresentation
> = {
  Pending: {
    tone: "warning",
    labelKey: "subscriptionPayment.Pending.label",
    icon: "Hourglass",
    hintKey: "subscriptionPayment.Pending.hint",
  },
  Verified: { tone: "success", labelKey: "subscriptionPayment.Verified.label", icon: "CircleCheck" },
  Reject: {
    tone: "danger",
    labelKey: "subscriptionPayment.Reject.label",
    icon: "CircleX",
    hintKey: "subscriptionPayment.Reject.hint",
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
  Pending: { tone: "warning", labelKey: "report.Pending.label", icon: "Clock" },
  Under_Investigation: {
    tone: "info",
    labelKey: "report.Under_Investigation.label",
    icon: "Search",
  },
  Violation_Confirmed: {
    tone: "danger",
    labelKey: "report.Violation_Confirmed.label",
    icon: "ShieldAlert",
  },
  Report_Dismissed: { tone: "neutral", labelKey: "report.Report_Dismissed.label", icon: "ShieldOff" },
};

/**
 * Mirrors `Appeal.appeal_status` (`DatabaseSchema.pdf`, init.sql,
 * `backend/src/common/enums/report.enums.ts`). An earlier pass invented
 * `Not_Appealed|Appeal_Submitted|Appeal_Under_Review|Appeal_Upheld|
 * Appeal_Rejected`, which meant a real `Appeal` row could never be passed in
 * — same mistake, same fix, as `AppointmentStatus` above. There is no
 * "not appealed" value: an `Appeal` row only exists once one is actually
 * filed, so that state is the absence of an `Appeal`, not a status a real one
 * can hold.
 */
export type AppealStatus = "Pending" | "Under_Review" | "Approved" | "Rejected";

export const APPEAL_STATUS: Record<AppealStatus, StatusPresentation> = {
  Pending: { tone: "warning", labelKey: "appeal.Pending.label", icon: "Send" },
  Under_Review: { tone: "info", labelKey: "appeal.Under_Review.label", icon: "Scale" },
  Approved: { tone: "success", labelKey: "appeal.Approved.label", icon: "ShieldCheck" },
  Rejected: { tone: "danger", labelKey: "appeal.Rejected.label", icon: "ShieldX" },
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
  /**
   * Message key, second person when it is the viewer's turn and third person
   * otherwise. A key, not the words — see StatusPresentation.labelKey.
   */
  labelKey: string;
  /**
   * The action the actor should take, if any — set regardless of whether
   * the actor is the viewer. Callers that only want to render a button for
   * the viewer's own turn already gate on `actor === viewer` themselves
   * (or on the tri-state "is it my turn" this implies); this field does not
   * do that gating itself, so a caller can also use it to know what step is
   * pending on the *other* side.
   *
   * A union, not a string: it was typed `string`, and the deal screen's
   * switch handled six of the seven values and returned null for the
   * seventh, so a cash-free trade was told "Your turn: propose a meetup" and
   * shown no control. A consumer that exhausts this now fails to compile
   * when a value is added.
   */
  action?: PromptAction;
  tone: Tone;
}

/**
 * A trade with no cash top-up skips the entire payment sequence — flow 1's
 * second trade branch. Everything downstream of this is different, so it is
 * resolved once, here.
 */
export type PromptAction =
  | "propose-appointment"
  | "upload-slip"
  | "review-slip"
  | "enter-tracking"
  | "confirm-delivery"
  | "scan-qr"
  | "refund-slip";

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
    action?: PromptAction,
  ): ActorPrompt => ({
    actor,
    labelKey: actor === viewer ? second : third,
    action,
    tone,
  });

  switch (tx.status) {
    case "Pending":
      if (!requiresPayment(tx)) {
        return you(
        "buyer",
        "prompt.scan-qr.you",
        "prompt.scan-qr.them",
        "warning",
        "scan-qr",
      );
      }
      if (!tx.payment_confirmed_by_buyer_at) {
        return you(
        "buyer",
        "prompt.upload-slip.you",
        "prompt.upload-slip.them",
        "warning",
        "upload-slip",
      );
      }
      return you(
        "seller",
        "prompt.review-slip.you",
        "prompt.review-slip.them",
        "warning",
        "review-slip",
      );

    case "Processing":
      if (requiresPayment(tx) && !tx.payment_confirmed_by_seller_at) {
        return you("seller", "prompt.review-slip.you", "prompt.review-slip.them", "warning", "review-slip");
      }
      if (tx.delivery_method === "Shipping") {
        if (!tx.tracking_number) {
          return you(
        "seller",
        "prompt.enter-tracking.you",
        "prompt.enter-tracking.them",
        "info",
        "enter-tracking",
      );
        }
        return you(
        "buyer",
        "prompt.confirm-delivery.you",
        "prompt.confirm-delivery.them",
        "info",
        "confirm-delivery",
      );
      }
      // Meetup ends with a scan, and only after both sides have met.
      return you(
        "buyer",
        "prompt.scan-qr.you",
        "prompt.scan-qr.them",
        "info",
        "scan-qr",
      );

    case "Pending Refund":
      return you(
        "seller",
        "prompt.refund-slip.you",
        "prompt.refund-slip.them",
        "warning",
        "refund-slip",
      );

    case "Completed":
      return { actor: null, labelKey: "prompt.completed.you", tone: "success" };
    case "Cancelled":
      return { actor: null, labelKey: "prompt.cancelled.you", tone: "danger" };
    case "Refunded":
      return { actor: null, labelKey: "prompt.refunded.you", tone: "neutral" };
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
  | "return-response"
  | "refund-confirmation"
  | "giveaway-registration"
  | "giveaway-pickup"
  | "ticket-rotation";

export interface Deadline {
  kind: DeadlineKind;
  /** Epoch milliseconds. */
  expiresAt: number;
  /** Message key under `status.` — see StatusPresentation.labelKey. */
  labelKey: string;
  /** What becomes available once it passes — usually the report action. */
  onExpiry: "report" | "escalate" | "rotate" | "forfeit";
}

/** Seller has 24h to confirm a slip; the system re-reminds every 8h. */
export function sellerConfirmDeadline(paidAt: string): Deadline {
  return {
    kind: "seller-confirm-payment",
    expiresAt: new Date(paidAt).getTime() + 24 * HOUR,
    labelKey: "deadline.seller-confirm-payment.label",
    onExpiry: "report",
  };
}

/** Shipping must arrive by the seller's estimate plus a 3 day grace period. */
export function shippingDeadline(estimatedDelivery: string): Deadline {
  return {
    kind: "seller-ship",
    expiresAt: new Date(estimatedDelivery).getTime() + 3 * DAY,
    labelKey: "deadline.seller-ship.label",
    onExpiry: "report",
  };
}

/** A cancellation request escalates if unanswered for 72h. */
export function cancelResponseDeadline(requestedAt: string): Deadline {
  return {
    kind: "cancel-response",
    expiresAt: new Date(requestedAt).getTime() + 72 * HOUR,
    labelKey: "deadline.cancel-response.label",
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
