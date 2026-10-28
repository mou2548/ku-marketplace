/**
 * Response shapes for the KU Marketplace API.
 *
 * snake_case field names, mirroring the database. Every `lib/api/*.ts` module
 * adapts its endpoint's wire form to these; the old `lib/api/fixtures.ts` mock
 * layer has been removed — the whole app now runs on the real backend.
 *
 * If a screen needs a field the API does not return, record the gap in
 * docs/design/api-gaps.md and design around it (or add it to the backend).
 */

import type {
  AllocationMethod,
  AppealStatus,
  AppointmentStatus,
  DeliveryMethod,
  EntrantStatus,
  ItemCondition,
  OfferStatus,
  PostType,
  ReportStatus,
  TicketStatus,
  TransactionStatus,
} from "@/lib/status";

/** Every endpoint except DELETE returns this envelope. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface User {
  user_id: number;
  email: string;
  first_name_en: string;
  last_name_en: string;
  first_name_th: string;
  last_name_th: string;
  phone_number?: string | null;
  avatar_url?: string | null;
  status: "Active" | "Suspended" | "Banned" | "Deleted";
  email_verified_at?: string | null;
  isAdmin: boolean;
  created_at: string;
}

/** What the UI needs to render a person. Derived from User, not a new endpoint. */
export interface UserSummary {
  user_id: number;
  name: string;
  isVerified: boolean;
  faculty?: string | null;
  year?: number | null;
  avatar_url?: string | null;
}

export interface ItemImage {
  image_id: number;
  item_id: number;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

/**
 * Category is an open string, not a fixed union.
 *
 * `DatabaseSchema.pdf` lists ten slugs; `init.sql` stores readable English
 * names ("Books", "Home & Living", "Bags"). A hard union would have made the
 * seed unrepresentable, so the UI derives its filter list from the data it
 * receives instead of asserting a taxonomy the database does not share.
 */
export type ItemCategory = string;

export interface Item {
  item_id: number;
  owner_id: number;
  name: string;
  quantity: number;
  category: ItemCategory;
  condition: ItemCondition;
  description?: string | null;
  /** Books and lecture notes. Persona P1 searches by this. */
  course_name?: string | null;
  brand_model?: string | null;
  warranty_expiry?: string | null;
  size?: string | null;
  created_at: string;
  images: ItemImage[];
}

/**
 * One currently open channel this item is committed to. An item can carry
 * several at once (e.g. a SellOnly post and a TradeOnly post together) —
 * this is why `Item` no longer carries a single `status` field.
 */
export type ItemChannel =
  | {
      type: "post";
      post_id: number;
      post_type: PostType;
      quantity_total: number;
      quantity_remaining: number;
    }
  | {
      type: "giveaway";
      giveaway_id: number;
      quantity_total: number;
      quantity_claimed: number;
    };

export interface ItemHistorySummary {
  item_id: number;
  inventory_quantity: number;
  /** Committed to a currently open channel — sale, trade or giveaway. */
  posted_quantity: number;
  /** How many units can still be committed to a new channel right now. */
  available_quantity: number;
  sold_quantity: number;
  traded_quantity: number;
  /** Reserved by a deal that hasn't completed yet — not free, not history. */
  ongoing_quantity: number;
  /** How many units have actually been handed over via a giveaway. */
  given_quantity: number;
  /** Every currently open Post/Giveaway channel for this item. */
  channels: ItemChannel[];
}

export interface Post {
  post_id: number;
  item_id: number;
  post_type: PostType;
  price: number;
  quantity_total: number;
  quantity_remaining: number;
  description?: string | null;
  /** Only meaningful when post_type is TradeOnly or Both. */
  wanted_item_offer?: string | null;
  created_at: string;
  item: Item;
  seller: UserSummary;
}

export interface Offer {
  offer_id: number;
  post_id: number;
  proposer_id: number;
  additional_money: number;
  status: OfferStatus;
  created_at: string;
  /** Set once the offer is accepted — the transaction it opened. */
  transaction_id?: number | null;
  items: Item[];
  proposer: UserSummary;
  post: Post;
}

export interface Transaction {
  transaction_id: number;
  post_id: number;
  offer_id?: number | null;
  buyer_id: number;
  seller_id: number;
  quantity: number;
  final_amount: number;
  status: TransactionStatus;
  delivery_method: DeliveryMethod;
  active_report_id?: number | null;
  /** When that report was filed — the time of the "sent to admin review" event. */
  active_report_created_at?: string | null;
  slip_image_url?: string | null;
  tracking_number?: string | null;
  estimated_delivery_date?: string | null;
  shipped_at?: string | null;
  payment_confirmed_by_buyer_at?: string | null;
  payment_confirmed_by_seller_at?: string | null;
  item_received_confirmed_by_buyer_at?: string | null;
  item_received_confirmed_by_seller_at?: string | null;
  cancellation_requested_by?: number | null;
  cancellation_reason?: string | null;
  cancellation_requested_at?: string | null;
  cancellation_response?: "Pending" | "Approved" | "Rejected" | null;
  cancellation_responded_at?: string | null;
  refund_slip_url?: string | null;
  refund_submitted_at?: string | null;
  refund_confirmed_by_buyer?: boolean | null;
  refund_confirmed_at?: string | null;
  item_return_confirmed_at?: string | null;
  created_at: string;
  /** Present on a trade — drives whether the payment sequence runs at all. */
  additional_money?: number | null;
  post: Post;
  buyer: UserSummary;
  seller: UserSummary;
}

export interface ChatMessage {
  message_id: number;
  room_id: number;
  sender_id: number;
  /** Absent for a fixture-sourced (giveaway) room — see lib/api/chat.ts. */
  sender?: UserSummary;
  content?: string | null;
  image_urls?: string[] | null;
  /** §6.2 — true once the message is older than the 7-day display lifetime;
   * `image_urls` is null in that case, and the UI shows a notice instead. */
  images_expired?: boolean;
  created_at: string;
}

/**
 * Mirrors `Appointment_Card` (`DatabaseSchema.pdf` §2.13, init.sql). An
 * earlier pass invented `Proposed|Accepted|Declined`, which meant a real row
 * could never be passed in — see the fix note in `lib/status.ts`. `date`/
 * `time` are plain `"YYYY-MM-DD"`/`"HH:mm:ss"` strings, matching what
 * `AppointmentCard`/`appointmentLabel` already expect; `lib/api/chat.ts`'s
 * adapter slices the backend's full ISO timestamps down to this shape.
 */
export interface AppointmentCardData {
  appointment_id: number;
  transaction_id: number;
  proposed_by: number;
  proposer: UserSummary;
  date: string;
  time: string;
  location: string;
  status: AppointmentStatus;
  /**
   * Set once a newer proposal supersedes this card or the other party rejects
   * it. `deriveAppointmentView` keeps only cards with this null, so declining a
   * proposed change ("Another time") can never fall back to an older Confirmed
   * card. Mirrors the backend's `assertHandoverReady`.
   */
  deleted_at?: string | null;
  /**
   * When the other party confirmed or declined. Null while Pending, and on a
   * card answered before the backend recorded it.
   */
  responded_at?: string | null;
  created_at: string;
}

export interface GiveawayPost {
  giveaway_id: number;
  /** Null on legacy rows created before item linking existed. */
  item_id: number | null;
  /** Optional fallback label — the linked item's own name is authoritative. */
  item_name: string | null;
  description?: string | null;
  pickup_location: string;
  giver_id: number;
  allocation_method: AllocationMethod;
  quantity: number;
  register_start?: string | null;
  register_deadline?: string | null;
  pickup_start?: string | null;
  pickup_deadline?: string | null;
  registration_open: boolean;
  remaining_slots: number;
  all_registered_guaranteed: boolean;
  status: "Active" | "Closed" | "Completed";
  created_at: string;
  images: Array<{ image_id: number; image_url: string; display_order: number }>;
  giver: UserSummary;
  registered_count: number;
}

export interface GiveawayTicket {
  ticket_id: number;
  giveaway_id: number;
  receiver_id: number;
  queue_number: number;
  status: TicketStatus;
  updated_at: string;
  created_at: string;
  giveaway: GiveawayPost;
}

/**
 * Who else is in a giveaway's group chat room. Built from the full recipient
 * roster, including allocation and collection outcomes.
 */
export interface Entrant {
  receiver_id: number;
  user: UserSummary;
  status: EntrantStatus;
}

/**
 * A chat message the reporter picked out as evidence, as the admin endpoints
 * return it. Images are never expired here: evidence is shown in full.
 */
export interface EvidenceMessage {
  message_id: number;
  room_id: number;
  /** The deal whose chat it came from. */
  transaction_id: number | null;
  sender_id: number;
  sender: UserSummary;
  content: string | null;
  image_urls: string[] | null;
  created_at: string;
}

export interface Report {
  report_id: number;
  reporter_id: number;
  reporter: UserSummary;
  report_type: "Post" | "User" | "Transaction";
  target_id: number;
  reason_category: string;
  details?: string | null;
  evidence_urls?: string[] | null;
  /** Ids of the chat messages the reporter picked. */
  evidence_message_ids?: number[];
  /** Admin endpoints only: those messages, oldest first. */
  evidence_messages?: EvidenceMessage[];
  status: ReportStatus;
  /** Admin endpoints only; null until a violation is confirmed. */
  sanction?: Sanction | null;
  /** Admin endpoints only: who the report is against. */
  reported_user?: (UserSummary & { status: string | null }) | null;
  handled_by?: number | null;
  handler?: UserSummary | null;
  resolution_note?: string | null;
  handled_at?: string | null;
  created_at: string;
}

export interface Appeal {
  appeal_id: number;
  report_id: number;
  appellant_id: number;
  appellant: UserSummary;
  reason: string;
  evidence_urls?: string[] | null;
  status: AppealStatus;
  handled_by?: number | null;
  resolution_note?: string | null;
  created_at: string;
  handled_at?: string | null;
}

/**
 * The reporter's own view of a report. The backend never returns the outcome
 * to the person who filed it (ruling of 2026-10-05), so there is no status,
 * verdict note or handler here to render.
 */
export type SubmittedReport = Pick<
  Report,
  | "report_id"
  | "reporter_id"
  | "reporter"
  | "report_type"
  | "target_id"
  | "reason_category"
  | "details"
  | "evidence_urls"
  | "evidence_message_ids"
  | "created_at"
>;

/** Stored on a confirmed report; `suspend_*` restricts the account. */
export type Sanction = "none" | "warn" | "suspend_temporary" | "suspend_permanent";

/** The verdict an appeal contests, as the admin appeal endpoints embed it. */
export interface AppealReportContext {
  report_id: number;
  report_type: Report["report_type"];
  target_id: number;
  reason_category: string;
  details?: string | null;
  evidence_urls?: string[] | null;
  evidence_message_ids?: number[];
  evidence_messages?: EvidenceMessage[];
  status: ReportStatus;
  sanction: Sanction | null;
  resolution_note?: string | null;
  handled_by?: number | null;
  handler?: UserSummary | null;
  handled_at?: string | null;
}

export interface AdminAppeal extends Appeal {
  report: AppealReportContext;
}
