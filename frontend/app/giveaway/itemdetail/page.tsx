import { Heart, Info, Send, Share2, Tv, Hand } from "lucide-react";

import { ItemDetailHero } from "@/components/item-detail-hero";
import { OwnerCard } from "@/components/owner-card";
import { SiteHeader } from "@/components/site-header";
import { SuccessDialog } from "@/components/success-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// TODO: replace with real item + owner data from the API
const ITEM = {
  name: "Vintage Canon AE-1 Program",
  category: "Electronics",
  type: "Manual Selection",
  description:
    "A well-maintained vintage camera for students interested in film photography. Comes with a 50mm f/1.8 lens. Perfect for photography club members!",
  owner: {
    name: "Dr. Pathomporn S.",
    verified: true,
  },
};

export default function GiveawayItemDetailPage() {
  return (
    <div className="flex min-h-full flex-col bg-[linear-gradient(0deg,#F4F6F8,#F4F6F8)] bg-white">
      <SiteHeader active="/giveaway" />

      <main className="flex flex-1 flex-col items-center bg-[#F4F6F8] px-6 pt-8 pb-12">
        <div className="grid w-full max-w-[1152px] grid-cols-1 gap-6 lg:grid-cols-[1fr_334px]">
          <div className="flex flex-col gap-6">
            <ItemDetailHero
              badges={[
                {
                  icon: Tv,
                  label: ITEM.category,
                  className: "bg-white/90 text-[#2E8F5A]",
                },
                {
                  icon: Hand,
                  label: ITEM.type,
                  className: "bg-[#FDF3D8]/90 text-[#6F4E00]",
                },
              ]}
            />

            <Card className="flex-col gap-8 rounded-3xl p-8 shadow-elevated ring-0">
              <div className="flex flex-col gap-4">
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

                <OwnerCard name={ITEM.owner.name} verified={ITEM.owner.verified} />
              </div>

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
            <Card className="flex-col gap-6 rounded-3xl p-6 shadow-elevated ring-0">
              <h2 className="text-xl leading-7 font-semibold text-foreground">
                ลงทะเบียนยื่นคำขอรับของ (Submit Request)
              </h2>

              <div className="flex flex-col gap-4">
                <label
                  htmlFor="request-reason"
                  className="text-sm font-medium tracking-[0.14px] text-muted-foreground"
                >
                  เหตุผลในการขอรับของ
                </label>
                <Textarea
                  id="request-reason"
                  placeholder="ระบุเหตุผลที่ต้องการของชิ้นนี้..."
                  className="min-h-[160px] resize-none rounded-3xl border-none bg-[#F4F6F8] p-6"
                />
              </div>

              <div className="flex flex-col gap-4">
                <p className="text-center text-xs leading-[18px] text-muted-foreground">
                  การกดยืนยันแสดงว่าคุณยอมรับว่าระบบจะแจ้งเตือนผู้ให้
                  และผลการตัดสินใจขึ้นอยู่กับผู้ให้เท่านั้น
                </p>
                <SuccessDialog triggerClassName="h-12 w-full gap-4 text-base">
                  <Send className="size-4" />
                  ส่งคำขอ (Submit Request)
                </SuccessDialog>
              </div>
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
      </main>
    </div>
  );
}
