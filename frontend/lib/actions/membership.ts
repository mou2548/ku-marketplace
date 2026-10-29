"use server";

import { runAction } from "@/lib/action-result";
import { getAccessToken } from "@/lib/api/session";
import { requestUpgrade, reviewPayment } from "@/lib/api/membership";
import type { MembershipTier } from "@/lib/api/membership";

export async function subscribeToMembership(tier: MembershipTier, proofImageUrl: string) {
  return runAction(async () => {
    if (!(await getAccessToken())) {
      throw new Error("Not signed in");
    }
    return requestUpgrade(tier, proofImageUrl);
  });
}

export async function decideMembershipPayment(
  paymentId: number,
  approve: boolean,
  rejectionReason?: string,
) {
  return runAction(async () => {
    if (!(await getAccessToken())) {
      throw new Error("Not signed in");
    }
    return reviewPayment(paymentId, approve, rejectionReason);
  });
}
