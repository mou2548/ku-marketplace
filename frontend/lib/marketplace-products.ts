export type SellerBadge = "verified" | "top-seller" | "swap-champion" | "none";
export type ProductCondition = "LIKE NEW" | "EXCELLENT" | "FAIR";
export type ProductMode = "buy" | "swap" | "both";

export interface ProductSpec {
  label: string;
  value: string;
}

// The 10 categories from the project proposal (§2.2, "หมวดหมู่สินค้าครอบคลุม
// 10 ประเภท"). Keep this list and CATEGORY_FILTERS in app/marketplace/page.tsx
// in sync — it's the single source of truth for category taxonomy.
export const PRODUCT_CATEGORIES = [
  "Books & Textbooks", // หนังสือ/ตำราเรียน — requires a subject-name spec
  "Stationery & Supplies", // เครื่องเขียน/อุปกรณ์การเรียน
  "Electronics", // อิเล็กทรอนิกส์ — requires brand/model + warranty spec
  "Clothing & Fashion", // เสื้อผ้า/แฟชั่น — requires a size spec
  "Dorm Essentials", // ของใช้ในหอพัก
  "Sports & Exercise", // กีฬา/ออกกำลังกาย
  "Specialized Equipment", // อุปกรณ์เฉพาะทาง
  "Bicycles & Vehicles", // จักรยาน/ยานพาหนะ
  "Campus Tickets & Passes", // ตั๋ว/บัตรกิจกรรมในรั้วมหาวิทยาลัย
  "Other", // และอื่น ๆ
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface Product {
  id: string;
  image: string;
  title: string;
  category: ProductCategory;
  sellerName: string;
  sellerAvatar: string;
  sellerBadge: SellerBadge;
  sellerRating: number;
  sellerSalesCount: number;
  condition: ProductCondition;
  price?: number;
  mode: ProductMode;
  liked?: boolean;
  specs: ProductSpec[];
  sellerNotes: string;
}

// TODO: replace with real product listings from the API
const BASE_PRODUCTS: Product[] = [
  {
    id: "sony-headphones",
    image: "/images/product-sony-headphones.png",
    title: "Sony WH-1000XM4",
    category: "Electronics",
    sellerName: "Nattawut S.",
    sellerAvatar: "/images/seller-avatar-1.png",
    sellerBadge: "verified",
    sellerRating: 4.8,
    sellerSalesCount: 64,
    condition: "LIKE NEW",
    price: 7200,
    mode: "buy",
    liked: true,
    specs: [
      { label: "Brand", value: "Sony" },
      { label: "Model", value: "WH-1000XM4" },
      { label: "Color", value: "Black" },
    ],
    sellerNotes:
      "Used for one semester, always kept in the original case. Noise cancelling works perfectly.",
  },
  {
    id: "physics-bundle",
    image: "/images/product-physics-textbooks.png",
    title: "Physics Bundle",
    category: "Books & Textbooks",
    sellerName: "Pitchaya K.",
    sellerAvatar: "/images/seller-avatar-2.png",
    sellerBadge: "top-seller",
    sellerRating: 4.7,
    sellerSalesCount: 112,
    condition: "FAIR",
    mode: "swap",
    specs: [
      { label: "Edition", value: "3rd Edition" },
      { label: "Set", value: "3 books" },
      { label: "Language", value: "English" },
    ],
    sellerNotes:
      "Some highlights inside but all pages intact. Looking to swap for a calculator or stationery.",
  },
  {
    id: "ipad-pro",
    image: "/images/product-ipad-pro.png",
    title: 'iPad Pro 11" M2 (2022)',
    category: "Electronics",
    sellerName: "Sarah J.",
    sellerAvatar: "/images/seller-avatar-3.png",
    sellerBadge: "swap-champion",
    sellerRating: 4.9,
    sellerSalesCount: 128,
    condition: "EXCELLENT",
    price: 15900,
    mode: "both",
    specs: [
      { label: "Brand", value: "Apple" },
      { label: "Model", value: 'iPad Pro 11"' },
      { label: "Storage", value: "256GB Wi-Fi" },
    ],
    sellerNotes:
      "Used for one semester for digital art. Perfect condition, always kept in a case with a screen protector. Looking to sell or swap.",
  },
  {
    id: "ku-uniform",
    image: "/images/product-uniform.png",
    title: "KU Engineering Uniform (Size L)",
    category: "Clothing & Fashion",
    sellerName: "Chaya R.",
    sellerAvatar: "/images/seller-avatar-4.png",
    sellerBadge: "none",
    sellerRating: 4.6,
    sellerSalesCount: 21,
    condition: "LIKE NEW",
    price: 350,
    mode: "both",
    specs: [
      { label: "Faculty", value: "Engineering" },
      { label: "Size", value: "L" },
      { label: "Condition", value: "Like New" },
    ],
    sellerNotes:
      "Worn only a few times, no stains or damage. Selling since I've graduated.",
  },
  {
    id: "engineering-mechanics-textbook",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/5/54/Books_in_a_stack_%28a_stack_of_books%29_-_Flickr_-_austinevan.jpg",
    title: "Engineering Mechanics: Statics (14th Edition)",
    category: "Books & Textbooks",
    sellerName: "Anucha W.",
    sellerAvatar: "/images/seller-avatar-1.png",
    sellerBadge: "none",
    sellerRating: 4.5,
    sellerSalesCount: 9,
    condition: "FAIR",
    mode: "swap",
    specs: [
      { label: "Subject", value: "Engineering Mechanics" },
      { label: "Edition", value: "14th Edition" },
      { label: "Language", value: "English" },
    ],
    sellerNotes:
      "Some pencil notes in the margins, no missing pages. Looking to swap for Dynamics or a scientific calculator.",
  },
  {
    id: "trek-mountain-bike",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/9/9b/Panasonic_Mountain_Bike.jpg",
    title: 'Mountain Bike 26"',
    category: "Bicycles & Vehicles",
    sellerName: "Kritsada P.",
    sellerAvatar: "/images/seller-avatar-2.png",
    sellerBadge: "verified",
    sellerRating: 4.8,
    sellerSalesCount: 15,
    condition: "EXCELLENT",
    price: 4500,
    mode: "buy",
    specs: [
      { label: "Wheel size", value: '26"' },
      { label: "Frame", value: "Aluminum" },
      { label: "Gears", value: "21-speed" },
    ],
    sellerNotes:
      "Regularly serviced, brakes and gears in great shape. Selling because I'm moving into the dorms.",
  },
  {
    id: "badminton-racket-set",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/0/0f/Badminton_Racket.jpg",
    title: "Badminton Racket + Shuttlecocks",
    category: "Sports & Exercise",
    sellerName: "Ploy S.",
    sellerAvatar: "/images/seller-avatar-3.png",
    sellerBadge: "none",
    sellerRating: 4.7,
    sellerSalesCount: 6,
    condition: "LIKE NEW",
    price: 650,
    mode: "both",
    specs: [
      { label: "Includes", value: "1 racket, 3 shuttlecocks" },
      { label: "Grip size", value: "G4" },
    ],
    sellerNotes:
      "Bought for a PE class, used only a handful of times. Comes with the original cover.",
  },
  {
    id: "led-desk-lamp",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/c/c0/IKEA_A0401_desk_lamp.JPG",
    title: "LED Desk Lamp (Adjustable)",
    category: "Dorm Essentials",
    sellerName: "Nichakan T.",
    sellerAvatar: "/images/seller-avatar-4.png",
    sellerBadge: "top-seller",
    sellerRating: 4.9,
    sellerSalesCount: 34,
    condition: "LIKE NEW",
    price: 280,
    mode: "buy",
    specs: [
      { label: "Power", value: "USB-powered" },
      { label: "Brightness", value: "3 levels" },
    ],
    sellerNotes:
      "Used for one semester in the dorm, works perfectly. Selling as I upgraded to a bigger lamp.",
  },
];

export const PRODUCTS: Product[] = BASE_PRODUCTS;

export function getProduct(id: string) {
  return PRODUCTS.find((product) => product.id === id);
}
