import Link from "next/link";
import { Check } from "lucide-react";

import { TradeReviewCard } from "@/components/trade-review-card";

export default function TradeSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-[#FAF8FF] p-6 py-16">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-[#2E8F5A]">
          <Check className="size-8 text-white" strokeWidth={3} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-center text-[32px] leading-10 font-semibold text-[#2E8F5A]">
            การแลกเปลี่ยนสำเร็จ!
          </h1>
          <p className="text-lg text-muted-foreground">Trade Completed Successfully</p>
        </div>
      </div>

      <TradeReviewCard />

      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Return to Home
      </Link>
    </div>
  );
}
