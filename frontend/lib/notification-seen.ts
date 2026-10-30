import type { Notification } from "@/lib/api/notifications";

/**
 * The red dot on the bell, and the pop-up for a giveaway outcome.
 *
 * The API has no read state for notifications (every persisted row says
 * `read: false`, and a deal's or ticket's notification is derived from its
 * current status), so "new" is decided here, per account and per browser, the
 * way the History dot is (lib/deal-badge.ts): opening the Notifications list
 * stores what it showed in a cookie; anything not stored is new.
 *
 * A notification's key is its id plus a short hash of its title and date. A
 * deal that moves to another step, or a ticket that changes status, gets a new
 * title or date and so a new key: it is new again, which is what the dot is for.
 */

/** What the shell needs of a notification, small enough to poll. */
export interface FeedItem {
  key: string;
  kind: Notification["kind"];
  title: string;
  body: string;
  href: string;
  /** Wants the viewer's eyes: unread, or an outcome that gets a pop-up. */
  attention: boolean;
  event?: Notification["event"];
  subject?: string;
}

/** One cookie per account, so two accounts on one browser keep their own. */
export function notificationsSeenCookie(userId: number): string {
  return `ku_notifications_seen_${userId}`;
}

/**
 * The rows the viewer has opened in the list, one cookie per account. Separate
 * from the "seen" cookie above: that one turns the bell's dot off the moment the
 * list is opened, this one dims a single row once it has been clicked.
 */
export function notificationsReadCookie(userId: number): string {
  return `ku_notifications_read_${userId}`;
}

/** Fired in this tab after the cookie is written, for the shell to re-read it. */
export const NOTIFICATIONS_SEEN_EVENT = "ku-marketplace:notifications-seen";

const SEEN_MAX_AGE = 60 * 60 * 24 * 365;
/** The cookie keeps the newest keys only; a cookie is about 4 KB. */
const MAX_KEYS = 120;

/** djb2, in base 36: short, stable, and not a secret. */
function hash36(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function feedKey(
  n: Pick<Notification, "notification_id" | "title" | "created_at">,
): string {
  return `${n.notification_id}:${hash36(`${n.title}|${n.created_at}`)}`;
}

export function toFeed(notifications: readonly Notification[]): FeedItem[] {
  return notifications.map((n) => ({
    key: feedKey(n),
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: n.href,
    attention: !n.read || n.event !== undefined,
    event: n.event,
    subject: n.subject,
  }));
}

/** Keys of everything that wants attention right now. */
export function attentionKeys(items: readonly FeedItem[]): string[] {
  return items.filter((item) => item.attention).map((item) => item.key);
}

export function serializeSeen(keys: readonly string[]): string {
  return encodeURIComponent(keys.slice(-MAX_KEYS).join(","));
}

/** The cookie value as keys; anything malformed reads as "nothing seen". */
export function parseSeen(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    return [];
  }
  return text.split(",").filter((key) => /^\d+:[a-z0-9]+$/.test(key));
}

/** The stored keys that still want attention; the rest are forgotten. */
export function pruneSeen(
  seen: readonly string[],
  current: readonly string[],
): string[] {
  const live = new Set(current);
  return seen.filter((key) => live.has(key));
}

/** How many items want attention and have not been seen. */
export function unseenCount(
  items: readonly FeedItem[],
  seen: readonly string[],
): number {
  const known = new Set(seen);
  return items.filter((item) => item.attention && !known.has(item.key)).length;
}

/**
 * Outcomes to announce with a pop-up: a giveaway event not seen on the list and
 * not announced before in this browser. Other kinds never pop up.
 */
export function popupCandidates(
  items: readonly FeedItem[],
  seen: readonly string[],
  announced: readonly string[],
): FeedItem[] {
  const known = new Set([...seen, ...announced]);
  return items.filter((item) => item.event !== undefined && !known.has(item.key));
}

/** Browser only: store `keys` as seen and tell this tab's shell. */
export function writeSeen(cookie: string, keys: readonly string[]) {
  document.cookie = `${cookie}=${serializeSeen(keys)}; path=/; max-age=${SEEN_MAX_AGE}; samesite=lax`;
  window.dispatchEvent(new Event(NOTIFICATIONS_SEEN_EVENT));
}

/** Browser only: the raw cookie value, "" when absent. */
export function readSeen(cookie: string): string {
  const prefix = `${cookie}=`;
  return (
    document.cookie
      .split("; ")
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) ?? ""
  );
}
