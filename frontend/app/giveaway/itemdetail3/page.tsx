import Link from "next/link";
import {
  ChevronRight,
  Heart,
  Info,
  Share2,
  UserPlus,
  Zap,
} from "lucide-react";

import { ItemDetailHero } from "@/components/item-detail-hero";
import { OwnerCard } from "@/components/owner-card";
import { SiteHeader } from "@/components/site-header";
import { SuccessDialog } from "@/components/success-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// TODO: replace with real item + owner + queue data from the API
const ITEM = {
  name: "Calculus: Early Transcendentals",
  category: "Education",
  type: "First-come First-serve",
  description:
    "Calculus textbook for engineering students. Good condition, some highlights inside. It helped me through Calc 1 and 2, hope it can help someone else too! Pick up during weekdays near the Engineering Faculty.",
  owner: {
    name: "Praewpan K.",
    verified: true,
  },
  itemsAvailable: "1 unit",
  queueCount: "12 students",
};

export default function GiveawayItemDetail3Page() {
  return (
    <div className="flex min-h-full flex-col bg-[linear-gradient(0deg,#F4F6F8,#F4F6F8)] bg-white">
      <SiteHeader active="/giveaway" />

      <main className="flex flex-1 flex-col items-center bg-[#F4F6F8] px-6 pb-12">
        <div className="w-full max-w-[1200px]">
          <nav className="flex items-center gap-2 py-4 text-base text-muted-foreground">
            <Link href="/marketplace" className="hover:text-foreground">
              Marketplace
            </Link>
            <ChevronRight className="size-3" />
            <Link href="/marketplace" className="hover:text-foreground">
              Education
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{ITEM.name}</span>
          </nav>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_328px]">
            <div className="flex flex-col gap-6">
              <ItemDetailHero
                badges={[
                  {
                    label: ITEM.category,
                    className: "bg-[#FAF8FF]/90 text-[#2E8F5A]",
                  },
                  {
                    icon: Zap,
                    label: ITEM.type,
                    className:
                      "border border-[#7C5800]/20 bg-[#FDF3D8] text-[#5E4200] shadow-card",
                  },
                ]}
              />

              <Card className="flex-col gap-6 rounded-3xl p-6 shadow-elevated ring-0">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-[32px] leading-10 font-semibold tracking-[-0.32px] text-foreground">
                    {ITEM.name}
                  </h1>
                  <div className="flex items-start gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Share"
                      className="text-muted-foreground"
                    >
                      <Share2 className="size-[18px]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Save"
                      className="text-muted-foreground"
                    >
                      <Heart className="size-5" />
                    </Button>
                  </div>
                </div>

                <OwnerCard
                  name={ITEM.owner.name}
                  verified={ITEM.owner.verified}
                  verifiedColor="#7C5800"
                />

                <div className="flex flex-col gap-4">
                  <h3 className="text-xl leading-7 font-semibold text-foreground">
                    Description
                  </h3>
                  <p className="text-base leading-[26px] text-muted-foreground">
                    {ITEM.description}
                  </p>
                </div>
              </Card>
            </div>

            <aside className="flex flex-col gap-4">
              <Card className="flex-col gap-6 rounded-3xl border border-border/20 p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] ring-0">
                <h2 className="text-xl leading-7 font-semibold text-foreground">
                  ลงทะเบียนรับของ (Claim Item)
                </h2>

                <div className="flex flex-col gap-4 rounded-xl border border-border/20 bg-[#EAEDFF] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium tracking-[0.14px] text-muted-foreground">
                      Items available
                    </span>
                    <span className="font-bold tracking-[0.14px] text-foreground">
                      {ITEM.itemsAvailable}
                    </span>
                  </div>
                  <div className="h-px w-full bg-border/30" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium tracking-[0.14px] text-muted-foreground">
                      Currently in queue
                    </span>
                    <span className="font-bold tracking-[0.14px] text-[#7C5800]">
                      {ITEM.queueCount}
                    </span>
                  </div>
                </div>

                <p className="text-sm leading-5 font-medium tracking-[0.14px] text-muted-foreground italic">
                  คลิกเพื่อลงทะเบียนรับสิทธิ์
                  ระบบจะบันทึกคิวของคุณทันที
                </p>

                <SuccessDialog triggerClassName="h-12 w-full gap-4 text-base">
                  <UserPlus className="size-4" />
                  ลงทะเบียนรับสิทธิ์ (Claim Now)
                </SuccessDialog>
              </Card>

              <div className="flex items-start gap-4 rounded-3xl border-2 border-dashed border-border/50 p-6">
                <Info className="size-5 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-4 font-medium text-muted-foreground italic">
                  Tip: Adding a personal story about why you need this item to
                  increases your chances of being selected!
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
