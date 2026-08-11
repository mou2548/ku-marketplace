/**
 * Fixtures mirroring the project's real seed, `init.sql` at the repository
 * root. Row for row, id for id, including the photos.
 *
 * Why not invented data: the hand-written fixtures this replaced used
 * categories and condition values that do not exist in the database, so the
 * screens were being designed against a vocabulary the backend would never
 * send. Everything here is what the API will actually return.
 *
 * The backend stays untouched (CLAUDE.md §0) — this only reads the seed's
 * shape. Every accessor is `async` and returns what a `fetch` would, so
 * swapping in real endpoints is a body change per function.
 *
 * Three places where `init.sql` and `DatabaseSchema.pdf` disagree. The seed
 * wins, because it is what is in the database:
 *   - `Item.condition` has a fifth value, `Very Good`
 *   - `Item.category` uses readable English names, not the PDF's 10 slugs
 *   - `Subscription_Payment` rejects with `Reject`, not `Rejected`
 *
 * Sample content stays Thai on purpose: the interface is English but everything
 * students type is Thai, and Latin-only placeholder text hides the layout
 * problems Thai causes. See docs/design/tokens.md §7.
 */

import type { AppealStatus, ReportStatus } from "@/lib/status";
import type {
  GiveawayPost,
  GiveawayTicket,
  Item,
  Offer,
  Post,
  Transaction,
  User,
  UserSummary,
} from "./types";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Fixed epoch so server and client renders agree. */
const T0 = Date.parse("2026-08-07T09:00:00+07:00");
const ago = (ms: number) => new Date(T0 - ms).toISOString();
const at = (iso: string) => new Date(iso).toISOString();

/**
 * Somchai (user 2). The only seed user who appears in all three kinds of chat
 * room — a sale in progress, a completed sale, and a giveaway he is running —
 * which is what the unified inbox needs to be reviewable.
 *
 * The trade-off, stated so it is not mistaken for a bug: nobody has made him an
 * offer, so the Offers inbox is empty for this viewer. Switch to 3 (Somsri) to
 * review offers instead.
 */
export const VIEWER_ID = 2;

const FACULTY: Record<number, string> = {
  1: "Administration",
  2: "Engineering",
  3: "Science",
  4: "Engineering",
  5: "Agriculture",
  6: "Humanities",
  7: "Science",
  8: "Engineering",
  9: "Economics",
  10: "Business Administration",
};

function user(id: number, th: string): UserSummary {
  return {
    user_id: id,
    name: th,
    isVerified: true,
    faculty: FACULTY[id],
    year: (id % 4) + 1,
    avatar_url: `https://i.pravatar.cc/150?u=${id}`,
  };
}

/**
 * The viewer's full row.
 *
 * `USERS` holds `UserSummary` — the attribution shape used wherever a person
 * appears next to something they did. The account screen edits the row itself,
 * which needs the columns `DatabaseSchema.pdf` §2.1 actually defines. The Thai
 * name here must stay in step with `USERS[VIEWER_ID]`; they disagreeing is what
 * made /account and /account/edit show two different people.
 */
const VIEWER_PROFILE: User = {
  user_id: VIEWER_ID,
  email: "b6512345@ku.th",
  first_name_en: "Somchai",
  last_name_en: "Saetang",
  first_name_th: "สมชาย",
  last_name_th: "แซ่ตั้ง",
  phone_number: null,
  status: "Active",
  email_verified_at: "2026-06-01T03:00:00.000Z",
  isAdmin: false,
  created_at: "2026-06-01T03:00:00.000Z",
};

export const USERS: Record<number, UserSummary> = {
  1: user(1, "แอดมิน มก"),
  2: user(2, "สมชาย แซ่ตั้ง"),
  3: user(3, "สมศรี แก้วมณี"),
  4: user(4, "อนันต์ ปราการ"),
  5: user(5, "พิมพ์ชนก สุวรรณรัตน์"),
  6: user(6, "ธนวัฒน์ ภักดี"),
  7: user(7, "ชุติมา มณีรัตน์"),
  8: user(8, "ณัฐพงษ์ ธงชัย"),
  9: user(9, "กมลชนก วงษา"),
  10: user(10, "ภูริต กิจเจริญ"),
};

const IMG = (
  id: number,
  url: string,
  itemId: number,
  primary = true,
  order = 1,
) => ({
  image_id: id,
  item_id: itemId,
  image_url: url,
  is_primary: primary,
  display_order: order,
});

export const ITEMS: Item[] = [
  {
    item_id: 1,
    owner_id: 2,
    name: "หนังสือเรียน Calculus 1 (01417111)",
    quantity: 1,
    category: "Books",
    condition: "Good",
    description: "มีรอยไฮไลท์จดตามคาบอาจารย์เล็กน้อย สภาพดีมาก",
    status: "Listed",
    course_name: "01417111",
    brand_model: "สำนักพิมพ์ มก.",
    created_at: ago(12 * DAY),
    images: [IMG(1, "https://picsum.photos/id/24/800/600", 1)],
  },
  {
    item_id: 2,
    owner_id: 2,
    name: "เสื้อเชิ้ตนิสิตชาย แขนยาว Size 42",
    quantity: 1,
    category: "Clothing",
    condition: "Very Good",
    description: "ใส่เฉพาะวันสอบ 2 ครั้ง สภาพเหมือนใหม่",
    status: "Listed",
    size: "42",
    brand_model: "มุมทอง",
    created_at: ago(10 * DAY),
    images: [IMG(2, "https://picsum.photos/id/1059/800/600", 2)],
  },
  {
    item_id: 3,
    owner_id: 3,
    name: "iPad Air 5 64GB WiFi Space Gray",
    quantity: 1,
    category: "Electronics",
    condition: "Very Good",
    description: "แถมเคสและติดฟิล์มกระจกแล้ว สภาพ 95% อุปกรณ์ครบกล่อง",
    status: "Listed",
    brand_model: "Apple iPad Air 5",
    warranty_expiry: "2027-01-01",
    created_at: ago(6 * DAY),
    images: [
      IMG(3, "https://picsum.photos/id/0/800/600", 3),
      IMG(4, "https://picsum.photos/id/1/800/600", 3, false, 2),
    ],
  },
  {
    item_id: 4,
    owner_id: 4,
    name: "หูฟังไร้สาย Sony WH-1000XM4",
    quantity: 1,
    category: "Electronics",
    condition: "Good",
    description: "ตัดเสียงรบกวนดีมาก เหมาะใส่อ่านหนังสือในหอสมุด",
    status: "Listed",
    brand_model: "Sony WH-1000XM4",
    created_at: ago(5 * DAY),
    images: [IMG(5, "https://picsum.photos/id/1082/800/600", 4)],
  },
  {
    item_id: 5,
    owner_id: 5,
    name: "จักรยานปั่นในมก. สีเขียว",
    quantity: 1,
    category: "Vehicles",
    condition: "Acceptable",
    description: "ใช้งานปั่นไปเรียนได้ปกติ ยางเพิ่งเปลี่ยนใหม่",
    status: "Listed",
    brand_model: "LA Bicycle",
    created_at: ago(4 * DAY),
    images: [IMG(6, "https://picsum.photos/id/146/800/600", 5)],
  },
  {
    item_id: 6,
    owner_id: 5,
    name: "ชุดกาวน์แลบ คณะวิทยาศาสตร์ Size L",
    quantity: 1,
    category: "Clothing",
    condition: "Good",
    description: "ซักสะอาดเรียบร้อย ไม่มีรอยเปื้อนเคมี",
    status: "Listed",
    course_name: "01403111",
    size: "L",
    brand_model: "KU Co-op",
    created_at: ago(3 * DAY),
    images: [IMG(7, "https://picsum.photos/id/1025/800/600", 6)],
  },
  {
    item_id: 7,
    owner_id: 6,
    name: "โคมไฟอ่านหนังสือตั้งโต๊ะ LED",
    quantity: 1,
    category: "Home & Living",
    condition: "Very Good",
    description: "ปรับความสว่างได้ 3 ระดับ ชาร์จ USB ได้",
    status: "Listed",
    brand_model: "Xiaomi",
    created_at: ago(2 * DAY),
    images: [IMG(8, "https://picsum.photos/id/201/800/600", 7)],
  },
  {
    item_id: 8,
    owner_id: 7,
    name: "หนังสือ Physics for Scientists (01420111)",
    quantity: 1,
    category: "Books",
    condition: "New",
    description: "ซื้อมาซ้ำยังไม่ได้แกะซีลเลยครับ",
    status: "Listed",
    course_name: "01420111",
    brand_model: "Pearson",
    created_at: ago(1 * DAY),
    images: [IMG(9, "https://picsum.photos/id/367/800/600", 8)],
  },
  {
    item_id: 9,
    owner_id: 8,
    name: "เครื่องคิดเลขวิทยาศาสตร์ FX-991EX",
    quantity: 1,
    category: "Electronics",
    condition: "Good",
    description: "ใช้เข้าห้องสอบวิศวะ/วิทยาได้แน่นอน",
    status: "Transferred",
    course_name: "01417112",
    brand_model: "Casio FX-991EX",
    created_at: ago(20 * DAY),
    images: [IMG(10, "https://picsum.photos/id/160/800/600", 9)],
  },
  {
    item_id: 10,
    owner_id: 10,
    name: "กระเป๋าเป้ใส่โน้ตบุ๊ก 15.6 นิ้ว",
    quantity: 1,
    category: "Bags",
    condition: "Good",
    description: "กันน้ำได้ระดับหนึ่ง มีช่องใส่ของเยอะ",
    status: "Unlisted",
    brand_model: "Targus",
    created_at: ago(30 * DAY),
    images: [IMG(11, "https://picsum.photos/id/1062/800/600", 10)],
  },
  /**
   * Items 11-14 belong to the viewer and are UI mocks, not seed rows.
   *
   * Two things could not be reviewed without them: nothing in the seed has a
   * quantity above one, so the stack badge on an inventory slot never drew;
   * and the viewer owned only SellOnly posts, so nobody could offer them a
   * trade and the Offers inbox stayed empty from both sides.
   */
  {
    item_id: 11,
    owner_id: 2,
    name: "ปากกาหมึกเจล 0.5 มม. (แพ็ก 3 ด้าม)",
    quantity: 3,
    category: "Stationery",
    condition: "New",
    description: "ซื้อมาเป็นแพ็กใหญ่ ใช้ไม่หมด แบ่งขายครับ",
    status: "Unlisted",
    brand_model: "Pentel EnerGel",
    created_at: ago(9 * DAY),
    images: [IMG(12, "https://picsum.photos/id/119/800/600", 11)],
  },
  {
    item_id: 12,
    owner_id: 2,
    name: "สมุดโน้ต A5 ปกแข็ง",
    quantity: 5,
    category: "Stationery",
    condition: "New",
    description: "เหลือจากงานรับน้อง ยังไม่ได้แกะห่อ",
    status: "Listed",
    brand_model: "KU Co-op",
    created_at: ago(8 * DAY),
    images: [IMG(13, "https://picsum.photos/id/20/800/600", 12)],
  },
  {
    item_id: 13,
    owner_id: 2,
    name: "ชีทสรุปแคลคูลัส 2 (01417112)",
    quantity: 12,
    category: "Books",
    condition: "Very Good",
    description: "ปริ้นท์เผื่อไว้เยอะ เหลือแจกจ่ายได้อีกหลายเล่ม",
    status: "Listed",
    course_name: "01417112",
    created_at: ago(7 * DAY),
    images: [IMG(14, "https://picsum.photos/id/159/800/600", 13)],
  },
  {
    // Flow 1's terminal item state. Without one the viewer owns, the third
    // badge on the inventory grid had never rendered.
    item_id: 15,
    owner_id: 2,
    name: "ตู้เก็บของพลาสติก 3 ชั้น",
    quantity: 1,
    category: "Home & Living",
    condition: "Good",
    description: "ส่งมอบให้รุ่นน้องไปแล้วตอนย้ายหอ",
    status: "Transferred",
    brand_model: "SUPERWARE",
    created_at: ago(40 * DAY),
    images: [IMG(16, "https://picsum.photos/id/1060/800/600", 15)],
  },
  {
    item_id: 14,
    owner_id: 2,
    name: "คีย์บอร์ดไร้สาย Logitech K380",
    quantity: 1,
    category: "Electronics",
    condition: "Good",
    description: "ต่อบลูทูธได้ 3 เครื่อง ปุ่มยังแน่นดีครับ",
    status: "Listed",
    brand_model: "Logitech K380",
    created_at: ago(6 * DAY),
    images: [IMG(15, "https://picsum.photos/id/48/800/600", 14)],
  },
];

const itemById = (id: number) => ITEMS.find((i) => i.item_id === id)!;

export const POSTS: Post[] = [
  {
    post_id: 1,
    item_id: 1,
    post_type: "SellOnly",
    price: 250,
    quantity_remaining: 1,
    created_at: ago(12 * DAY),
    item: itemById(1),
    seller: USERS[2],
  },
  {
    post_id: 2,
    item_id: 2,
    post_type: "SellOnly",
    price: 180,
    quantity_remaining: 1,
    created_at: ago(10 * DAY),
    item: itemById(2),
    seller: USERS[2],
  },
  {
    post_id: 3,
    item_id: 3,
    post_type: "Both",
    price: 14500,
    quantity_remaining: 1,
    description: "ขายหรือรับเทรด สนใจอุปกรณ์เสียงหรือโน้ตบุ๊ก",
    wanted_item_offer: "หูฟังตัดเสียงรบกวน หรือโน้ตบุ๊กบางเบา",
    created_at: ago(6 * DAY),
    item: itemById(3),
    seller: USERS[3],
  },
  {
    post_id: 4,
    item_id: 4,
    post_type: "TradeOnly",
    price: 0,
    quantity_remaining: 1,
    description: "รับเทรดเท่านั้น ไม่ขาย",
    wanted_item_offer: "แท็บเล็ตสำหรับจดเลกเชอร์",
    created_at: ago(5 * DAY),
    item: itemById(4),
    seller: USERS[4],
  },
  {
    post_id: 5,
    item_id: 5,
    post_type: "SellOnly",
    price: 800,
    quantity_remaining: 1,
    created_at: ago(4 * DAY),
    item: itemById(5),
    seller: USERS[5],
  },
  {
    post_id: 6,
    item_id: 6,
    post_type: "SellOnly",
    price: 150,
    quantity_remaining: 1,
    created_at: ago(3 * DAY),
    item: itemById(6),
    seller: USERS[5],
  },
  {
    post_id: 7,
    item_id: 7,
    post_type: "SellOnly",
    price: 290,
    quantity_remaining: 1,
    created_at: ago(2 * DAY),
    item: itemById(7),
    seller: USERS[6],
  },
  {
    post_id: 8,
    item_id: 8,
    post_type: "Both",
    price: 450,
    quantity_remaining: 1,
    description: "ขายหรือแลกก็ได้ครับ",
    wanted_item_offer: "หนังสือเคมี 1 หรือชีทสรุปแคลคูลัส",
    created_at: ago(1 * DAY),
    item: itemById(8),
    seller: USERS[7],
  },
  // --- UI mocks: the viewer's own posts that accept trades, so offers can
  // arrive. Every seed post of theirs was SellOnly.
  {
    post_id: 9,
    item_id: 14,
    post_type: "TradeOnly",
    price: 0,
    quantity_remaining: 1,
    description: "ไม่ขายครับ อยากได้เมาส์หรือฮับ USB-C แลก",
    wanted_item_offer: "เมาส์ไร้สาย หรือ USB-C hub",
    created_at: ago(6 * DAY),
    item: itemById(14),
    seller: USERS[2],
  },
  {
    post_id: 10,
    item_id: 13,
    post_type: "Both",
    price: 60,
    quantity_remaining: 12,
    description: "ขายเล่มละ 60 หรือแลกกับชีทวิชาอื่นก็ได้",
    wanted_item_offer: "ชีทสรุปฟิสิกส์ 2 หรือเคมี 1",
    created_at: ago(7 * DAY),
    item: itemById(13),
    seller: USERS[2],
  },
  {
    post_id: 11,
    item_id: 12,
    post_type: "SellOnly",
    price: 45,
    quantity_remaining: 5,
    created_at: ago(8 * DAY),
    item: itemById(12),
    seller: USERS[2],
  },
];

const postById = (id: number) => POSTS.find((p) => p.post_id === id)!;

export const OFFERS: Offer[] = [
  {
    offer_id: 1,
    post_id: 3,
    proposer_id: 4,
    additional_money: 2000,
    status: "Pending",
    created_at: ago(9 * HOUR),
    items: [itemById(4)],
    proposer: USERS[4],
    post: postById(3),
  },
  {
    offer_id: 2,
    post_id: 4,
    proposer_id: 3,
    additional_money: 0,
    status: "Rejected",
    created_at: ago(2 * DAY),
    items: [itemById(3)],
    proposer: USERS[3],
    post: postById(4),
  },
  /**
   * Offers 3-7 are UI mocks. The seed has two offers and the viewer is on
   * neither side of them, so both tabs of the inbox rendered their empty state
   * and no offer status other than Pending and Rejected was ever drawn.
   *
   * 3-5 are offers *to* the viewer, 6-7 are offers *from* them.
   */
  {
    offer_id: 3,
    post_id: 9,
    proposer_id: 5,
    additional_money: 0,
    status: "Pending",
    created_at: ago(4 * HOUR),
    items: [itemById(7)],
    proposer: USERS[5],
    post: postById(9),
  },
  {
    offer_id: 4,
    post_id: 10,
    proposer_id: 7,
    additional_money: 40,
    status: "Accepted",
    created_at: ago(3 * DAY),
    items: [itemById(8)],
    proposer: USERS[7],
    post: postById(10),
  },
  {
    offer_id: 5,
    post_id: 9,
    proposer_id: 3,
    additional_money: 500,
    status: "Rejected",
    created_at: ago(5 * DAY),
    items: [itemById(3)],
    proposer: USERS[3],
    post: postById(9),
  },
  {
    offer_id: 6,
    post_id: 3,
    proposer_id: 2,
    additional_money: 1200,
    status: "Pending",
    created_at: ago(7 * HOUR),
    items: [itemById(14), itemById(1)],
    proposer: USERS[2],
    post: postById(3),
  },
  {
    offer_id: 7,
    post_id: 8,
    proposer_id: 2,
    additional_money: 0,
    status: "Withdrawn",
    created_at: ago(4 * DAY),
    items: [itemById(13)],
    proposer: USERS[2],
    post: postById(8),
  },
];

/**
 * Transactions 4 and 5 are UI mocks, not rows from init.sql.
 *
 * The seed contains three sales, all Meetup, so the trade path and the shipping
 * path had no way of appearing on screen — which is how the stepper shipped
 * with the meetup step in the wrong place and nobody noticed. These two exist
 * so both branches are visible while the UI is being built. Delete them the day
 * the API is connected.
 */
export const TRANSACTIONS: Transaction[] = [
  {
    transaction_id: 1,
    post_id: 1,
    buyer_id: 3,
    seller_id: 2,
    quantity: 1,
    final_amount: 250,
    status: "Processing",
    delivery_method: "Meetup",
    active_report_id: 1,
    slip_image_url: "https://picsum.photos/id/20/600/800",
    payment_confirmed_by_buyer_at: ago(3 * DAY),
    payment_confirmed_by_seller_at: ago(3 * DAY - 2 * HOUR),
    created_at: ago(3 * DAY - 1 * HOUR),
    post: postById(1),
    buyer: USERS[3],
    seller: USERS[2],
  },
  {
    transaction_id: 2,
    post_id: 2,
    buyer_id: 6,
    seller_id: 2,
    quantity: 1,
    final_amount: 180,
    status: "Completed",
    delivery_method: "Meetup",
    slip_image_url: "https://picsum.photos/id/21/600/800",
    payment_confirmed_by_buyer_at: ago(6 * DAY),
    payment_confirmed_by_seller_at: ago(6 * DAY),
    item_received_confirmed_by_buyer_at: ago(5 * DAY),
    created_at: ago(7 * DAY),
    post: postById(2),
    buyer: USERS[6],
    seller: USERS[2],
  },
  // --- UI mock: shipping, tracking entered, waiting on the buyer to confirm.
  {
    transaction_id: 4,
    post_id: 8,
    buyer_id: 7,
    seller_id: 2,
    quantity: 1,
    final_amount: 450,
    status: "Processing",
    delivery_method: "Shipping",
    slip_image_url: "https://picsum.photos/id/22/600/800",
    tracking_number: "TH8842190377KE",
    estimated_delivery_date: at("2026-08-12T00:00:00+07:00"),
    payment_confirmed_by_buyer_at: ago(2 * DAY),
    payment_confirmed_by_seller_at: ago(2 * DAY - 3 * HOUR),
    created_at: ago(2 * DAY - 1 * HOUR),
    post: postById(8),
    buyer: USERS[7],
    seller: USERS[2],
  },
  // --- UI mock: trade with cash on top, so the payment sequence still runs.
  {
    transaction_id: 5,
    post_id: 3,
    offer_id: 1,
    additional_money: 2000,
    buyer_id: 4,
    seller_id: 2,
    quantity: 1,
    final_amount: 2000,
    status: "Pending",
    delivery_method: "Meetup",
    created_at: ago(5 * HOUR),
    post: postById(3),
    buyer: USERS[4],
    seller: USERS[2],
  },
  // --- UI mock: trade with no cash, which skips payment entirely.
  {
    transaction_id: 6,
    post_id: 4,
    offer_id: 2,
    additional_money: 0,
    buyer_id: 2,
    seller_id: 4,
    quantity: 1,
    final_amount: 0,
    status: "Processing",
    delivery_method: "Meetup",
    created_at: ago(30 * HOUR),
    post: postById(4),
    buyer: USERS[2],
    seller: USERS[4],
  },
  {
    transaction_id: 3,
    post_id: 6,
    buyer_id: 8,
    seller_id: 5,
    quantity: 1,
    final_amount: 150,
    status: "Pending",
    delivery_method: "Shipping",
    created_at: ago(20 * HOUR),
    post: postById(6),
    buyer: USERS[8],
    seller: USERS[5],
  },
];

export interface AppointmentSeed {
  appointment_id: number;
  transaction_id: number;
  proposed_by: number;
  date: string;
  time: string;
  location: string;
  status: "Pending" | "Confirmed" | "Rejected";
}

export const APPOINTMENTS: AppointmentSeed[] = [
  {
    appointment_id: 1,
    transaction_id: 1,
    proposed_by: 2,
    date: "2026-08-10",
    time: "13:00:00",
    location: "สำนักหอสมุด มก. (หน้าประตูทางเข้าหลัก)",
    status: "Confirmed",
  },
  {
    appointment_id: 2,
    transaction_id: 2,
    proposed_by: 2,
    date: "2026-08-05",
    time: "16:30:00",
    location: "อาคารเรียนรวม 4 (ศร.4) ชั้น 1",
    status: "Confirmed",
  },
  /**
   * UI mocks covering the other two states. Transaction 6 is deliberately left
   * without a row, so the "no time agreed yet" branch — the one that creates a
   * card — is reachable too.
   */
  {
    appointment_id: 3,
    transaction_id: 5,
    proposed_by: 4,
    date: "2026-08-09",
    time: "11:00:00",
    location: "ลานเกียร์ คณะวิศวกรรมศาสตร์",
    status: "Pending",
  },
  {
    appointment_id: 4,
    transaction_id: 3,
    proposed_by: 8,
    date: "2026-08-08",
    time: "09:00:00",
    location: "หน้าหอพักหญิง ซอย 2",
    status: "Rejected",
  },
];

/**
 * Eight rows so every combination the UI branches on is reachable: all three
 * allocation methods, all three giveaway statuses, the viewer as giver and as
 * entrant. The seed has two rows, both Active, both with the viewer on one
 * side only — which left the Closed and Completed states, the Manual manage
 * screen, and four of the five ticket states with no way to be seen.
 */
export const GIVEAWAYS: GiveawayPost[] = [
  {
    giveaway_id: 1,
    item_name: "ชีทสรุป ฟิสิกส์ 1 พร้อมคลังข้อสอบเก่า",
    description: "แจกต่อให้น้องๆ ครับ ปริ้นท์มาเกินไม่ได้ใช้เลย",
    pickup_location: "โรงอาหารกลาง 1 (บาร์ใหม่)",
    giver_id: 2,
    allocation_method: "FirstCome",
    registered_deadline: at("2026-08-15T17:00:00+07:00"),
    pickup_start_date: at("2026-08-15T17:00:00+07:00"),
    pickup_end_date: at("2026-08-18T17:00:00+07:00"),
    status: "Active",
    created_at: ago(2 * DAY),
    images: [
      { image_id: 1, image_url: "https://picsum.photos/id/24/800/600", display_order: 1 },
    ],
    giver: USERS[2],
    registered_count: 2,
  },
  {
    giveaway_id: 2,
    item_name: "เสื้อช็อปคณะวิศวกรรมศาสตร์ Size M",
    description: "ส่งต่อครับ เรียนจบแล้ว สภาพยังดีอยู่มาก",
    pickup_location: "ตึกช็อปวิศวะ (หน้าลานเกียร์)",
    giver_id: 8,
    allocation_method: "Random",
    registered_deadline: at("2026-08-20T18:00:00+07:00"),
    pickup_start_date: at("2026-08-20T18:00:00+07:00"),
    pickup_end_date: at("2026-08-23T18:00:00+07:00"),
    status: "Active",
    created_at: ago(1 * DAY),
    images: [
      { image_id: 2, image_url: "https://picsum.photos/id/1025/800/600", display_order: 1 },
    ],
    giver: USERS[8],
    registered_count: 1,
  },
  // --- UI mocks from here down.
  {
    giveaway_id: 3,
    item_name: "กระถางต้นไม้เล็ก พร้อมดินปลูก",
    description: "เลี้ยงไม่ไหวแล้วครับ อยากส่งต่อให้คนที่ดูแลต่อได้จริงๆ",
    pickup_location: "หอพักนิสิตชาย ซอย 3 (ล็อบบี้)",
    giver_id: 2,
    allocation_method: "Manual",
    registered_deadline: at("2026-08-12T20:00:00+07:00"),
    pickup_start_date: at("2026-08-13T09:00:00+07:00"),
    pickup_end_date: at("2026-08-16T18:00:00+07:00"),
    status: "Active",
    created_at: ago(18 * HOUR),
    images: [
      { image_id: 3, image_url: "https://picsum.photos/id/106/800/600", display_order: 1 },
    ],
    giver: USERS[2],
    registered_count: 3,
  },
  {
    giveaway_id: 4,
    item_name: "เครื่องเขียนเตรียมสอบ (ชุดใหญ่)",
    description: "จัดชุดไว้แจกช่วงสอบกลางภาคครับ",
    pickup_location: "สำนักหอสมุด มก. (โต๊ะประชาสัมพันธ์)",
    giver_id: 3,
    allocation_method: "FirstCome",
    registered_deadline: at("2026-08-06T12:00:00+07:00"),
    pickup_start_date: at("2026-08-07T09:00:00+07:00"),
    pickup_end_date: at("2026-08-11T18:00:00+07:00"),
    status: "Closed",
    created_at: ago(6 * DAY),
    images: [
      { image_id: 4, image_url: "https://picsum.photos/id/180/800/600", display_order: 1 },
    ],
    giver: USERS[3],
    registered_count: 4,
  },
  {
    giveaway_id: 5,
    item_name: "โคมไฟหัวเตียงเล็ก",
    description: "ย้ายหอแล้วเอาไปไม่ได้ครับ",
    pickup_location: "อาคารเรียนรวม 3 (ศร.3) ชั้น 1",
    giver_id: 5,
    allocation_method: "Random",
    registered_deadline: at("2026-07-28T17:00:00+07:00"),
    pickup_start_date: at("2026-07-29T10:00:00+07:00"),
    pickup_end_date: at("2026-08-02T17:00:00+07:00"),
    status: "Completed",
    created_at: ago(14 * DAY),
    images: [
      { image_id: 5, image_url: "https://picsum.photos/id/201/800/600", display_order: 1 },
    ],
    giver: USERS[5],
    registered_count: 6,
  },
  {
    giveaway_id: 6,
    item_name: "หนังสือนิยายภาษาอังกฤษ 4 เล่ม",
    description: "อ่านจบแล้ว อยากให้คนที่อ่านต่อจริงๆ เลยขอเลือกเองนะครับ",
    pickup_location: "โรงอาหารกลาง 2 (ชั้นลอย)",
    giver_id: 7,
    allocation_method: "Manual",
    registered_deadline: at("2026-08-14T19:00:00+07:00"),
    pickup_start_date: at("2026-08-15T10:00:00+07:00"),
    pickup_end_date: at("2026-08-19T18:00:00+07:00"),
    status: "Active",
    created_at: ago(10 * HOUR),
    images: [
      { image_id: 6, image_url: "https://picsum.photos/id/367/800/600", display_order: 1 },
    ],
    giver: USERS[7],
    registered_count: 5,
  },
  {
    giveaway_id: 7,
    item_name: "จอคอมพิวเตอร์ 22 นิ้ว (มือสอง)",
    description: "อัปเกรดจอใหม่แล้ว ตัวเดิมยังใช้ได้ปกติครับ",
    pickup_location: "ตึกวิศวกรรมคอมพิวเตอร์ (หน้าห้องแลบ)",
    giver_id: 6,
    allocation_method: "Random",
    registered_deadline: at("2026-08-04T18:00:00+07:00"),
    pickup_start_date: at("2026-08-05T10:00:00+07:00"),
    pickup_end_date: at("2026-08-09T18:00:00+07:00"),
    status: "Closed",
    created_at: ago(9 * DAY),
    images: [
      { image_id: 7, image_url: "https://picsum.photos/id/0/800/600", display_order: 1 },
    ],
    giver: USERS[6],
    registered_count: 11,
  },
  {
    giveaway_id: 8,
    item_name: "กระเป๋าผ้าลดโลกร้อน มก.",
    description: "ได้มาจากงานกิจกรรม เหลือหลายใบครับ",
    pickup_location: "ลานหน้าอาคารสารนิเทศ 50 ปี",
    giver_id: 10,
    allocation_method: "FirstCome",
    registered_deadline: at("2026-07-25T17:00:00+07:00"),
    pickup_start_date: at("2026-07-26T10:00:00+07:00"),
    pickup_end_date: at("2026-07-30T17:00:00+07:00"),
    status: "Closed",
    created_at: ago(20 * DAY),
    images: [
      { image_id: 8, image_url: "https://picsum.photos/id/1062/800/600", display_order: 1 },
    ],
    giver: USERS[10],
    registered_count: 8,
  },
];

const giveawayById = (id: number) => GIVEAWAYS.find((g) => g.giveaway_id === id)!;

/**
 * Tickets 4-8 belong to the viewer and cover all five `TicketStatus` values;
 * 9-13 are other entrants, so the Manual manage screen has a roster and the
 * derived entrant status below has something to derive from.
 */
export const TICKETS: GiveawayTicket[] = [
  {
    ticket_id: 1,
    giveaway_id: 1,
    receiver_id: 4,
    status: "Waiting",
    updated_at: ago(2 * DAY),
    created_at: ago(2 * DAY),
    giveaway: giveawayById(1),
  },
  {
    ticket_id: 2,
    giveaway_id: 1,
    receiver_id: 7,
    status: "Waiting",
    updated_at: ago(2 * DAY),
    created_at: ago(2 * DAY),
    giveaway: giveawayById(1),
  },
  {
    ticket_id: 3,
    giveaway_id: 2,
    receiver_id: 3,
    status: "Waiting",
    updated_at: ago(1 * DAY),
    created_at: ago(1 * DAY),
    giveaway: giveawayById(2),
  },
  // --- The viewer's own entries, one per ticket state.
  {
    ticket_id: 4,
    giveaway_id: 6,
    receiver_id: 2,
    status: "Registered",
    updated_at: ago(9 * HOUR),
    created_at: ago(9 * HOUR),
    giveaway: giveawayById(6),
  },
  {
    ticket_id: 5,
    giveaway_id: 4,
    receiver_id: 2,
    status: "Waiting",
    updated_at: ago(1 * DAY),
    created_at: ago(6 * DAY),
    giveaway: giveawayById(4),
  },
  {
    ticket_id: 6,
    giveaway_id: 5,
    receiver_id: 2,
    status: "Received",
    updated_at: ago(6 * DAY),
    created_at: ago(14 * DAY),
    giveaway: giveawayById(5),
  },
  {
    ticket_id: 7,
    giveaway_id: 7,
    receiver_id: 2,
    status: "Not_Selected",
    updated_at: ago(3 * DAY),
    created_at: ago(9 * DAY),
    giveaway: giveawayById(7),
  },
  {
    ticket_id: 8,
    giveaway_id: 8,
    receiver_id: 2,
    status: "Expired",
    updated_at: ago(8 * DAY),
    created_at: ago(20 * DAY),
    giveaway: giveawayById(8),
  },
  // --- Other entrants on the viewer's Manual giveaway.
  {
    ticket_id: 9,
    giveaway_id: 3,
    receiver_id: 5,
    status: "Registered",
    updated_at: ago(16 * HOUR),
    created_at: ago(16 * HOUR),
    giveaway: giveawayById(3),
  },
  {
    ticket_id: 10,
    giveaway_id: 3,
    receiver_id: 6,
    status: "Registered",
    updated_at: ago(14 * HOUR),
    created_at: ago(14 * HOUR),
    giveaway: giveawayById(3),
  },
  {
    ticket_id: 11,
    giveaway_id: 3,
    receiver_id: 9,
    status: "Registered",
    updated_at: ago(11 * HOUR),
    created_at: ago(11 * HOUR),
    giveaway: giveawayById(3),
  },
  {
    ticket_id: 12,
    giveaway_id: 4,
    receiver_id: 8,
    status: "Not_Selected",
    updated_at: ago(1 * DAY),
    created_at: ago(6 * DAY),
    giveaway: giveawayById(4),
  },
  {
    ticket_id: 13,
    giveaway_id: 4,
    receiver_id: 9,
    status: "Received",
    updated_at: ago(20 * HOUR),
    created_at: ago(6 * DAY),
    giveaway: giveawayById(4),
  },
];

/**
 * Chat_Room rows. The schema makes the room the primary object — `room_id` is
 * the key and both `transaction_id` and `giveaway_id` are nullable — so the UI
 * follows that: one room type, one route, whatever it is attached to.
 */
export interface ChatRoom {
  room_id: number;
  transaction_id: number | null;
  giveaway_id: number | null;
}

export const CHAT_ROOMS: ChatRoom[] = [
  { room_id: 1, transaction_id: 1, giveaway_id: null },
  { room_id: 2, transaction_id: 2, giveaway_id: null },
  { room_id: 3, transaction_id: null, giveaway_id: 1 },
  // --- UI mocks, paired with the mock transactions above.
  { room_id: 4, transaction_id: 4, giveaway_id: null },
  { room_id: 5, transaction_id: 5, giveaway_id: null },
  { room_id: 6, transaction_id: 6, giveaway_id: null },
];

export interface ChatSeed {
  message_id: number;
  room_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  transaction_id: number | null;
  giveaway_id: number | null;
}

export const CHAT: ChatSeed[] = [
  {
    message_id: 1,
    created_at: ago(74 * HOUR),
    room_id: 1,
    sender_id: 3,
    transaction_id: 1,
    giveaway_id: null,
    content: "สวัสดีครับพี่ โอนเงินค่าหนังสือแคลคูลัสเรียบร้อยแล้วนะครับ",
  },
  {
    message_id: 2,
    created_at: ago(73 * HOUR),
    room_id: 1,
    sender_id: 2,
    transaction_id: 1,
    giveaway_id: null,
    content: "ได้รับยอดแล้วครับ สะดวกนัดรับวันจันทร์ตอนบ่ายโมงไหมครับ?",
  },
  {
    message_id: 3,
    created_at: ago(72 * HOUR),
    room_id: 1,
    sender_id: 3,
    transaction_id: 1,
    giveaway_id: null,
    content: "สะดวกครับ เจอตรงหน้าประตูทางเข้าหอสมุดนะครับ",
  },
  {
    message_id: 4,
    created_at: ago(145 * HOUR),
    room_id: 2,
    sender_id: 6,
    transaction_id: 2,
    giveaway_id: null,
    content: "เสื้อนิสิตซักตากเรียบร้อยแล้วใช่ไหมครับ",
  },
  {
    message_id: 5,
    created_at: ago(144 * HOUR),
    room_id: 2,
    sender_id: 2,
    transaction_id: 2,
    giveaway_id: null,
    content: "ใช่ครับ ซักรีดเรียบร้อยพร้อมใส่ได้เลยครับ",
  },
  // --- UI mock threads.
  {
    message_id: 7,
    created_at: ago(2 * DAY),
    room_id: 4,
    sender_id: 7,
    transaction_id: 4,
    giveaway_id: null,
    content: "โอนแล้วนะครับ รบกวนส่งตามที่อยู่ในโปรไฟล์เลยครับ",
  },
  {
    message_id: 8,
    created_at: ago(2 * DAY - 4 * HOUR),
    room_id: 4,
    sender_id: 2,
    transaction_id: 4,
    giveaway_id: null,
    content: "ส่งให้แล้วครับ เลขพัสดุอยู่ในระบบแล้วนะครับ",
  },
  {
    message_id: 9,
    created_at: ago(5 * HOUR),
    room_id: 5,
    sender_id: 4,
    transaction_id: 5,
    giveaway_id: null,
    content: "สนใจแลกหูฟังกับ iPad ครับ เพิ่มเงินให้ 2000 ครับ",
  },
  {
    message_id: 10,
    created_at: ago(30 * HOUR),
    room_id: 6,
    sender_id: 2,
    transaction_id: 6,
    giveaway_id: null,
    content: "แลกกันเลยครับ ไม่ต้องเพิ่มเงิน นัดที่ลานเกียร์ได้ไหมครับ",
  },
  {
    message_id: 6,
    created_at: ago(48 * HOUR),
    room_id: 3,
    sender_id: 2,
    transaction_id: null,
    giveaway_id: 1,
    content: "ยินดีด้วยกับน้องๆ ที่กดรับสิทธิ์ทันนะครับ นัดรับชีทที่บาร์ใหม่ได้เลย",
  },
];

/* ------------------------------------------------------------------ *
 * Accessors. Async on purpose — these become fetch calls unchanged.
 * ------------------------------------------------------------------ */

export async function getPosts(): Promise<Post[]> {
  return POSTS;
}

export async function getPost(postId: number): Promise<Post | undefined> {
  return POSTS.find((p) => p.post_id === postId);
}

export async function getMyItems(): Promise<Item[]> {
  return ITEMS.filter((i) => i.owner_id === VIEWER_ID);
}

export async function getTransactions(): Promise<Transaction[]> {
  return TRANSACTIONS;
}

export async function getTransaction(id: number): Promise<Transaction | undefined> {
  return TRANSACTIONS.find((t) => t.transaction_id === id);
}

export async function getAppointment(
  transactionId: number,
): Promise<AppointmentSeed | undefined> {
  return APPOINTMENTS.find((a) => a.transaction_id === transactionId);
}

export async function getMessages(transactionId: number): Promise<ChatSeed[]> {
  return CHAT.filter((m) => m.transaction_id === transactionId);
}

export async function getRooms(): Promise<ChatRoom[]> {
  return CHAT_ROOMS;
}

export async function getRoom(roomId: number): Promise<ChatRoom | undefined> {
  return CHAT_ROOMS.find((r) => r.room_id === roomId);
}

export async function getRoomMessages(roomId: number): Promise<ChatSeed[]> {
  return CHAT.filter((m) => m.room_id === roomId);
}

export async function getGiveaway(id: number): Promise<GiveawayPost | undefined> {
  return GIVEAWAYS.find((g) => g.giveaway_id === id);
}

export async function getOffers(): Promise<Offer[]> {
  return OFFERS;
}

export async function getGiveaways(): Promise<GiveawayPost[]> {
  return GIVEAWAYS;
}

export async function getMyTickets(): Promise<GiveawayTicket[]> {
  return TICKETS.filter((t) => t.receiver_id === VIEWER_ID);
}

export async function getViewer(): Promise<UserSummary> {
  return USERS[VIEWER_ID];
}

/** The full row, for the one screen that edits it. `GET /users/me`. */
export async function getViewerProfile(): Promise<User> {
  return VIEWER_PROFILE;
}

/* ------------------------------------------------------------------ *
 * Giveaway entrants, notifications, membership, moderation.
 * ------------------------------------------------------------------ */

export interface Entrant {
  receiver_id: number;
  user: UserSummary;
  registered_at: string;
  status: "Registered" | "Selected" | "Not_Selected";
}

/**
 * Entrant status is derived from the ticket, not hardcoded: a roster that says
 * "Registered" next to someone who has already collected is a roster the giver
 * cannot use.
 */
export async function getEntrants(giveawayId: number): Promise<Entrant[]> {
  return TICKETS.filter((t) => t.giveaway_id === giveawayId).map((t) => {
    let status: Entrant["status"];
    switch (t.status) {
      // Expired counts as selected: the place was theirs, they did not collect
      // it in time. Folding it into Not_Selected would rewrite what happened.
      case "Waiting":
      case "Received":
      case "Expired":
        status = "Selected";
        break;
      case "Not_Selected":
        status = "Not_Selected";
        break;
      case "Registered":
        status = "Registered";
        break;
    }
    return {
      receiver_id: t.receiver_id,
      user: USERS[t.receiver_id],
      registered_at: t.created_at,
      status,
    };
  });
}

export interface Notification {
  notification_id: number;
  kind: "deal" | "offer" | "giveaway" | "moderation";
  title: string;
  body: string;
  href: string;
  created_at: string;
  read: boolean;
}

export async function getNotifications(): Promise<Notification[]> {
  return [
    {
      notification_id: 1,
      kind: "offer",
      title: "New trade offer on your iPad",
      body: "อนันต์ ปราการ offered หูฟังไร้สาย Sony WH-1000XM4 plus ฿2,000.",
      href: "/offers/1",
      created_at: ago(9 * HOUR),
      read: false,
    },
    {
      notification_id: 2,
      kind: "moderation",
      title: "Your report is being investigated",
      body: "An admin picked up report #1 about the Calculus 1 deal.",
      href: "/history/1",
      created_at: ago(1 * DAY),
      read: false,
    },
    {
      notification_id: 3,
      kind: "deal",
      title: "Meetup confirmed",
      body: "สมชาย แซ่ตั้ง confirmed 10 Aug at 13:00, สำนักหอสมุด มก.",
      href: "/history/1",
      created_at: ago(2 * DAY),
      read: true,
    },
  ];
}

export type MembershipTier = "Free" | "Silver" | "Gold" | "Diamond";

export interface Membership {
  tier: MembershipTier;
  expires_at?: string | null;
  pending_review: boolean;
}

export async function getMembership(): Promise<Membership> {
  // Subscription row 3: Somsri is on Silver with 25 days remaining.
  return {
    tier: "Silver",
    expires_at: at("2026-09-01T00:00:00+07:00"),
    pending_review: false,
  };
}

export interface AdminReportRow {
  report_id: number;
  reporter: UserSummary;
  reason_category: string;
  status: ReportStatus;
  created_at: string;
  target: string;
  details: string;
}

export async function getAdminReports(): Promise<AdminReportRow[]> {
  return [
    {
      report_id: 1,
      reporter: USERS[3],
      reason_category: "Non-responsive seller",
      status: "Under_Investigation",
      created_at: ago(1 * DAY),
      target: "Deal 1",
      details: "ผู้ขายไม่ยอมมาตามนัดหมายที่หอสมุดและติดต่อไม่ได้",
    },
    {
      report_id: 2,
      reporter: USERS[6],
      reason_category: "Misleading description",
      status: "Pending",
      created_at: ago(8 * HOUR),
      target: "Post 5",
      details: "จักรยานเบรคเสื่อมสภาพมากไม่ตรงตามที่ลงไว้",
    },
  ];
}

export interface AdminAppealRow {
  appeal_id: number;
  report_id: number;
  appellant: UserSummary;
  status: AppealStatus;
  created_at: string;
  reason: string;
}

export async function getAdminAppeals(): Promise<AdminAppealRow[]> {
  return [
    {
      appeal_id: 1,
      report_id: 1,
      appellant: USERS[2],
      status: "Appeal_Submitted",
      created_at: ago(6 * HOUR),
      reason:
        "วันนั้นติดสอบกะทันหันครับ พยายามติดต่อผู้ซื้อแล้วแต่สัญญาณโทรศัพท์ไม่มี",
    },
  ];
}

export interface MembershipRequest {
  request_id: number;
  user: UserSummary;
  tier: MembershipTier;
  amount: number;
  slip_image_url: string;
  created_at: string;
}

export async function getMembershipRequests(): Promise<MembershipRequest[]> {
  // Payment 4 in the seed was rejected; it is the one still needing a human.
  return [
    {
      request_id: 4,
      user: USERS[4],
      tier: "Diamond",
      amount: 199,
      slip_image_url: "https://picsum.photos/id/104/600/800",
      created_at: ago(1 * DAY),
    },
  ];
}
