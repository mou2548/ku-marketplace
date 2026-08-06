import { getPostByItemId } from "@/lib/posts";

/**
 * Transaction state machine — proposal §2.4, §2.5, §4.
 *
 * Three values move independently and must never be collapsed into one enum:
 *
 *   status   — how far the deal got            (§2.4, pending → completed/cancelled)
 *   dispute  — whether something needs review  (§2.5, parallel, may coexist with completed)
 *   the two confirmations — money received / goods handed over (§2.4.2)
 *
 * §2.4.2 is the reason the confirmations are separate booleans rather than
 * sub-states: they prove two different facts, and a dispute needs to point at
 * whichever one failed.
 */

/** §2.4 */
export type TradeStatus = "pending" | "processing" | "completed" | "cancelled";

/** §2.5 — parallel to TradeStatus, never on the same axis. */
export type DisputeStatus = "none" | "under-review" | "resolved";

/** §4.2 vs §4.3 — decided per trade, drives which fulfilment screens show. */
export type DeliveryMethod = "meetup" | "shipping";

export const TRADE_STATUS_LABELS: Record<
  TradeStatus,
  { th: string; en: string }
> = {
  pending: { th: "รอเริ่มดำเนินการ", en: "Pending" },
  processing: { th: "กำลังดำเนินการ", en: "Processing" },
  completed: { th: "เสร็จสมบูรณ์", en: "Completed" },
  cancelled: { th: "ยกเลิก", en: "Cancelled" },
};

export const DISPUTE_STATUS_LABELS: Record<
  DisputeStatus,
  { th: string; en: string }
> = {
  none: { th: "ไม่มีข้อพิพาท", en: "No dispute" },
  "under-review": { th: "อยู่ระหว่างตรวจสอบ", en: "Under review" },
  resolved: { th: "ตัดสินแล้ว", en: "Resolved" },
};

export type TradeRole = "buyer" | "seller";

/** §4.7 — one side asks, the other answers. Silence is not consent. */
export interface CancelRequest {
  requestedBy: TradeRole;
  requestedAt: string;
  /** Undefined while still waiting. */
  response?: "accepted" | "rejected";
  respondedAt?: string;
}

/** §4.3.1 */
export interface Shipment {
  courier: string;
  trackingNumber: string;
  shippedAt: string;
}

export interface Trade {
  id: string;
  buyerId: string;
  sellerId: string;
  /** The item the post was about — always exactly one (§3.1). */
  postItemId: string;
  /** What the offerer put up in exchange. Empty on a straight buy (§3.5). */
  offeredItemIds: string[];
  /** §3.2 — optional cash on top of a swap. */
  topUpAmount?: number;
  status: TradeStatus;
  dispute: DisputeStatus;
  deliveryMethod: DeliveryMethod;
  createdAt: string;

  /** §4.1 — buyer uploaded the slip and pressed confirm. Drives pending → processing. */
  slipUploadedAt?: string;
  slipImage?: string;
  /** §4.1 / §4.2.4 — seller confirmed the money landed. First of the two. */
  paymentConfirmedAt?: string;
  /** §4.2.5 (QR scan) or §4.3.4 (parcel received). Second of the two. */
  handoverConfirmedAt?: string;

  shipment?: Shipment;
  cancelRequest?: CancelRequest;

  /** Display-only counterparty info until the API exists. */
  counterpartyName: string;
  /** Which side the signed-in user is on, for screens that branch by role. */
  myRole: TradeRole;
}

/**
 * §2.4.2 — both confirmations must land before the deal closes. Nothing else
 * closes it; there is no timeout path (§4.5).
 */
export function isReadyToComplete(trade: Trade): boolean {
  return (
    trade.paymentConfirmedAt !== undefined &&
    trade.handoverConfirmedAt !== undefined
  );
}

/** §2.4.1 — no money has moved yet, so either side may walk alone. */
export function canCancelUnilaterally(trade: Trade): boolean {
  return trade.status === "pending";
}

/** §2.4.2 / §4.7 — money may already be gone, so both sides must agree. */
export function requiresMutualCancel(trade: Trade): boolean {
  return trade.status === "processing";
}

/**
 * §2.5 — the single thing that can freeze the two confirm buttons is a live
 * cancel request, NOT a report. Deliberate: if reporting froze a deal, anyone
 * refused a mutual cancel would just report to get the same effect, which
 * would gut the §4.7 both-sides rule.
 */
export function areConfirmButtonsLocked(trade: Trade): boolean {
  if (!trade.cancelRequest) return false;
  if (trade.cancelRequest.response === "rejected") {
    // §4.7 — refused request escalates to admin; buttons stay locked until then.
    return trade.dispute !== "resolved";
  }
  return trade.cancelRequest.response === undefined;
}

/** §2.3 + §2.4 — items are frozen for exactly as long as the trade is live. */
export function isTradeLive(trade: Trade): boolean {
  return trade.status === "pending" || trade.status === "processing";
}

/** §3.3 — everything a live trade freezes, both sides included. */
export function lockedItemIds(trade: Trade): string[] {
  return isTradeLive(trade) ? [trade.postItemId, ...trade.offeredItemIds] : [];
}

/**
 * §4.5 — the system never confirms on a user's behalf. A stalled step earns a
 * reminder and, later, the right to report. Nothing more.
 *
 * `nudgeAfterHours` → repeat the notification.
 * `reportableAfterHours` → show the "report this" affordance to `reporter`.
 */
export const STALE_THRESHOLDS = {
  paymentConfirmation: {
    startsFrom: "slipUploadedAt",
    nudgeAfterHours: 3,
    reportableAfterHours: 24,
    reporter: "buyer",
  },
  handoverConfirmation: {
    startsFrom: "shippedAt",
    nudgeAfterHours: 24 * 7,
    reportableAfterHours: 24 * 14,
    reporter: "seller",
  },
} as const satisfies Record<
  string,
  {
    startsFrom: string;
    nudgeAfterHours: number;
    reportableAfterHours: number;
    reporter: TradeRole;
  }
>;

export type StaleStep = keyof typeof STALE_THRESHOLDS;

export type StaleLevel = "fresh" | "nudge" | "reportable";

export function staleLevel(
  startedAt: string | undefined,
  step: StaleStep,
  now: Date = new Date()
): StaleLevel {
  if (!startedAt) return "fresh";
  const elapsedHours =
    (now.getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60);
  const rule = STALE_THRESHOLDS[step];
  if (elapsedHours >= rule.reportableAfterHours) return "reportable";
  if (elapsedHours >= rule.nudgeAfterHours) return "nudge";
  return "fresh";
}

/**
 * Which fulfilment screen a trade belongs on right now. Every §4 page routes
 * off this instead of re-deriving the rules, so the flow can only be wrong in
 * one place.
 */
export type TradeStage =
  | "awaiting-slip" // §4.1 buyer uploads
  | "awaiting-payment-confirmation" // §4.2.4 seller checks slip
  | "awaiting-handover-qr" // §4.2.5 meetup: seller shows QR
  | "awaiting-shipment" // §4.3.1 seller posts tracking
  | "awaiting-parcel-confirmation" // §4.3.4 buyer confirms receipt
  | "cancel-pending" // §4.7 waiting on the other side
  | "closed";

export function tradeStage(trade: Trade): TradeStage {
  if (!isTradeLive(trade)) return "closed";
  if (areConfirmButtonsLocked(trade)) return "cancel-pending";
  if (!trade.slipUploadedAt) return "awaiting-slip";
  if (!trade.paymentConfirmedAt) return "awaiting-payment-confirmation";
  if (trade.deliveryMethod === "meetup") return "awaiting-handover-qr";
  return trade.shipment ? "awaiting-parcel-confirmation" : "awaiting-shipment";
}

/**
 * The one thing this user can do next, derived from stage + role. Returns null
 * when the ball is in the other side's court — §4.5 is explicit that waiting is
 * a real state and the system must not invent a way out of it.
 */
export function nextActionFor(
  trade: Trade
): { href: string; label: string } | null {
  switch (tradeStage(trade)) {
    case "awaiting-slip":
      return trade.myRole === "buyer"
        ? { href: `/trade/${trade.id}/payment`, label: "อัปโหลดสลิป" }
        : null;
    case "awaiting-payment-confirmation":
      return trade.myRole === "seller"
        ? { href: `/trade/${trade.id}/payment/review`, label: "ตรวจสอบสลิป" }
        : null;
    case "awaiting-handover-qr":
      // The buyer's half of this step happens in a camera app, not in ours.
      return trade.myRole === "seller"
        ? { href: `/trade/${trade.id}/qr`, label: "แสดง QR ส่งมอบ" }
        : null;
    case "awaiting-shipment":
      // TODO(phase 2): /trade/[id]/shipping — §4.3.1
      return null;
    case "awaiting-parcel-confirmation":
      // TODO(phase 2): /trade/[id]/shipping/confirm — §4.3.3
      return null;
    default:
      return null;
  }
}

/**
 * What the buyer owes: the listed price plus any top-up agreed on a swap
 * (§3.2). A pure swap comes to 0 — the slip step is skipped for those.
 *
 * The platform never touches this money (§8.1); the number exists only so the
 * two sides can check the slip against something.
 */
export function tradeAmount(trade: Trade): number {
  const post = getPostByItemId(trade.postItemId);
  return (post?.price ?? 0) + (trade.topUpAmount ?? 0);
}

/** §4.6.6 — token life while the QR sits on screen, in seconds. */
export const QR_TOKEN_TTL_SECONDS = 15 * 60;

// TODO: replace with the real transaction list from the API
export const TRADES: Trade[] = [
  {
    id: "trade-1",
    buyerId: "user-ploy",
    sellerId: "user-me",
    postItemId: "item-1",
    offeredItemIds: ["item-9"],
    status: "pending",
    dispute: "none",
    deliveryMethod: "meetup",
    createdAt: "2026-08-06T14:10:00+07:00",
    counterpartyName: "Nong Ploy",
    myRole: "seller",
  },
  {
    id: "trade-2",
    buyerId: "user-me",
    sellerId: "user-kritsada",
    postItemId: "item-10",
    offeredItemIds: ["item-3"],
    topUpAmount: 150,
    status: "processing",
    dispute: "none",
    deliveryMethod: "meetup",
    createdAt: "2026-08-05T11:00:00+07:00",
    slipUploadedAt: "2026-08-05T11:42:00+07:00",
    slipImage: "/images/product-uniform.png",
    counterpartyName: "Kritsada P.",
    myRole: "buyer",
  },
  {
    id: "trade-3",
    buyerId: "user-me",
    sellerId: "user-nutthapong",
    postItemId: "item-8",
    offeredItemIds: [],
    status: "completed",
    dispute: "none",
    deliveryMethod: "shipping",
    createdAt: "2026-08-03T09:00:00+07:00",
    slipUploadedAt: "2026-08-03T09:30:00+07:00",
    paymentConfirmedAt: "2026-08-03T10:05:00+07:00",
    handoverConfirmedAt: "2026-08-03T16:20:00+07:00",
    shipment: {
      courier: "Kerry Express",
      trackingNumber: "KEX0099213771",
      shippedAt: "2026-08-03T12:00:00+07:00",
    },
    counterpartyName: "Nutthapong T.",
    myRole: "buyer",
  },
  {
    id: "trade-4",
    buyerId: "user-chaya",
    sellerId: "user-me",
    postItemId: "item-4",
    offeredItemIds: ["item-11"],
    status: "cancelled",
    dispute: "none",
    deliveryMethod: "meetup",
    createdAt: "2026-08-01T08:00:00+07:00",
    counterpartyName: "Chaya R.",
    myRole: "seller",
  },
  {
    // §2.5 — completed *and* under review at once. Not a contradiction.
    id: "trade-5",
    buyerId: "user-me",
    sellerId: "user-anan",
    postItemId: "item-12",
    offeredItemIds: ["item-6"],
    status: "completed",
    dispute: "under-review",
    deliveryMethod: "shipping",
    createdAt: "2026-07-28T13:00:00+07:00",
    slipUploadedAt: "2026-07-28T13:20:00+07:00",
    paymentConfirmedAt: "2026-07-28T14:00:00+07:00",
    handoverConfirmedAt: "2026-07-30T10:00:00+07:00",
    shipment: {
      courier: "Flash Express",
      trackingNumber: "FL881204773",
      shippedAt: "2026-07-28T18:00:00+07:00",
    },
    counterpartyName: "Anan W.",
    myRole: "buyer",
  },
  {
    // Seller side of a meetup handover: money confirmed, QR up, waiting to be
    // scanned. Entry point for the §4.6.2 screen.
    id: "trade-6",
    buyerId: "user-siriwan",
    sellerId: "user-me",
    postItemId: "item-2",
    offeredItemIds: [],
    status: "processing",
    dispute: "none",
    deliveryMethod: "meetup",
    createdAt: "2026-08-06T08:00:00+07:00",
    slipUploadedAt: "2026-08-06T08:31:00+07:00",
    slipImage: "/images/promptpay-qr.svg",
    paymentConfirmedAt: "2026-08-06T08:55:00+07:00",
    counterpartyName: "Siriwan K.",
    myRole: "seller",
  },
  {
    // Buyer side of the same step — the one that may actually confirm receipt
    // (§4.6.4). Entry point for the scan screen's happy path.
    id: "trade-7",
    buyerId: "user-me",
    sellerId: "user-thanaphon",
    postItemId: "item-12",
    offeredItemIds: [],
    status: "processing",
    dispute: "none",
    deliveryMethod: "meetup",
    createdAt: "2026-08-06T09:00:00+07:00",
    slipUploadedAt: "2026-08-06T09:20:00+07:00",
    slipImage: "/images/promptpay-qr.svg",
    paymentConfirmedAt: "2026-08-06T09:40:00+07:00",
    counterpartyName: "Thanaphon C.",
    myRole: "buyer",
  },
  {
    // Buyer side, nothing paid yet — entry point for the §4.1 slip upload.
    id: "trade-8",
    buyerId: "user-me",
    sellerId: "user-chaya",
    postItemId: "item-11",
    offeredItemIds: [],
    status: "pending",
    dispute: "none",
    deliveryMethod: "meetup",
    createdAt: "2026-08-06T15:05:00+07:00",
    counterpartyName: "Chaya R.",
    myRole: "buyer",
  },
  {
    // Seller side with a slip waiting — entry point for the §4.2.4 review.
    id: "trade-9",
    buyerId: "user-pimchanok",
    sellerId: "user-me",
    postItemId: "item-1",
    offeredItemIds: [],
    status: "processing",
    dispute: "none",
    deliveryMethod: "meetup",
    createdAt: "2026-08-06T12:00:00+07:00",
    slipUploadedAt: "2026-08-06T12:24:00+07:00",
    slipImage: "/images/promptpay-qr.svg",
    counterpartyName: "Pimchanok D.",
    myRole: "seller",
  },
];

export function getTrade(tradeId: string): Trade | undefined {
  return TRADES.find((trade) => trade.id === tradeId);
}
