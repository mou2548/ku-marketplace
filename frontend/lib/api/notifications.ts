import { apiFetch } from "./client";
import { authHeader } from "./session";
import { getCopy } from "@/lib/copy";
import { getGiveaways, getMyTicket } from "@/lib/api/giveaways";
import { getMyOffers } from "@/lib/api/offers";
import { getCurrentUserId } from "@/lib/api/session";
import { getTransactions } from "@/lib/api/transactions";
import { formatPrice } from "@/lib/format-price";
import { TICKET_STATUS, transactionStatusPresentation } from "@/lib/status";

/**
 * Persisted events (appointments, deadlines, moderation) are combined with
 * activity derived from the viewer's deals, offers and giveaway tickets.
 * Derived activity uses terminal resource state as a read heuristic.
 *
 * Moderation is persisted only, never derived (ruling of 2026-10-05): the
 * backend writes it for the people who should hear it, which is admins about
 * new cases and the penalised user about the verdict and the appeal result.
 * The reporter hears nothing about the outcome.
 */
export interface Notification {
  notification_id: number;
  kind: "deal" | "offer" | "giveaway" | "moderation";
  title: string;
  body: string;
  href: string;
  created_at: string;
  read: boolean;
}

/** Stable-ish unique id per (kind, source row) so the list keys don't collide. */
const OFFSET: Record<string, number> = {
  deal: 1_000_000,
  offer: 2_000_000,
  giveaway: 5_000_000,
};
const nid = (bucket: keyof typeof OFFSET | string, id: number) =>
  (OFFSET[bucket] ?? 9_000_000) + id;

const baht = formatPrice;

export async function getNotifications(): Promise<Notification[]> {
  /* Server-side counterpart of useStatusText: this file assembles notification
     titles out of the same status vocabulary the screens render, so it has to
     translate them too, or a Thai reader gets Thai everywhere except their
     notification list. */
  const tr = await getCopy("status");
  const viewerId = await getCurrentUserId();
  if (!viewerId) return [];

  const [offers, transactions, giveaways] = await Promise.all([
    getMyOffers().catch(() => []),
    getTransactions().catch(() => []),
    getGiveaways().catch(() => []),
  ]);

  const out: Notification[] = await apiFetch<Notification[]>("/notifications", { headers: await authHeader() }).catch(() => []);

  for (const o of offers) {
    const iAmOwner = o.post.seller.user_id === viewerId;
    if (iAmOwner && o.status === "Pending") {
      const extra = o.additional_money > 0 ? ` plus ${baht(o.additional_money)}` : "";
      out.push({
        notification_id: nid("offer", o.offer_id),
        kind: "offer",
        title: `New trade offer on ${o.post.item.name}`,
        body: `${o.proposer.name} offered ${
          o.items.map((i) => i.name).join(", ") || "an item"
        }${extra}.`,
        href: `/offers/${o.offer_id}`,
        created_at: o.created_at,
        read: false,
      });
    } else if (!iAmOwner && (o.status === "Accepted" || o.status === "Rejected")) {
      out.push({
        notification_id: nid("offer", o.offer_id),
        kind: "offer",
        title: `Your offer was ${o.status.toLowerCase()}`,
        body: `Your offer on ${o.post.item.name}.`,
        href: `/offers/${o.offer_id}`,
        created_at: o.created_at,
        read: true,
      });
    }
  }

  for (const t of transactions) {
    const pres = transactionStatusPresentation(t);
    const other = t.buyer_id === viewerId ? t.seller.name : t.buyer.name;
    out.push({
      notification_id: nid("deal", t.transaction_id),
      kind: "deal",
      title: `${pres ? tr(pres.labelKey) : t.status}: ${t.post?.item?.name ?? "your deal"}`,
      body: [other, pres?.hintKey ? tr(pres.hintKey) : undefined]
        .filter(Boolean)
        .join(" — "),
      href: `/history/${t.transaction_id}`,
      created_at: t.created_at,
      read: t.status === "Completed" || t.status === "Cancelled",
    });
  }

  const tickets = (
    await Promise.all(
      giveaways.map((g) =>
        getMyTicket(g.giveaway_id, g, viewerId).catch(() => undefined),
      ),
    )
  ).filter((t): t is NonNullable<typeof t> => t != null);

  for (const tk of tickets) {
    const waiting = tk.status === "Waiting";
    const presentation = TICKET_STATUS[tk.status];
    const bodyByStatus = {
      Registered: `Your registration is recorded for ${tk.giveaway.quantity} available place${tk.giveaway.quantity === 1 ? "" : "s"}.`,
      Waiting: `Your place is confirmed. Collect at ${tk.giveaway.pickup_location}.`,
      Received: "The handover was completed.",
      Not_Selected: "The allocation finished and you were not selected.",
      Forfeited: "You voluntarily gave up this collection before the deadline.",
      Expired: "The pickup deadline passed before collection.",
    };
    out.push({
      notification_id: nid("giveaway", tk.ticket_id),
      kind: "giveaway",
      title: `${tr(presentation.labelKey)}: ${tk.giveaway.item_name}`,
      body: bodyByStatus[tk.status],
      href: `/giveaway/${tk.giveaway_id}/ticket/${tk.ticket_id}`,
      created_at: tk.updated_at,
      read: !waiting,
    });
  }

  return out.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/**
 * The viewer's persisted moderation notifications only, for the admin
 * dashboard's Activity list. Same rows as the bell, without the derived deal
 * and giveaway activity the bell also assembles.
 */
export async function getModerationActivity(limit = 6): Promise<Notification[]> {
  const rows = await apiFetch<Notification[]>("/notifications", {
    headers: await authHeader(),
  });
  return rows.filter((row) => row.kind === "moderation").slice(0, limit);
}
