import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Redirect map from docs/design/ia.md §6.
 *
 * The redesign collapses 57 flat routes into 36 grouped ones — most notably
 * the twelve sibling routes that made up a single transaction, which are now
 * one screen with inline action cards (IA decision D1). Every old URL keeps
 * working so nothing already shared or bookmarked breaks.
 *
 * Permanent, because these moves are structural and not coming back.
 */
const nextConfig: NextConfig = {
  // Dev server blocks cross-origin requests by default (Next 16). LAN
  // testing from a phone or another machine hits this — the page loads but
  // hydration never completes, so nothing is clickable.
  allowedDevOrigins: ["10.31.223.158"],
  output: "standalone",
  images: {
    remotePatterns: [
      // Legacy local volumes can still contain the original object-storage
      // URLs, while the current init.sql uses deterministic Picsum seeds.
      { protocol: "https", hostname: "r2.ku-market.com" },
      { protocol: "https", hostname: "picsum.photos" },
      // Seeded payment slips and chat attachments use this host.
      { protocol: "https", hostname: "placehold.co" },
      // Real uploads land here: POST /uploads/image -> Cloudinary
      // (item photos, giveaway photos, chat images).
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async redirects() {
    return [
      // --- Auth ---
      // Registering is a tab on /login now, not a route: two URLs rendering the
      // same shell meant a full navigation to move between two adjacent forms.
      { source: "/register", destination: "/login", permanent: true },
      { source: "/auth/register", destination: "/login", permanent: true },
      { source: "/auth/otp/verify", destination: "/verify", permanent: true },
      { source: "/auth/forgot", destination: "/forgot", permanent: true },
      { source: "/auth/reset", destination: "/reset", permanent: true },

      // --- Market ---
      // The feed lives at the root now; /market was a duplicate of home.
      { source: "/marketplace", destination: "/", permanent: true },
      { source: "/market", destination: "/", permanent: true },
      {
        source: "/marketplace/:productId",
        destination: "/market/:productId",
        permanent: true,
      },

      // --- Inventory ---
      { source: "/inventory/add", destination: "/inventory/new", permanent: true },
      {
        source: "/inventory/:itemId/post",
        destination: "/inventory/:itemId/list",
        permanent: true,
      },
      {
        source: "/inventory/:itemId/post/edit",
        destination: "/inventory/:itemId/list",
        permanent: true,
      },

      // --- History: twelve routes collapse into one screen (D1) ---
      // The screen is called History now, and so is its URL. /deals was the
      // name for one afternoon; anything already sent keeps working.
      { source: "/deals", destination: "/history", permanent: true },
      { source: "/deals/:path*", destination: "/history/:path*", permanent: true },
      // /chat is a real screen again: the unified inbox. The old per-trade
      // chat URL points at the deal, which now redirects into its room.
      { source: "/chat/:tradeId/target", destination: "/history/:tradeId", permanent: true },
      { source: "/trade/qr", destination: "/history", permanent: true },
      { source: "/trade/:tradeId", destination: "/history/:tradeId", permanent: true },
      { source: "/trade/:tradeId/payment", destination: "/history/:tradeId", permanent: true },
      {
        source: "/trade/:tradeId/payment/review",
        destination: "/history/:tradeId",
        permanent: true,
      },
      { source: "/trade/:tradeId/shipping", destination: "/history/:tradeId", permanent: true },
      {
        source: "/trade/:tradeId/shipping/confirm",
        destination: "/history/:tradeId",
        permanent: true,
      },
      { source: "/trade/:tradeId/cancel", destination: "/history/:tradeId", permanent: true },
      {
        source: "/trade/:tradeId/cancel/request",
        destination: "/history/:tradeId",
        permanent: true,
      },
      {
        source: "/trade/:tradeId/cancel/respond",
        destination: "/history/:tradeId",
        permanent: true,
      },
      { source: "/trade/:tradeId/success", destination: "/history/:tradeId", permanent: true },
      { source: "/trade/:tradeId/qr", destination: "/history/:tradeId/qr", permanent: true },
      { source: "/trade/:tradeId/scan", destination: "/history/:tradeId/scan", permanent: true },

      // --- Moderation ---
      { source: "/disputes", destination: "/history", permanent: true },
      { source: "/appeals/new", destination: "/account/appeals/new", permanent: true },

      // --- Giveaway ---
      {
        source: "/giveaway/manager",
        destination: "/giveaway",
        permanent: true,
      },

      // --- Account ---
      { source: "/account/premium", destination: "/account/membership", permanent: true },
    ];
  },
};

/**
 * Bilingual, with the locale in a cookie rather than the URL — there is no
 * `[locale]` segment, so the redirect map above keeps working unchanged.
 * See lib/i18n/locale.ts.
 */
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
