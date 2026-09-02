import { getGiveaways, getMyTicket } from "@/lib/api/giveaways";
import { getMyOffers } from "@/lib/api/offers";
import { getMyAppeals } from "@/lib/api/appeals";
import { getMyReports } from "@/lib/api/reports";
import { getCurrentUserId } from "@/lib/api/session";
import { getTransactions } from "@/lib/api/transactions";
import { APPEAL_STATUS, REPORT_STATUS, TRANSACTION_STATUS } from "@/lib/status";

/**
 * The notification log (E-series). There is no `/notifications` endpoint and
 * no notification table — same principle as `lib/inbox.ts`: everything is
 * derived on the fly from the resources the user already has access to
 * (`/transactions`, `/offers`, `/reports`, `/appeals`, giveaway tickets). No
 * persistence, so "read" is a heuristic: an item is read once the thing it is
 * about has reached a state that no longer needs the user.
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
  "mod-report": 3_000_000,
  "mod-appeal": 4_000_000,
  giveaway: 5_000_000,
};
const nid = (bucket: keyof typeof OFFSET | string, id: number) =>
  (OFFSET[bucket] ?? 9_000_000) + id;

const baht = (n: number) => `฿${n.toLocaleString("en-GB")}`;

export async function getNotifications(): Promise<Notification[]> {
  const viewerId = await getCurrentUserId();
  if (!viewerId) return [];

  const [offers, transactions, reports, appeals, giveaways] = await Promise.all([
    getMyOffers().catch(() => []),
    getTransactions().catch(() => []),
    getMyReports().catch(() => []),
    getMyAppeals().catch(() => []),
    getGiveaways().catch(() => []),
  ]);

  const out: Notification[] = [];

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
    const pres = TRANSACTION_STATUS[t.status];
    const other = t.buyer_id === viewerId ? t.seller.name : t.buyer.name;
    out.push({
      notification_id: nid("deal", t.transaction_id),
      kind: "deal",
      title: `${pres?.label ?? t.status}: ${t.post?.item?.name ?? "your deal"}`,
      body: [other, pres?.hint].filter(Boolean).join(" — "),
      href: `/history/${t.transaction_id}`,
      created_at: t.created_at,
      read: t.status === "Completed" || t.status === "Cancelled",
    });
  }

  for (const r of reports) {
    const pres = REPORT_STATUS[r.status];
    out.push({
      notification_id: nid("mod-report", r.report_id),
      kind: "moderation",
      title: `Report #${r.report_id}: ${pres?.label ?? r.status}`,
      body:
        r.resolution_note ??
        `Your report about ${r.report_type.toLowerCase()} #${r.target_id}.`,
      href: "/history",
      created_at: r.handled_at ?? r.created_at,
      read:
        r.status === "Report_Dismissed" || r.status === "Violation_Confirmed",
    });
  }

  for (const a of appeals) {
    const pres = APPEAL_STATUS[a.status];
    out.push({
      notification_id: nid("mod-appeal", a.appeal_id),
      kind: "moderation",
      title: `Appeal on report #${a.report_id}: ${pres?.label ?? a.status}`,
      body: a.resolution_note ?? "Your appeal is being handled.",
      href: "/account/appeals",
      created_at: a.handled_at ?? a.created_at,
      read: a.status === "Approved" || a.status === "Rejected",
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
    out.push({
      notification_id: nid("giveaway", tk.ticket_id),
      kind: "giveaway",
      title: waiting
        ? `You have a giveaway ticket: ${tk.giveaway.item_name}`
        : `Ticket ${tk.status.toLowerCase()}: ${tk.giveaway.item_name}`,
      body: tk.giveaway.pickup_location
        ? `Pickup at ${tk.giveaway.pickup_location}.`
        : "Open the ticket for pickup details.",
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
