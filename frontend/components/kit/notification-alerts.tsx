"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, X } from "lucide-react";

import { fetchNotificationFeed } from "@/lib/actions/notifications";
import { getCopy } from "@/lib/copy";
import {
  NOTIFICATIONS_SEEN_EVENT,
  attentionKeys,
  parseSeen,
  popupCandidates,
  pruneSeen,
  readSeen,
  unseenCount,
  writeSeen,
  type FeedItem,
} from "@/lib/notification-seen";
import type { Tone } from "@/lib/status";
import { usePolling } from "@/lib/use-polling";
import { cn } from "@/lib/utils";

import { NOTICE_TILE } from "./tone";

/**
 * What the shell shows about new notifications: a dot on the bell for any of
 * them, and a pop-up in the corner for a giveaway outcome (selected, not
 * selected, ticket expired). Everything else is only the dot.
 *
 * No realtime transport exists, so the shell asks every 30 seconds while the
 * tab is visible (`usePolling`) and once on load. What counts as new is kept in
 * a cookie by `lib/notification-seen`.
 */

const POLL_MS = 30_000;
const POPUP_MS = 12_000;
const MAX_POPUPS = 3;
/** Keys already announced in this browser, so a reload does not announce again. */
const ANNOUNCED_SUFFIX = "_announced";
const ANNOUNCED_MAX = 200;

function subscribeSeen(onChange: () => void) {
  const onVisible = () => document.visibilityState === "visible" && onChange();
  window.addEventListener(NOTIFICATIONS_SEEN_EVENT, onChange);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener(NOTIFICATIONS_SEEN_EVENT, onChange);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/** `null` when nothing was stored yet, or storage is unavailable. */
function readAnnounced(storeKey: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(storeKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : null;
  } catch {
    return null;
  }
}

function writeAnnounced(storeKey: string, keys: readonly string[]) {
  try {
    window.localStorage.setItem(storeKey, JSON.stringify(keys.slice(-ANNOUNCED_MAX)));
  } catch {
    // Private mode or a full disk: the worst case is one repeated pop-up.
  }
}

export function useNotificationAlerts(cookie: string | undefined) {
  const pathname = usePathname() ?? "";
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [popups, setPopups] = useState<FeedItem[]>([]);
  const seenRaw = useSyncExternalStore(
    subscribeSeen,
    () => (cookie ? readSeen(cookie) : ""),
    () => "",
  );

  const load = useCallback(async () => {
    if (!cookie) return;
    const result = await fetchNotificationFeed().catch(() => null);
    if (!result || !result.ok) return;
    const feed = result.data;
    setItems(feed);

    const seenNow = parseSeen(readSeen(cookie));
    const onList = window.location.pathname === "/notifications";

    // Forget keys that no longer want attention, so a deal that leaves and
    // comes back counts as new. Not while the list is open: it writes the
    // cookie itself and this would race it.
    if (!onList) {
      const pruned = pruneSeen(seenNow, attentionKeys(feed));
      if (pruned.length !== seenNow.length) writeSeen(cookie, pruned);
    }

    const storeKey = `${cookie}${ANNOUNCED_SUFFIX}`;
    const announced = readAnnounced(storeKey);
    if (announced === null) {
      // First run in this browser: everything that exists already happened.
      // Note it quietly, so only what arrives from now on is announced.
      writeAnnounced(
        storeKey,
        feed.filter((item) => item.event !== undefined).map((item) => item.key),
      );
      return;
    }
    const fresh = popupCandidates(feed, seenNow, announced);
    if (!fresh.length) return;
    writeAnnounced(storeKey, [...announced, ...fresh.map((item) => item.key)]);
    // On the list the outcome is in front of them already.
    if (!onList) setPopups((list) => [...list, ...fresh].slice(-MAX_POPUPS));
  }, [cookie]);

  // The first read, once the page is up. Deferred a tick so the state it sets
  // is never set from inside the effect body itself.
  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);
  usePolling(() => void load(), POLL_MS);

  const hasUnread =
    pathname !== "/notifications" &&
    items !== null &&
    unseenCount(items, parseSeen(seenRaw)) > 0;

  const dismiss = useCallback((key: string) => {
    setPopups((list) => list.filter((item) => item.key !== key));
  }, []);

  /** Opening the pop-up's link counts as having seen that one. */
  const open = useCallback(
    (item: FeedItem) => {
      if (cookie) writeSeen(cookie, [...parseSeen(readSeen(cookie)), item.key]);
      dismiss(item.key);
    },
    [cookie, dismiss],
  );

  return { hasUnread, popups, dismiss, open };
}

const EVENT_TONE: Record<NonNullable<FeedItem["event"]>, Tone> = {
  "giveaway-selected": "success",
  "giveaway-not-selected": "neutral",
  "giveaway-expired": "warning",
};

const EVENT_HEADING = {
  "giveaway-selected": "notifications.popupSelected",
  "giveaway-not-selected": "notifications.popupNotSelected",
  "giveaway-expired": "notifications.popupExpired",
} as const;

function PopupCard({
  item,
  onDismiss,
  onOpen,
}: {
  item: FeedItem;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  const t = getCopy();
  const event = item.event ?? "giveaway-selected";

  // The callback changes identity on every render of the shell; the timer must
  // not restart each time, so it reads the latest one through a ref.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    const id = setTimeout(() => dismissRef.current(), POPUP_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto relative flex w-full items-start gap-3 rounded-control border border-line bg-surface p-3.5 pr-11",
        "shadow-floating anim-rise-in [--ku-rise:0.5rem]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-[8px]",
          NOTICE_TILE[EVENT_TONE[event]],
        )}
      >
        <Gift className="size-5" />
      </span>
      <Link href={item.href} onClick={onOpen} className="min-w-0 flex-1">
        <p className="text-body font-semibold">{t(EVENT_HEADING[event])}</p>
        {item.subject ? (
          <p className="truncate text-body-sm font-medium text-ink-secondary">{item.subject}</p>
        ) : null}
        <p className="mt-0.5 text-body-sm text-ink-muted">{item.body}</p>
        <span className="mt-1.5 inline-block text-body-sm font-semibold text-ink-brand">
          {t("notifications.popupView")}
        </span>
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("notifications.popupClose")}
        className="touch-target absolute top-1.5 right-1.5 grid size-9 place-items-center rounded-pill text-ink-muted transition-colors hover:bg-gray-100"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}

export function NotificationPopups({
  popups,
  onDismiss,
  onOpen,
}: {
  popups: FeedItem[];
  onDismiss: (key: string) => void;
  onOpen: (item: FeedItem) => void;
}) {
  const t = getCopy();
  const pathname = usePathname() ?? "";
  if (!popups.length) return null;
  return (
    <div
      role="region"
      aria-label={t("notifications.popupRegion")}
      className={cn(
        "pointer-events-none fixed right-4 z-[120] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2",
        // A chat room keeps its composer on the bottom edge, so a corner
        // pop-up goes to the top there. Elsewhere it sits above the phone's
        // tab bar and in the bottom corner on a wide screen.
        pathname.startsWith("/chat/") ? "top-20" : "bottom-20 md:right-6 md:bottom-6",
      )}
    >
      {popups.map((item) => (
        <PopupCard
          key={item.key}
          item={item}
          onDismiss={() => onDismiss(item.key)}
          onOpen={() => onOpen(item)}
        />
      ))}
    </div>
  );
}
