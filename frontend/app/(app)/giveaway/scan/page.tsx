"use client";

import { useRouter } from "next/navigation";

import { QrScanner } from "@/components/kit/qr-scanner";
import { useToast } from "@/components/kit/toast";
import { confirmTicketQr } from "@/lib/actions/giveaways";
import type { ApiError } from "@/lib/api/client";
import { decodeTicketQr } from "@/lib/giveaway-qr";

/**
 * One scanner for every giveaway a giver runs — the QR encodes
 * `{ giveawayId, ticketId, token }` itself (`lib/giveaway-qr.ts`), so there is
 * nothing giveaway-specific to route on.
 *
 * A dedicated full-screen route, mirroring `/history/[txId]/scan`, because
 * `QrScanner` is built to own the whole screen (design principle 7 — `min-h-dvh`,
 * no chrome) and breaks when squeezed into a height-capped `Overlay` dialog:
 * the camera view gets pushed past what the dialog's `max-h-[85dvh]` shows.
 */
export default function GiveawayScanPage() {
  const router = useRouter();
  const toast = useToast();

  async function handleScan(raw: string) {
    const decoded = decodeTicketQr(raw);
    if (!decoded) {
      toast.error("That QR is not a giveaway ticket.");
      return;
    }
    try {
      const valid = await confirmTicketQr(decoded.giveawayId, decoded.ticketId, decoded.token);
      if (!valid) {
        toast.error("This QR is not valid.");
        return;
      }
      toast.success("Ticket accepted. Handover recorded.");
      router.push(`/giveaway/${decoded.giveawayId}`);
    } catch (error) {
      toast.error((error as ApiError).message ?? "Could not check that QR.");
    }
  }

  return (
    <QrScanner
      title="Scan a recipient's ticket"
      hint="Point the camera at the recipient's ticket QR"
      onScan={handleScan}
    />
  );
}
