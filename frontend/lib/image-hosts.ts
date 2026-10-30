/**
 * The hosts images may come from. `next.config.ts` hands this to the image
 * optimizer, and `lib/image-ratio.ts` refuses to read any other host, so the
 * server never fetches an arbitrary URL found in a listing.
 */
export const IMAGE_HOSTS = [
  // Legacy local volumes can still contain the original object-storage
  // URLs. Older init.sql revisions used deterministic Picsum seeds; the
  // current one uses curated Unsplash photos that actually match each item.
  "r2.ku-market.com",
  "picsum.photos",
  "images.unsplash.com",
  // Seeded payment slips and chat attachments use this host.
  "placehold.co",
  // Real uploads land here: POST /uploads/image -> Cloudinary
  // (item photos, giveaway photos, chat images).
  "res.cloudinary.com",
] as const;

export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (IMAGE_HOSTS as readonly string[]).includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}
