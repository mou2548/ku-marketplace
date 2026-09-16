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
  ItemStatus,
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
  status: ItemStatus;
  /** Books and lecture notes. Persona P1 searches by this. */
  course_name?: string | null;
  brand_model?: string | null;
  warranty_expiry?: string | null;
  size?: string | null;
  created_at: string;
  images: ItemImage[];
}

export interface ItemHistorySummary {
  item_id: number;
  inventory_quantity: number;
  posted_quantity: number;
  currently_listed_quantity: number;
  sold_quantity: number;
  traded_quantity: number;
}

export interface Post {
  post_id: number;
  item_id: number;
  post_type: PostType;
  price: number;
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
  slip_image_url?: string | null;
  tracking_number?: string | null;
  estimated_delivery_date?: string | null;
  payment_confirmed_by_buyer_at?: string | null;
  payment_confirmed_by_seller_at?: string | null;
  item_received_confirmed_by_buyer_at?: string | null;
  item_received_confirmed_by_seller_at?: string | null;
  cancellation_requested_by?: number | null;
  cancellation_reason?: string | null;
  cancellation_requested_at?: string | null;
  cancellation_response?: "Pending" | "Approved" | "Rejected" | null;
  refund_slip_url?: string | null;
  refund_submitted_at?: string | null;
  refund_confirmed_by_buyer?: boolean | null;
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
  created_at: string;
}

export interface GiveawayPost {
  giveaway_id: number;
  item_name: string;
  description?: string | null;
  pickup_location: string;
  giver_id: number;
  allocation_method: AllocationMethod;
  quantity: number;
  register_deadline?: string | null;
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

export interface Report {
  report_id: number;
  reporter_id: number;
  reporter: UserSummary;
  report_type: "Post" | "User" | "Transaction";
  target_id: number;
  reason_category: string;
  details?: string | null;
  evidence_urls?: string[] | null;
  status: ReportStatus;
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
