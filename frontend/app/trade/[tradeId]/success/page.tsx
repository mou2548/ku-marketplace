import Link from "next/link";
import { Check } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TradeReviewCard } from "@/components/trade-review-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TradeSuccessPage() {
  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 flex-col items-center gap-8 px-6 py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary">
            <Check className="size-8 text-white" strokeWidth={3} />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-[32px] leading-10 font-semibold text-primary-dark">
              การแลกเปลี่ยนสำเร็จ!
            </h1>
            <p className="text-lg text-muted-foreground">
              Trade Completed Successfully
            </p>
          </div>
        </div>

        <TradeReviewCard />

        <div className="flex w-full max-w-[440px] flex-col gap-3 sm:flex-row">
          <Link
            href="/history"
            className={cn(buttonVariants({ variant: "outline" }), "h-12 flex-1")}
          >
            View in History
          </Link>
          <Link
            href="/marketplace"
            className={cn(buttonVariants(), "h-12 flex-1")}
          >
            Back to Marketplace
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
