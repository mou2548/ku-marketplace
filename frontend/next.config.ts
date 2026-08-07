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
      // The seed in init.sql stores every photo on picsum.photos.
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async redirects() {
    return [
      // --- Auth ---
      { source: "/auth/register", destination: "/register", permanent: true },
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

      // --- Deals: twelve routes collapse into one screen (D1) ---
      // /chat is a real screen again: the unified inbox. The old per-trade
      // chat URL points at the deal, which now redirects into its room.
      { source: "/chat/:tradeId/target", destination: "/deals/:tradeId", permanent: true },
      { source: "/history", destination: "/deals", permanent: true },
      { source: "/trade/qr", destination: "/deals", permanent: true },
      { source: "/trade/:tradeId", destination: "/deals/:tradeId", permanent: true },
      { source: "/trade/:tradeId/payment", destination: "/deals/:tradeId", permanent: true },
      {
        source: "/trade/:tradeId/payment/review",
        destination: "/deals/:tradeId",
        permanent: true,
      },
      { source: "/trade/:tradeId/shipping", destination: "/deals/:tradeId", permanent: true },
      {
        source: "/trade/:tradeId/shipping/confirm",
        destination: "/deals/:tradeId",
        permanent: true,
      },
      { source: "/trade/:tradeId/cancel", destination: "/deals/:tradeId", permanent: true },
      {
        source: "/trade/:tradeId/cancel/request",
        destination: "/deals/:tradeId",
        permanent: true,
      },
      {
        source: "/trade/:tradeId/cancel/respond",
        destination: "/deals/:tradeId",
        permanent: true,
      },
      { source: "/trade/:tradeId/success", destination: "/deals/:tradeId", permanent: true },
      { source: "/trade/:tradeId/qr", destination: "/deals/:tradeId/qr", permanent: true },
      { source: "/trade/:tradeId/scan", destination: "/deals/:tradeId/scan", permanent: true },

      // --- Moderation ---
      { source: "/disputes", destination: "/deals", permanent: true },
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
