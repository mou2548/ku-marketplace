import { apiFetch } from "./client";
import { authHeader } from "./session";
import { getCopy } from "@/lib/copy";
import {
  getGiveaways,
  getRecipients,
  ticketFromRoster,
  type RecipientRow,
} from "@/lib/api/giveaways";
import { getMyOffers } from "@/lib/api/offers";
import { getCurrentUserId } from "@/lib/api/session";
import { getTransactions } from "@/lib/api/transactions";
import { formatPrice } from "@/lib/format-price";
import { grantTitle, registrationBody, registrationTitle } from "@/lib/registration-notice";
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
  /**
   * A giveaway outcome worth a pop-up when it first arrives: the viewer was
   * selected, was not, or let the pickup window pass. Everything else is only
   * a dot on the bell.
   */
  event?: "giveaway-selected" | "giveaway-not-selected" | "giveaway-expired";
  /** What the event is about (the giveaway's item), for the pop-up. */
  subject?: string;
}

/** Stable-ish unique id per (kind, source row) so the list keys don't collide. */
const OFFSET: Record<string, number> = {
  deal: 1_000_000,
  offer: 2_000_000,
  giveaway: 5_000_000,
  // The owner's "people registered" row, one per giveaway.
  giveawayOwner: 6_000_000,
  // The owner's "people got a place" row, one per giveaway.
  giveawayGranted: 7_000_000,
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

  // One roster per giveaway, read once: it holds the viewer's own ticket and,
  // for a giveaway they own, who has registered.
  const rosters = await Promise.all(
    giveaways.map(async (giveaway) => ({
      giveaway,
      rows: await getRecipients(giveaway.giveaway_id).catch((): RecipientRow[] => []),
    })),
  );
  const tickets = rosters
    .map(({ giveaway, rows }) => ticketFromRoster(rows, giveaway, viewerId))
    .filter((t): t is NonNullable<typeof t> => t != null);

  // The owner hears about registrations, which no ticket of theirs carries.
  // The roster has no registration time, so the row takes the giveaway's own
  // date: it stays put between reads, which the "new" key depends on. It goes
  // when the allocation has run and no one is left merely registered.
  for (const { giveaway, rows } of rosters) {
    if (giveaway.giver_id !== viewerId) continue;
    const registered = rows.filter((row) => row.ticket_status === "Registered");
    if (!registered.length) continue;
    out.push({
      notification_id: nid("giveawayOwner", giveaway.giveaway_id),
      kind: "giveaway",
      title: registrationTitle(registered.length, giveaway.item_name ?? "your giveaway"),
      body: registrationBody(registered.map((row) => row.user.name)),
      href: `/giveaway/${giveaway.giveaway_id}/manage`,
      created_at: giveaway.created_at,
      read: false,
    });
  }

  // And about places given: in a first-come giveaway the system gives them out
  // by itself, so the owner would otherwise never know they were taken. Counted
  // over everyone who was ever given one (waiting, collected, forfeited or
  // expired) so the title only changes when a new place is given; the row is
  // shown while someone is still waiting to collect.
  const GRANTED = new Set(["Waiting", "Received", "Forfeited", "Expired"]);
  for (const { giveaway, rows } of rosters) {
    if (giveaway.giver_id !== viewerId) continue;
    const granted = rows.filter((row) => GRANTED.has(row.ticket_status));
    if (!rows.some((row) => row.ticket_status === "Waiting")) continue;
    out.push({
      notification_id: nid("giveawayGranted", giveaway.giveaway_id),
      kind: "giveaway",
      title: grantTitle(granted.length, giveaway.item_name ?? "your giveaway"),
      body: registrationBody(granted.map((row) => row.user.name)),
      href: `/giveaway/${giveaway.giveaway_id}/manage`,
      created_at: giveaway.created_at,
      read: false,
    });
  }

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
      event:
        tk.status === "Waiting"
          ? "giveaway-selected"
          : tk.status === "Not_Selected"
            ? "giveaway-not-selected"
            : tk.status === "Expired"
              ? "giveaway-expired"
              : undefined,
      subject: tk.giveaway.item_name ?? undefined,
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
