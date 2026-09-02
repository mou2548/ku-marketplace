import type { AppointmentCardData } from "@/lib/api/types";

/**
 * Pure derivation, no I/O — same shape as `lib/rooms.ts`. Kept out of
 * `lib/api/chat.ts` on purpose: that module imports `lib/api/session.ts`
 * (`next/headers`, server-only), and this needs to be callable from
 * `room-screen.tsx`, a Client Component.
 *
 * §6.3 — `Appointment_Card` has no stored "pinned" flag, so derive it from
 * history: the most recent `Confirmed` card is the one pinned to the top,
 * and it stays pinned even past a later `Rejected` re-proposal (the spec
 * pins a confirmed card "until a new [appointment] replaces it", not until
 * one is merely proposed again). `pending` is a newer `Pending` card still
 * awaiting a reply.
 */
export function deriveAppointmentView(cards: AppointmentCardData[]): {
  pinned?: AppointmentCardData;
  pending?: AppointmentCardData;
} {
  const byNewestFirst = [...cards].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  const pinned = byNewestFirst.find((card) => card.status === "Confirmed");
  const pending = byNewestFirst.find(
    (card) =>
      card.status === "Pending" &&
      (!pinned || Date.parse(card.created_at) > Date.parse(pinned.created_at)),
  );
  return { pinned, pending };
}
