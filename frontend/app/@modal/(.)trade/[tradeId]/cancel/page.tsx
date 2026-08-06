import { notFound } from "next/navigation";

import { CancelTradeDialog } from "@/components/cancel-trade-dialog";
import { getTrade, requiresMutualCancel } from "@/lib/trades";

/**
 * Server component so the §4.7 branch is decided from trade state, not from
 * whatever the link happened to point at — an intercepted route is reachable
 * with any trade id.
 */
export default async function TradeCancelModal({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);

  if (!trade) notFound();

  return (
    <CancelTradeDialog
      tradeId={trade.id}
      mutual={requiresMutualCancel(trade)}
      asModal
    />
  );
}
