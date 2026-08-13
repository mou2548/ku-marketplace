/**
 * Which optional Item columns belong to which category.
 *
 * `DatabaseSchema.pdf` §2.2 does not model this as a relation — the four
 * optional columns simply name their category in the description text:
 *
 *   course_name      ชื่อรายวิชา (หมวดหนังสือ/ชีทสรุป)
 *   brand_model      ยี่ห้อและรุ่น (หมวดไอที/เครื่องใช้ไฟฟ้า)
 *   warranty_expiry  วันหมดประกัน
 *   size             ขนาด (หมวดเสื้อผ้า/เครื่องแต่งกาย)
 *
 * So the mapping lives here, once, rather than as a chain of string
 * comparisons inside a form. It had been written as `category === "books"`
 * against a picker that emits `"Books"`, which meant no category ever revealed
 * its extra fields and `warranty_expiry` could be displayed but never entered.
 *
 * The category itself stays an open string (see `ItemCategory` in
 * `lib/api/types.ts`): the schema says "1 of 10 categories" without listing
 * them, `GET /items/categories` returns the real list at runtime, and the seed
 * stores readable English names. Anything not matched here simply gets no
 * extra fields, which is the correct behaviour for an unknown category.
 */

export type ItemExtraField =
  | "course_name"
  | "brand_model"
  | "warranty_expiry"
  | "size";

/**
 * The picker's suggestions. Ten, matching the schema's count, using the
 * readable names `init.sql` stores rather than the PDF's slugs.
 */
export const CATEGORY_OPTIONS = [
  "Books",
  "Clothing",
  "Electronics",
  "Home & Living",
  "Bags",
  "Vehicles",
  "Sports",
  "Stationery",
  "Tickets",
  "Other",
] as const;

const EXTRA_FIELDS: Record<string, readonly ItemExtraField[]> = {
  // หมวดหนังสือ/ชีทสรุป — persona P1 searches by course code, not title.
  Books: ["course_name"],
  Stationery: ["course_name"],
  // หมวดไอที/เครื่องใช้ไฟฟ้า — model and remaining warranty are what a buyer
  // asks for first, and both are worth checking at the meetup.
  Electronics: ["brand_model", "warranty_expiry"],
  "Home & Living": ["brand_model", "warranty_expiry"],
  Vehicles: ["brand_model", "warranty_expiry"],
  Sports: ["brand_model", "size"],
  // หมวดเสื้อผ้า/เครื่องแต่งกาย
  Clothing: ["size"],
  Bags: ["size"],
  Tickets: [],
  Other: [],
};

const NONE: readonly ItemExtraField[] = [];

/** Case-insensitive so the PDF's slugs (`books`) match the seed's names. */
export function extraFieldsFor(
  category: string | null | undefined,
): readonly ItemExtraField[] {
  if (!category) return NONE;
  const key = Object.keys(EXTRA_FIELDS).find(
    (c) => c.toLowerCase() === category.toLowerCase(),
  );
  return key ? EXTRA_FIELDS[key] : NONE;
}

export function hasExtraField(
  category: string | null | undefined,
  field: ItemExtraField,
): boolean {
  return extraFieldsFor(category).includes(field);
}
