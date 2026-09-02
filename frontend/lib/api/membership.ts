import { apiFetch } from "./client";
import { authHeader } from "./session";
import type { UserSummary } from "./types";

export type MembershipTier = "Free" | "Silver" | "Gold" | "Diamond";

export interface Membership {
  tier: MembershipTier;
  expires_at?: string | null;
  pending_review: boolean;
}

export interface MembershipRequest {
  request_id: number;
  user: UserSummary;
  tier: MembershipTier;
  amount: number;
  slip_image_url: string;
  created_at: string;
}

/** Raw `GET /membership/status` shape — camelCase, `membership.service.ts`'s `getStatus()`. */
interface RawStatus {
  tier: MembershipTier;
  /** What the account actually gets right now — `tier` may be stale until the expiry sweep runs. */
  effectiveTier: MembershipTier;
  status: string;
  startDate: string | null;
  endDate: string | null;
  postsUsedThisMonth: number;
  postQuota: number | null;
  postsRemaining: number | null;
  pendingPayment: { paymentId: number; amount: number } | null;
}

/** Adapts to `lib/api/fixtures.ts`'s `Membership` — the shape `membership-screen.tsx` already consumes. */
function toMembership(raw: RawStatus): Membership {
  return {
    tier: raw.effectiveTier,
    // Stale endDate is meaningless once effectiveTier has fallen back to Free.
    expires_at: raw.effectiveTier === "Free" ? null : raw.endDate,
    pending_review: raw.pendingPayment !== null,
  };
}

/** `GET /membership/status` — the signed-in user's own tier, real quota, pending payment. */
export async function getMembership(): Promise<Membership> {
  return toMembership(
    await apiFetch<RawStatus>("/membership/status", { headers: await authHeader() }),
  );
}

/** `POST /membership/subscribe` */
export async function requestUpgrade(requestedTier: MembershipTier, proofImageUrl: string) {
  return apiFetch<{ paymentId: number }>("/membership/subscribe", {
    method: "POST",
    body: JSON.stringify({ requestedTier, proofImageUrl }),
    headers: await authHeader(),
  });
}

/** Raw `GET /membership/payments/pending` row — admin only. */
interface RawPendingPayment {
  paymentId: number;
  amount: number;
  slipImageUrl: string;
  createdAt: string;
  user: { userId: number; email: string; firstNameEn: string };
  subscription: { tier: MembershipTier };
}

/**
 * Adapts to `MembershipRequest` (`lib/api/fixtures.ts`) — the admin queue's
 * `TrustBadge` wants a full `UserSummary`, but this endpoint only ever
 * includes `{ userId, email, firstNameEn }` for the requester (no faculty,
 * year, or avatar — see `docs/design/api-gaps.md`). `isVerified: true` is not
 * a guess: every account requires a `@ku.th`/`@ku.ac.th` email to exist at
 * all (research T1), so KU verification is not a separate flag to be missing.
 */
function toMembershipRequest(raw: RawPendingPayment): MembershipRequest {
  return {
    request_id: raw.paymentId,
    user: { user_id: raw.user.userId, name: raw.user.firstNameEn, isVerified: true },
    tier: raw.subscription.tier,
    amount: raw.amount,
    slip_image_url: raw.slipImageUrl,
    created_at: raw.createdAt,
  };
}

/** `GET /membership/payments/pending` — admin only. */
export async function listPendingPayments(): Promise<MembershipRequest[]> {
  const raw = await apiFetch<RawPendingPayment[]>("/membership/payments/pending", {
    headers: await authHeader(),
  });
  return raw.map(toMembershipRequest);
}

/** `POST /admin/membership/:id/approve` — admin only. */
export async function reviewPayment(paymentId: number, approve: boolean, rejectionReason?: string) {
  return apiFetch(`/admin/membership/${paymentId}/approve`, {
    method: "POST",
    body: JSON.stringify({ approve, rejectionReason }),
    headers: await authHeader(),
  });
}
