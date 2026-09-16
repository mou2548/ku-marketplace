"use client";

/**
 * A per-room "just interacted" timestamp, written the moment the viewer sends a
 * message and read by the inbox to float that room to the top instantly.
 *
 * The inbox refreshes on a 10s poll (no realtime transport exists, see
 * `lib/use-polling.ts`), so without this a chat you just replied in would not
 * rise until the next poll landed. This is the same browser-local signalling
 * the unread markers use in `components/kit/room-list.tsx`: a `localStorage`
 * entry plus a `window` event, so the open room and the list beside it — two
 * sibling components — agree the instant a message goes out, and it survives
 * across tabs via the native `storage` event. The poll then confirms it with
 * the real `lastMessageAt` and the two converge.
 */

const ACTIVITY_KEY = "ku-marketplace:chat-activity";
const ACTIVITY_EVENT = "ku-marketplace:chat-activity-change";

export function parseActivity(value: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

export function subscribeChatActivity(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACTIVITY_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(ACTIVITY_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ACTIVITY_EVENT, onStoreChange);
  };
}

export function getChatActivitySnapshot() {
  return localStorage.getItem(ACTIVITY_KEY) ?? "{}";
}

export function getServerChatActivitySnapshot() {
  return "{}";
}

/** Record that the viewer just interacted with a room, floating it to the top
 * of the inbox until the next poll confirms with the real last message. */
export function markRoomActive(roomId: number) {
  try {
    const activity = parseActivity(getChatActivitySnapshot());
    activity[String(roomId)] = Date.now();
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
    window.dispatchEvent(new Event(ACTIVITY_EVENT));
  } catch {
    // Private mode or a full quota: the poll still bumps the room, just later.
  }
}
