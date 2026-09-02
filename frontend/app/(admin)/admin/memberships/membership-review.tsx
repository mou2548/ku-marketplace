"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SlipReviewer } from "@/components/kit/slip";
import { useToast } from "@/components/kit/toast";
import { decideMembershipPayment } from "@/lib/actions/membership";
import type { MembershipTier } from "@/lib/api/fixtures";

export function MembershipReview({
  requestId,
  slipUrl,
  userName,
  tier,
  amount,
  createdAt,
}: {
  requestId: number;
  slipUrl: string;
  userName: string;
  tier: MembershipTier;
  amount: number;
  createdAt: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function decide(approved: boolean) {
    setBusy(true);
    try {
      await decideMembershipPayment(requestId, approved);
    } catch (err) {
      setBusy(false);
      toast.show(err instanceof Error ? err.message : "Could not record the decision");
      return;
    }
    setBusy(false);
    toast.show(
      approved
        ? `${tier} granted to ${userName}.`
        : `Request #${requestId} rejected. The student has been told the amount does not match.`,
    );
    router.refresh();
  }

  return (
    <SlipReviewer
      slipUrl={slipUrl}
      amount={amount}
      buyer={{ name: userName, isVerified: true }}
      uploadedAt={createdAt}
      isBusy={busy}
      onConfirm={() => decide(true)}
      onReject={() => decide(false)}
    />
  );
}
