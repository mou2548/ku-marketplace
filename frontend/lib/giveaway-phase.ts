/**
 * Where a giveaway stands, read from its dates (audit G01).
 *
 * The detail screen used to put the stored `status` on its badge ("Open for
 * entries" for every `Active` row) while the text under it worked from the
 * registration dates and said registration had closed. A giveaway stays
 * `Active` until it is drawn or allocated, long after its deadline, so the
 * two disagreed. The detail screen and the browser now both ask this one
 * function.
 *
 * It mirrors the backend's `registration_open` (`serializeGiveaway`) and
 * splits the "not open" answer into the reasons a reader needs. When the
 * clock is not known yet (server render, first client render) it falls back
 * on that flag, so the first paint and the hydrated one agree. A false flag
 * alone does not say why registration is shut (still to open, past its
 * deadline, or every first-come place taken), so the dates are used to rule
 * reasons out; when more than one is still possible the answer is `null`,
 * and callers render nothing committal until the clock is known, rather than
 * a sentence that flips after hydration.
 */

import type { GiveawayPost } from "@/lib/api/types";
import type { Lifecycle } from "@/lib/status";

export type GiveawayPhase =
  /** Active, registration window still ahead. */
  | "upcoming"
  /** Active and taking registrations. */
  | "open"
  /** First come, every place taken before the deadline. */
  | "full"
  /** Active, deadline passed: recipients are still to be drawn or chosen. */
  | "closed"
  /** `Closed`: recipients chosen, collection under way. */
  | "pickup"
  /** `Completed`. */
  | "finished";

type PhaseInput = Pick<
  GiveawayPost,
  | "status"
  | "allocation_method"
  | "register_start"
  | "register_deadline"
  | "remaining_slots"
  | "registration_open"
>;

export function giveawayPhase(g: PhaseInput, now: number): GiveawayPhase;
export function giveawayPhase(g: PhaseInput, now: number | null): GiveawayPhase | null;
export function giveawayPhase(g: PhaseInput, now: number | null): GiveawayPhase | null {
  switch (g.status) {
    case "Completed":
      return "finished";
    case "Closed":
      return "pickup";
    case "Active":
      break;
  }
  const full = g.allocation_method === "FirstCome" && g.remaining_slots <= 0;
  if (now === null) {
    if (g.registration_open) return "open";
    // The reasons the clock would pick between, minus the ones the dates
    // rule out: no start date cannot be upcoming, no deadline cannot be past.
    const reasons: GiveawayPhase[] = [];
    if (g.register_start) reasons.push("upcoming");
    if (g.register_deadline) reasons.push("closed");
    if (full) reasons.push("full");
    return reasons.length === 1 ? reasons[0] : null;
  }
  const start = g.register_start ? Date.parse(g.register_start) : null;
  const deadline = g.register_deadline ? Date.parse(g.register_deadline) : null;
  if (start !== null && now < start) return "upcoming";
  if (deadline !== null && now >= deadline) return "closed";
  return full ? "full" : "open";
}

/** Whether the giveaway belongs on the public "Open" shelf: open, or still to come. */
export function isBrowsable(phase: GiveawayPhase | null): boolean {
  return phase === "open" || phase === "upcoming";
}

/**
 * A phase's place in its life, for the badge tier (`lib/badge-tier.ts`).
 * "All places taken" is ended. "Registration closed" is still open: a
 * Manual giver has recipients to choose (`viewerActsOnGiveawayPhase`);
 * everyone else sees it as information because they are not the actor.
 */
export const GIVEAWAY_PHASE_LIFECYCLE: Record<GiveawayPhase, Lifecycle> = {
  upcoming: "open",
  open: "open",
  full: "ended",
  closed: "open",
  pickup: "open",
  finished: "ended",
};
