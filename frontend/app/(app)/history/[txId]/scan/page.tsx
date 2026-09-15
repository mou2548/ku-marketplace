"use client";

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";

import { QrScanner } from "@/components/kit/qr-scanner";
import { useToast } from "@/components/kit/toast";
import { completeHandover } from "@/lib/actions/transactions";

/**
 * The Meetup handover, buyer side. A Client Component all the way down because
 * it owns a camera stream.
 */
export default function DealScanPage({
  params,
}: {
  params: Promise<{ txId: string }>;
}) {
  const { txId } = use(params);
  const router = useRouter();
  const toast = useToast();

  /**
   * The scanned token is sent for verification rather than assumed valid. This
   * used to toast "Receipt confirmed" and navigate without contacting the
   * server, so scanning any QR code at all closed the deal on screen and none
   * of them closed it in the database.
   *
   * A wrong or expired code has to fail visibly: the buyer is standing in
   * front of the seller and needs to know the handover did not register.
   */
  const onScan = useCallback(
    async (token: string) => {
      try {
        await completeHandover(Number(txId), token);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "That code did not work. Ask the seller to refresh it.",
        );
        return;
      }
      toast.success("Handover recorded. Check the deal for any remaining steps.");
      router.push(`/history/${txId}`);
    },
    [router, toast, txId],
  );

  return (
    <QrScanner
      onScan={onScan}
      title="Scan the handover QR"
      hint="Inspect the goods before confirming the handover."
    />
  );
}
