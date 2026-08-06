import type { ProductCategory, ProductCondition } from "@/lib/marketplace-products";

/**
 * Personal inventory items — proposal §2 (ระบบคลังสิ่งของส่วนบุคคล).
 *
 * An item is the *thing you own*. It carries no price and no exchange terms:
 * §2.1 puts those on the post instead, because the same item can be listed
 * under different terms each time it goes up. See lib/posts.ts.
 */

/** §2.1 — the four condition grades, in the order the proposal lists them. */
export const ITEM_CONDITIONS = [
  "new",
  "very-good",
  "good",
  "usable-with-flaws",
] as const;

export type ItemCondition = (typeof ITEM_CONDITIONS)[number];

export const ITEM_CONDITION_LABELS: Record<
  ItemCondition,
  { th: string; en: string }
> = {
  new: { th: "ใหม่", en: "New" },
  "very-good": { th: "สภาพดีมาก", en: "Like New" },
  good: { th: "สภาพดี", en: "Good" },
  "usable-with-flaws": { th: "ใช้งานได้แต่มีตำหนิ", en: "Fair" },
};

/**
 * The public feed (lib/marketplace-products.ts) predates this file and only
 * models three grades. Until that feed is migrated, this maps the canonical
 * four onto what a ProductCard can render.
 * TODO: widen ProductCondition to ItemCondition and delete this map.
 */
export const PRODUCT_CONDITION_BY_ITEM_CONDITION: Record<
  ItemCondition,
  ProductCondition
> = {
  new: "LIKE NEW",
  "very-good": "LIKE NEW",
  good: "EXCELLENT",
  "usable-with-flaws": "FAIR",
};

/**
 * §2.3 — the item lifecycle. Deliberately separate from TradeStatus: one item
 * can survive several failed transactions before it actually changes hands.
 *
 * `transferred` is terminal and never reverts — §2.3.3 is explicit that even a
 * later-cancelled trade does not hand the item back, because its real condition
 * has probably changed by then.
 */
export type ItemStatus = "unlisted" | "listed" | "transferred";

export const ITEM_STATUS_LABELS: Record<ItemStatus, { th: string; en: string }> =
  {
    unlisted: { th: "ยังไม่ประกาศขาย", en: "Unlisted" },
    listed: { th: "ประกาศขายแล้ว", en: "Listed" },
    transferred: { th: "โอนเจ้าของแล้ว", en: "Transferred" },
  };

/**
 * §2.2 — categories that demand extra required fields. Everything not in this
 * map takes the common fields only.
 */
export const REQUIRED_CATEGORY_FIELDS = {
  "Books & Textbooks": ["subjectName"],
  Electronics: ["brandModel", "warrantyStatus"],
  "Clothing & Fashion": ["size"],
} as const satisfies Partial<Record<ProductCategory, readonly string[]>>;

export interface ItemCategoryFields {
  /** Books & Textbooks — free text, no autocomplete (§2.2). */
  subjectName?: string;
  /** Electronics — brand and model. */
  brandModel?: string;
  /** Electronics — omit when out of warranty; `expiresAt` required when set. */
  warranty?: { covered: boolean; expiresAt?: string };
  /** Clothing & Fashion. */
  size?: string;
}

export interface InventoryItem {
  id: string;
  ownerId: string;
  name: string;
  /** §2.1 — between 1 and 5 photos. Enforce the bound at the form, not here. */
  images: string[];
  category: ProductCategory;
  condition: ItemCondition;
  /** §2.1 — optional. */
  description?: string;
  categoryFields?: ItemCategoryFields;
  status: ItemStatus;
  /**
   * §2.3 (closing paragraph) — what freezes an item is *having a live trade*,
   * not being `listed`. An `unlisted` item attached to an accepted offer is
   * just as frozen as a listed one. Null means free.
   */
  lockedByTradeId: string | null;
}

/** §2.3 — frozen against edit, delete, and being offered again. */
export function isItemLocked(item: InventoryItem): boolean {
  return item.lockedByTradeId !== null;
}

/** §2.3.1 vs §2.3.2 — a listed item may only change price/terms, on its post. */
export function canEditItemDetails(item: InventoryItem): boolean {
  return !isItemLocked(item) && item.status === "unlisted";
}

export function canDeleteItem(item: InventoryItem): boolean {
  return !isItemLocked(item) && item.status !== "transferred";
}

/**
 * §3.2 — both `unlisted` and `listed` items can go into an offer, and one item
 * can sit in several pending offers at once. Only a live trade stops it.
 */
export function canOfferItem(item: InventoryItem): boolean {
  return !isItemLocked(item) && item.status !== "transferred";
}

const CALCULATOR_IMAGE =
  "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=400&auto=format&fit=crop";

/** The signed-in demo user. TODO: replace with the real session user id. */
export const CURRENT_USER_ID = "user-me";

/**
 * Every item this demo knows about, ours and our counterparties'. Trade screens
 * need both sides, so the store can't be scoped to one owner.
 * TODO: replace with the real API — items by id, inventory by owner.
 */
export const ITEMS: InventoryItem[] = [
  {
    id: "item-1",
    ownerId: CURRENT_USER_ID,
    name: "Calculus: Early Transcendentals",
    images: [
      "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400&auto=format&fit=crop",
    ],
    category: "Books & Textbooks",
    condition: "very-good",
    description:
      "Used for 1 term, excellent condition. Perfect for engineering/science students.",
    categoryFields: { subjectName: "01417167 Engineering Mathematics I" },
    status: "listed",
    lockedByTradeId: null,
  },
  {
    id: "item-2",
    ownerId: CURRENT_USER_ID,
    name: "Sony WH-1000XM4",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400&auto=format&fit=crop",
    ],
    category: "Electronics",
    condition: "new",
    description:
      "Battery working perfectly (30+ hours). Noise cancellation is top notch.",
    categoryFields: {
      brandModel: "Sony WH-1000XM4",
      warranty: { covered: true, expiresAt: "2027-03-14" },
    },
    status: "listed",
    lockedByTradeId: null,
  },
  {
    id: "item-3",
    ownerId: CURRENT_USER_ID,
    name: "Lab Coat (Size M)",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/d/d8/Lab_coat_and_scrubs.jpg",
    ],
    category: "Clothing & Fashion",
    condition: "very-good",
    description: "Clean, used only twice for chemistry labs. No stains.",
    categoryFields: { size: "M" },
    // Locked while trade-2 runs — an unlisted item can be frozen too (§2.3).
    status: "unlisted",
    lockedByTradeId: "trade-2",
  },
  {
    id: "item-4",
    ownerId: CURRENT_USER_ID,
    name: "KU Engineering Uniform (Size L)",
    images: ["/images/product-uniform.png"],
    category: "Clothing & Fashion",
    condition: "good",
    description:
      "Kasetsart University engineering workshop shirt. Comfortable material.",
    categoryFields: { size: "L" },
    status: "unlisted",
    lockedByTradeId: null,
  },
  {
    id: "item-5",
    ownerId: CURRENT_USER_ID,
    name: "Casio Scientific fx-991EX",
    images: [CALCULATOR_IMAGE],
    category: "Electronics",
    condition: "new",
    description:
      "Highly recommended for engineering math and stats. Solar + Battery.",
    categoryFields: {
      brandModel: "Casio fx-991EX",
      warranty: { covered: false },
    },
    status: "unlisted",
    lockedByTradeId: null,
  },
  {
    id: "item-6",
    ownerId: CURRENT_USER_ID,
    name: "Drafting Table A2",
    images: [
      "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=400&auto=format&fit=crop",
    ],
    category: "Specialized Equipment",
    condition: "good",
    description: "Portable drafting board for architecture and drawing lessons.",
    status: "unlisted",
    lockedByTradeId: null,
  },
  {
    id: "item-7",
    ownerId: CURRENT_USER_ID,
    name: "Minimalist Desk Lamp",
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=400&auto=format&fit=crop",
    ],
    category: "Dorm Essentials",
    condition: "very-good",
    description:
      "Warm-light LED desk lamp, USB powered. Great for late-night studying.",
    status: "unlisted",
    lockedByTradeId: null,
  },
  {
    id: "item-8",
    ownerId: CURRENT_USER_ID,
    name: "Physics Textbook (3rd Edition)",
    images: ["/images/product-physics-textbooks.png"],
    category: "Books & Textbooks",
    condition: "good",
    description: "Handed over in trade-3. Kept here as a transferred record.",
    categoryFields: { subjectName: "01420111 General Physics I" },
    // Terminal — trade-3 completed. Never goes back to unlisted (§2.3.3).
    status: "transferred",
    lockedByTradeId: null,
  },

  // Counterparty items. Only the fields the trade screens actually read are
  // filled in — these never appear in /inventory.
  {
    id: "item-9",
    ownerId: "user-ploy",
    name: "Scientific Calculator",
    images: [CALCULATOR_IMAGE],
    category: "Electronics",
    condition: "very-good",
    categoryFields: { brandModel: "Casio fx-991EX", warranty: { covered: false } },
    status: "unlisted",
    lockedByTradeId: "trade-1",
  },
  {
    id: "item-10",
    ownerId: "user-kritsada",
    name: "Drafting Tools Set",
    images: [
      "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=400&auto=format&fit=crop",
    ],
    category: "Specialized Equipment",
    condition: "usable-with-flaws",
    description: "Missing one ruler.",
    status: "listed",
    lockedByTradeId: "trade-2",
  },
  {
    id: "item-11",
    ownerId: "user-chaya",
    name: "Sony WH-1000XM4",
    images: ["/images/product-sony-headphones.png"],
    category: "Electronics",
    condition: "good",
    status: "listed",
    lockedByTradeId: null,
  },
  {
    id: "item-12",
    ownerId: "user-anan",
    name: "Mechanical Pencil Set",
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=400&auto=format&fit=crop",
    ],
    category: "Stationery & Supplies",
    condition: "new",
    status: "transferred",
    lockedByTradeId: null,
  },
];

export function getItem(itemId: string): InventoryItem | undefined {
  return ITEMS.find((item) => item.id === itemId);
}

/** The signed-in user's own inventory — what /inventory renders. */
export function myItems(): InventoryItem[] {
  return ITEMS.filter((item) => item.ownerId === CURRENT_USER_ID);
}
