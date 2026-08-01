import Link from "next/link";
import { X } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function TradeCancelPage() {
  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <Card className="w-full max-w-[440px] flex-col items-center gap-6 rounded-3xl p-8 text-center shadow-elevated ring-0">
          <div className="flex size-14 items-center justify-center rounded-full bg-error-bg">
            <X className="size-7 text-error" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold text-foreground">
              Cancel this trade?
            </h1>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel this trade? This action cannot
              be undone, and you&apos;ll need to start a new offer if you
              change your mind.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <Link
              href="/history"
              className={cn(buttonVariants(), "h-12 w-full bg-error hover:bg-error/90")}
            >
              Confirm Cancellation
            </Link>
            <Link
              href="/history"
              className="flex h-12 w-full items-center justify-center rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted"
            >
              Keep Trade
            </Link>
          </div>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
