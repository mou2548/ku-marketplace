import { HistoryTabs } from "@/components/history-tabs";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TradeHistoryCard } from "@/components/trade-history-card";
import { TRADES } from "@/lib/trades";

export default function HistoryPage() {
  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-6 py-8">
        <PageHeader
          title="History"
          subtitle="All your marketplace trades and giveaway requests in one place."
        />

        <HistoryTabs
          trades={TRADES.map((trade) => (
            <TradeHistoryCard key={trade.id} trade={trade} />
          ))}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
