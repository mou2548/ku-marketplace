"use client";

// Persists which real transaction the /chat dev tool is connected to, so it
// survives navigating away (e.g. to /chat/[tradeId]/target) and back — a
// plain useState in the page would otherwise reset on remount.

const STORAGE_KEY = "ku-live-transaction";

export interface LiveTransactionState {
  transactionId: number;
  meetupLocation?: string;
}

export function getLiveTransaction(): LiveTransactionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LiveTransactionState) : null;
  } catch {
    return null;
  }
}

export function setLiveTransaction(state: LiveTransactionState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function setLiveMeetupLocation(transactionId: number, meetupLocation: string) {
  setLiveTransaction({ transactionId, meetupLocation });
}
