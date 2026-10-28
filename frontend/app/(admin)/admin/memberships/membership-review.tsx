"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/kit/button";
import { TextAreaField } from "@/components/kit/field";
import { Overlay } from "@/components/kit/overlay";
import { SlipReviewer } from "@/components/kit/slip";
import { useToast } from "@/components/kit/toast";
import { unwrapAction } from "@/lib/action-result";
import { decideMembershipPayment } from "@/lib/actions/membership";
import type { MembershipTier } from "@/lib/api/membership";
import { getCopy } from "@/lib/copy";

/** `Subscription_Payment.rejection_reason` is VARCHAR(500). */
const REJECT_REASON_MAX = 500;

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
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();

  async function decide(approved: boolean, rejectionReason?: string) {
    setBusy(true);
    try {
      await unwrapAction(
        decideMembershipPayment(requestId, approved, rejectionReason),
      );
    } catch (err) {
      // The dialog stays open with the typed reason, beside the error.
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Could not record the decision");
      return;
    }
    setBusy(false);
    setRejecting(false);
    setReason("");
    toast.success(
      approved
        ? `${tier} granted to ${userName}.`
        : `Request #${requestId} rejected.`,
    );
    router.refresh();
  }

  return (
    <>
      {/* The slip card is shared with the buyer-seller deal, and its heading
          and "uploaded" line still use that wording; it takes no props to
          change them yet (components/kit/slip.tsx). */}
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

      <Overlay
        isOpen={rejecting}
        onOpenChange={setRejecting}
        isBusy={busy}
        title="Reject this membership payment?"
        description={`${userName}'s ${tier} request stays inactive. Check the slip against the tier price before you reject.`}
        footer={
          <>
            <Button variant="ghost" slot="close" isDisabled={busy}>
              Keep reviewing
            </Button>
            <Button
              variant="danger"
              isLoading={busy}
              isDisabled={trimmed.length === 0 || trimmed.length > REJECT_REASON_MAX}
              onPress={() => decide(false, trimmed)}
            >
              Reject payment
            </Button>
          </>
        }
      >
        <TextAreaField
          label="Reason"
          value={reason}
          onChange={setReason}
          isRequired
          maxLength={REJECT_REASON_MAX}
          rows={3}
          placeholder="For example: the slip amount does not match the tier price."
          hint={`${reason.length}/${REJECT_REASON_MAX}`}
        />
      </Overlay>
    </>
  );
}
