"use client";

import { useState } from "react";

import { SlipReviewer } from "@/components/kit/slip";
import { useToast } from "@/components/kit/toast";
import type { MembershipTier } from "@/lib/api/fixtures";

const PRICE: Record<MembershipTier, number> = {
  Free: 0,
  Silver: 49,
  Gold: 99,
  Diamond: 199,
};

export function MembershipReview({
  requestId,
  slipUrl,
  userName,
  tier,
  createdAt,
}: {
  requestId: number;
  slipUrl: string;
  userName: string;
  tier: MembershipTier;
  createdAt: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function decide(approved: boolean) {
    setBusy(true);
    // POST /admin/membership/{id}/approve
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show(
      approved
        ? `${tier} granted to ${userName}.`
        : `Request #${requestId} rejected. The student has been told the amount does not match.`,
    );
  }

  return (
    <SlipReviewer
      slipUrl={slipUrl}
      amount={PRICE[tier]}
      buyer={{ name: userName, isVerified: true }}
      uploadedAt={createdAt}
      isBusy={busy}
      onConfirm={() => decide(true)}
      onReject={() => decide(false)}
    />
  );
}
