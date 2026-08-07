import { notFound } from "next/navigation";

import { getTransaction, VIEWER_ID } from "@/lib/api/fixtures";
import { deadlineFor } from "@/lib/inbox";
import { canReport } from "@/lib/status";

import { ReportForm } from "./report-form";

/**
 * E8 — reporting a transaction.
 *
 * Research risk R2: the report action exists only once a flow deadline has
 * actually passed. Reaching this URL early is not an error page, it is a
 * *explanation* — telling a worried student "not yet, here is when" is the
 * whole job of this screen in that state.
 */
export default async function ReportPage({
  params,
}: {
  params: Promise<{ txId: string }>;
}) {
  const { txId } = await params;
  const tx = await getTransaction(Number(txId));
  if (!tx) notFound();

  const deadline = deadlineFor(tx);
  const allowed = canReport(deadline ? [deadline] : []);
  const viewer = tx.buyer_id === VIEWER_ID ? "buyer" : "seller";
  const other = viewer === "buyer" ? tx.seller : tx.buyer;

  return (
    <ReportForm
      transactionId={tx.transaction_id}
      itemName={tx.post.item.name}
      counterparty={other.name}
      allowed={allowed}
      deadline={deadline}
    />
  );
}
