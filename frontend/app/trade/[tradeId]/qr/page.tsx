import { QrWaitingCard } from "@/components/qr-waiting-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default async function TradeQrPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <QrWaitingCard tradeId={tradeId} />
      </main>

      <SiteFooter />
    </div>
  );
}
