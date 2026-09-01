import type { NextConfig } from "next";

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
  output: "standalone",
  images: {
    remotePatterns: [
      // Fixtures (lib/api/fixtures.ts, mock data) use picsum.photos.
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // The real seed in init.sql stores every photo on this placeholder
      // host instead — it does not resolve to a real image, so pictures
      // sourced from real seed data render broken, but at least the page
      // itself no longer 500s (next/image throws on an unlisted hostname).
      { protocol: "https", hostname: "r2.ku-market.com" },
      // Real uploads (chat images, via the shared POST /uploads/image
      // endpoint — see lib/actions/chat.ts's uploadChatImage) land here.
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

export default nextConfig;
