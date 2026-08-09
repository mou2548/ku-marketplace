"use client";

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";

import { QrScanner } from "@/components/kit/qr-scanner";
import { useToast } from "@/components/kit/toast";

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

  // POST /transactions/{id}/qr/scan → { token }
  const onScan = useCallback(async () => {
    toast.show("Receipt confirmed. The deal is closed.");
    router.push(`/history/${txId}`);
  }, [router, toast, txId]);

  return (
    <QrScanner
      onScan={onScan}
      title="Scan the seller QR"
      hint="Inspect the item before you scan. Scanning closes the deal immediately."
    />
  );
}
