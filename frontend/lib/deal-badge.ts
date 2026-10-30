/**
 * The History dot: on while a deal waits on the viewer, off once they have
 * opened History, back on when something new needs them (owner request
 * 2026-10-30).
 *
 * "Something" is a deal at a step: `<transaction id>:<prompt label>`. Opening
 * the History list stores the keys waiting at that moment in a cookie, and
 * every page drops stored keys that are no longer waiting. So a new deal that
 * needs the viewer, a deal moving to another step, or a deal that left the
 * list and came back (a rejected slip to upload again) is a key not stored,
 * and the dot comes back. A cookie rather than localStorage so the server
 * renders the right state on the first paint, with no flash.
 *
 * Per user and per browser, like the chat unread markers: the API has no
 * read state.
 */

/** One cookie per account, so two accounts on one browser keep their own. */
export function dealsSeenCookie(userId: number): string {
  return `ku_deals_seen_${userId}`;
}

/** A year; the stored keys are pruned on every page anyway. */
export const DEALS_SEEN_MAX_AGE = 60 * 60 * 24 * 365;

/** Fired in this tab after the cookie is written, for the nav to re-read it. */
export const DEALS_SEEN_EVENT = "ku-marketplace:deals-seen";

export function dealBadgeKeys(
  entries: ReadonlyArray<{ id: number; prompt: { labelKey: string } }>,
): string[] {
  return [...new Set(entries.map((entry) => `${entry.id}:${entry.prompt.labelKey}`))].sort();
}

/** Comma-joined: about a third of the size of URL-encoded JSON. */
export function serializeSeenKeys(keys: readonly string[]): string {
  return encodeURIComponent(keys.join(","));
}

/** The cookie value as keys; anything malformed reads as "nothing seen". */
export function parseSeenKeys(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    return [];
  }
  return text.split(",").filter((key) => /^\d+:[\w.-]+$/.test(key));
}

/** The stored keys that are still waiting; the rest are forgotten. */
export function pruneSeenKeys(seen: readonly string[], keys: readonly string[]): string[] {
  const current = new Set(keys);
  return seen.filter((key) => current.has(key));
}

/** How many of the current keys the viewer has not seen on History yet. */
export function unseenCount(keys: readonly string[], seen: readonly string[]): number {
  const known = new Set(seen);
  return keys.filter((key) => !known.has(key)).length;
}

/** Browser only: store `keys` as seen and tell this tab's nav. */
export function writeSeenKeys(cookie: string, keys: readonly string[]) {
  document.cookie = `${cookie}=${serializeSeenKeys(keys)}; path=/; max-age=${DEALS_SEEN_MAX_AGE}; samesite=lax`;
  window.dispatchEvent(new Event(DEALS_SEEN_EVENT));
}

/** Browser only: the raw cookie value, "" when absent. */
export function readSeenCookie(cookie: string): string {
  const prefix = `${cookie}=`;
  return (
    document.cookie
      .split("; ")
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) ?? ""
  );
}
