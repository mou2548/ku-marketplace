"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SlipRejectDialog, SlipReviewer } from "@/components/kit/slip";
import { useToast } from "@/components/kit/toast";
import { unwrapAction } from "@/lib/action-result";
import { decideMembershipPayment } from "@/lib/actions/membership";
import type { MembershipTier } from "@/lib/api/membership";
import { getCopy } from "@/lib/copy";

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
  // "Amount is wrong" used to reject on a single tap, with no reason (audit
  // AD02). It now opens this step first; the reason is required so the
  // record says why, instead of the API's "no reason given" default.
  const [rejecting, setRejecting] = useState(false);

  /** Resolves whether the API recorded it, so the reject dialog knows to close. */
  async function decide(approved: boolean, rejectionReason?: string): Promise<boolean> {
    setBusy(true);
    try {
      await unwrapAction(
        decideMembershipPayment(requestId, approved, rejectionReason),
      );
    } catch (err) {
      // The dialog stays open with the typed reason, beside the error.
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Could not record the decision");
      return false;
    }
    setBusy(false);
    toast.success(
      approved
        ? `${tier} granted to ${userName}.`
        : `Request #${requestId} rejected.`,
    );
    router.refresh();
    return true;
  }

  return (
    <>
      {/* The slip card is shared with the buyer-seller deal, and its heading
          and "uploaded" line are passed in below. */}
      <SlipReviewer
        slipUrl={slipUrl}
        amount={amount}
        buyer={{ name: userName, isVerified: true }}
        uploadedAt={createdAt}
        title={getCopy("slip")("checkMembership")}
        uploader="plain"
        isBusy={busy}
        onConfirm={() => decide(true)}
        onReject={() => setRejecting(true)}
      />

      <SlipRejectDialog
        isOpen={rejecting}
        onOpenChange={setRejecting}
        isBusy={busy}
        onReject={(reason) => decide(false, reason)}
        title="Reject this membership payment?"
        description={`${userName}'s ${tier} request stays inactive. Check the slip against the tier price before you reject.`}
        label="Reason"
        placeholder="For example: the slip amount does not match the tier price."
        hint={(count, max) => `${count}/${max}`}
        keepLabel="Keep reviewing"
        submitLabel="Reject payment"
      />
    </>
  );
}
