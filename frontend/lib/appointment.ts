import type { AppointmentCardData } from "@/lib/api/types";

/**
 * Pure derivation, no I/O — same shape as `lib/rooms.ts`. Kept out of
 * `lib/api/chat.ts` on purpose: that module imports `lib/api/session.ts`
 * (`next/headers`, server-only), and this needs to be callable from
 * `room-screen.tsx`, a Client Component.
 *
 * §6.3 — `Appointment_Card` has no stored "pinned" flag, so the current card
 * is derived from history, and it must match the backend's `assertHandoverReady`
 * exactly or the pin and the QR button disagree (which is the "Another time"
 * loop bug: declining a proposed change fell back to the last Confirmed card,
 * the pin re-showed it, but the backend saw the newer Rejected row and refused
 * the handover).
 *
 * The rule, identical on both sides:
 *   current appointment = the newest card by (created_at, appointment_id) that
 *   has NOT been retired (`deleted_at` null). A newer proposal retires the card
 *   it replaces, and a rejected card retires itself, so `current` is only ever
 *   null, a live `Pending`, or a live `Confirmed` — never a stale `Confirmed`.
 */
export function deriveAppointmentView(cards: AppointmentCardData[]): {
  /** The card the deal is actually on: null, a live Pending, or a live Confirmed. */
  current?: AppointmentCardData;
  /** `current` when it is Confirmed — the card pinned to the top of the chat. */
  pinned?: AppointmentCardData;
  /** `current` when it is Pending — a proposal still awaiting a reply. */
  pending?: AppointmentCardData;
} {
  const live = cards
    .filter((card) => !card.deleted_at)
    .sort((a, b) => {
      const byTime = Date.parse(b.created_at) - Date.parse(a.created_at);
      return byTime !== 0 ? byTime : b.appointment_id - a.appointment_id;
    });

  const current = live[0];
  return {
    current,
    pinned: current?.status === "Confirmed" ? current : undefined,
    pending: current?.status === "Pending" ? current : undefined,
  };
}
