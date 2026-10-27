"use client";

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";

import { QrScanner } from "@/components/kit/qr-scanner";
import { useToast } from "@/components/kit/toast";
import { fetchRoomId } from "@/lib/actions/chat";
import { completeHandover } from "@/lib/actions/transactions";
import { markRoomActive } from "@/lib/chat-activity";

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
      // The handover is a conversation event like any other, and this is the
      // one place it can be performed from outside the room, so the inbox has
      // to be told from here too. The server stamps
      // `item_received_confirmed_by_buyer_at` either way, so the next poll
      // would float the room regardless — this only removes the wait, and a
      // failed lookup must not turn a recorded handover into an error.
      try {
        markRoomActive(await fetchRoomId(Number(txId)));
      } catch {
        // The poll still floats it, just later.
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
