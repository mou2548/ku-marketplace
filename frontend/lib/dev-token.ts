"use client";

// Mock, localStorage-backed access-token bridge — there's no login flow wired
// up yet, so this lets a manually-obtained JWT (e.g. from POST /auth/login)
// be pasted in and reused across requests to guarded endpoints like
// /transactions/:id/message. Real apps would get this from a real login flow.

const STORAGE_KEY = "ku-dev-access-token";
const CHANGE_EVENT = "ku:dev-token-changed";

export function getDevToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setDevToken(token: string) {
  if (typeof window === "undefined") return;
  if (token.trim()) {
    window.localStorage.setItem(STORAGE_KEY, token.trim());
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onDevTokenChanged(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Reads the userId claim out of the JWT payload — display only, not verified. */
export function decodeJwtUserId(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(normalized)) as { userId?: unknown };
    return typeof json.userId === "number" ? json.userId : null;
  } catch {
    return null;
  }
}
