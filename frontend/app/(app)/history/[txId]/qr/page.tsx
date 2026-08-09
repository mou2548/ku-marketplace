import { notFound } from "next/navigation";

import { getTransaction } from "@/lib/api/fixtures";

import { DealQr } from "./deal-qr";

/**
 * The Meetup handover, seller side. Full screen, no chrome — design principle
 * 7: this is the moment the whole transaction exists for, and a QR competing
 * with a nav bar in daylight is a QR that does not scan.
 */
export default async function DealQrPage({
  params,
}: {
  params: Promise<{ txId: string }>;
}) {
  const { txId } = await params;
  const tx = await getTransaction(Number(txId));
  if (!tx) notFound();

  return <DealQr transactionId={tx.transaction_id} itemName={tx.post.item.name} />;
}
