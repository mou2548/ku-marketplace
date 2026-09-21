"use server";

import { getAccessToken } from "@/lib/api/session";
import { requestUpgrade, reviewPayment } from "@/lib/api/membership";
import type { MembershipTier } from "@/lib/api/membership";

export async function subscribeToMembership(tier: MembershipTier, proofImageUrl: string) {
  if (!(await getAccessToken())) {
    throw new Error("Not signed in");
  }
  return requestUpgrade(tier, proofImageUrl);
}

export async function decideMembershipPayment(
  paymentId: number,
  approve: boolean,
  rejectionReason?: string,
) {
  if (!(await getAccessToken())) {
    throw new Error("Not signed in");
  }
  return reviewPayment(paymentId, approve, rejectionReason);
}
