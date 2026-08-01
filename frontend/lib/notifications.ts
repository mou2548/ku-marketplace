"use client";

// Mock, localStorage-backed notification bridge — no backend, so this is how
// an action on one page (e.g. registering for a giveaway) can show up as a
// navbar notification after navigating away. Real apps would push this via
// the API / a websocket instead.

const STORAGE_KEY = "ku-notifications";
const CHANGE_EVENT = "ku:notifications-changed";

export interface StoredNotification {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  read: boolean;
}

function readAll(): StoredNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredNotification[]) : [];
  } catch {
    return [];
  }
}

function writeAll(notifications: StoredNotification[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getStoredNotifications(): StoredNotification[] {
  return readAll();
}

export function getUnreadCount(): number {
  return readAll().filter((n) => !n.read).length;
}

export function addNotification(input: { title: string; subtitle: string }) {
  const notification: StoredNotification = {
    id: `notif-${Date.now()}`,
    title: input.title,
    subtitle: input.subtitle,
    time: "เมื่อสักครู่",
    read: false,
  };
  writeAll([notification, ...readAll()]);
}

export function markAllRead() {
  const all = readAll();
  if (all.every((n) => n.read)) return;
  writeAll(all.map((n) => ({ ...n, read: true })));
}

export function onNotificationsChanged(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
