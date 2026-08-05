import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Clock,
  Heart,
  Info,
  Send,
  Share2,
  UserPlus,
  Users,
} from "lucide-react";

import { ItemDetailHero } from "@/components/item-detail-hero";
import { OwnerCard } from "@/components/owner-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SuccessDialog } from "@/components/success-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { GIVEAWAY_REQUEST_TYPE_META, getGiveawayItem } from "@/lib/giveaway-items";

export default async function GiveawayItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const item = getGiveawayItem(itemId);
  if (!item) notFound();

  const typeMeta = GIVEAWAY_REQUEST_TYPE_META[item.requestType];

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 flex-col items-center bg-page-background px-6 pb-12">
        <div className="w-full max-w-[1200px]">
          <nav className="flex items-center gap-2 py-4 text-base text-muted-foreground">
            <Link href="/giveaway" className="hover:text-foreground">
              Giveaway
            </Link>
            <ChevronRight className="size-3" />
            <Link href="/giveaway" className="hover:text-foreground">
              {item.category}
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{item.name}</span>
          </nav>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_328px]">
            <div className="flex flex-col gap-6">
              <ItemDetailHero
                image={item.image}
                alt={item.name}
                badges={[
                  {
                    label: item.category,
                    className:
                      "border border-border/20 bg-white/90 text-primary-dark",
                  },
                  {
                    icon: typeMeta.icon,
                    label: typeMeta.label,
                    className:
                      "border border-warning-dark/20 bg-warning-bg text-warning-dark",
                  },
                ]}
              />

              <Card className="flex-col gap-6 rounded-3xl p-8 shadow-elevated ring-0">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-[32px] leading-10 font-semibold tracking-[-0.32px] text-foreground">
                    {item.name}
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
                  name={item.owner.name}
                  verified={item.owner.verified}
                  verifiedTier={item.owner.verifiedTier}
                />

                <div className="flex flex-col gap-4">
                  <h3 className="text-xl leading-7 font-semibold text-foreground">
                    Description
                  </h3>
                  {Array.isArray(item.description) ? (
                    <div className="flex flex-col gap-1.5 text-base leading-[26px] text-muted-foreground">
                      {item.description.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base leading-[26px] text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
              </Card>
            </div>

            <aside className="flex flex-col gap-4">
              {item.requestType === "manual" && (
                <>
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
                        className="min-h-[160px] resize-none rounded-3xl border-none bg-page-background p-6"
                      />
                    </div>

                    <div className="flex flex-col gap-4">
                      <p className="text-center text-xs leading-[18px] text-muted-foreground">
                        การกดยืนยันแสดงว่าคุณยอมรับว่าระบบจะแจ้งเตือนผู้ให้
                        และผลการตัดสินใจขึ้นอยู่กับผู้ให้เท่านั้น
                      </p>
                      <SuccessDialog triggerClassName="h-12 w-full gap-4 text-base" itemName={item.name}>
                        <Send className="size-4" />
                        ส่งคำขอ (Submit Request)
                      </SuccessDialog>
                    </div>
                  </Card>

                  <div className="flex items-start gap-4 rounded-3xl border-2 border-dashed border-border/50 p-6">
                    <Info className="size-5 shrink-0 text-muted-foreground" />
                    <p className="text-xs leading-4 font-medium text-muted-foreground italic">
                      Tip: Adding a personal story about why you need this
                      item to increases your chances of being selected!
                    </p>
                  </div>
                </>
              )}

              {item.requestType === "random" && (
                <div className="flex flex-col gap-4 rounded-3xl border-2 border-primary-dark/10 bg-white p-6 shadow-elevated">
                  <h2 className="text-xl leading-7 font-semibold text-foreground">
                    ลงทะเบียนสุ่มรับของ (Enter Random Draw)
                  </h2>

                  <div className="flex flex-col gap-1 rounded-3xl border border-primary-dark/5 bg-primary/10 p-4">
                    <span className="text-xs font-medium text-primary-dark">
                      สุ่มผู้โชคดีในอีก:
                    </span>
                    <span className="flex items-center gap-2 text-2xl leading-8 font-semibold text-primary">
                      <Clock className="size-5" />
                      {item.drawClosesIn}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-3xl border border-border/10 bg-surface-muted p-4">
                    <span className="flex items-center gap-2 text-sm font-medium tracking-[0.14px] text-muted-foreground">
                      <Users className="size-4" />
                      ผู้เข้าร่วมปัจจุบัน:
                    </span>
                    <span className="text-sm font-bold tracking-[0.14px] text-foreground">
                      {item.participants} คน
                    </span>
                  </div>

                  <div className="flex items-start gap-2 rounded-3xl border border-error-bg/20 bg-error-bg/10 p-4">
                    <Info className="size-4 shrink-0 text-error-dark" />
                    <p className="text-xs leading-4 font-medium text-error-dark">
                      ผู้ชนะจะถูกสุ่มโดยระบบและประกาศผลผ่านทาง Chat
                      ของแอปพลิเคชัน KU Marketplace
                    </p>
                  </div>

                  <SuccessDialog triggerClassName="h-12 w-full gap-2 text-sm font-bold shadow-[0_10px_15px_-3px_rgba(0,75,36,0.2),0_4px_6px_-4px_rgba(0,75,36,0.2)]" itemName={item.name}>
                    <UserPlus className="size-4" />
                    ลงทะเบียนลุ้นรับสิทธิ์ (Enter Draw)
                  </SuccessDialog>
                </div>
              )}

              {item.requestType === "first-come" && (
                <>
                  <Card className="flex-col gap-6 rounded-3xl border border-border/20 p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] ring-0">
                    <h2 className="text-xl leading-7 font-semibold text-foreground">
                      ลงทะเบียนรับของ (Claim Item)
                    </h2>

                    <div className="flex flex-col gap-4 rounded-xl border border-border/20 bg-surface-muted p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium tracking-[0.14px] text-muted-foreground">
                          Items available
                        </span>
                        <span className="font-bold tracking-[0.14px] text-foreground">
                          {item.itemsAvailable}
                        </span>
                      </div>
                      <div className="h-px w-full bg-border/30" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium tracking-[0.14px] text-muted-foreground">
                          Currently in queue
                        </span>
                        <span className="font-bold tracking-[0.14px] text-warning-dark">
                          {item.queueCount}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm leading-5 font-medium tracking-[0.14px] text-muted-foreground italic">
                      คลิกเพื่อลงทะเบียนรับสิทธิ์
                      ระบบจะบันทึกคิวของคุณทันที
                    </p>

                    <SuccessDialog triggerClassName="h-12 w-full gap-4 text-base" itemName={item.name}>
                      <UserPlus className="size-4" />
                      ลงทะเบียนรับสิทธิ์ (Claim Now)
                    </SuccessDialog>
                  </Card>

                  <div className="flex items-start gap-4 rounded-3xl border-2 border-dashed border-border/50 p-6">
                    <Info className="size-5 shrink-0 text-muted-foreground" />
                    <p className="text-xs leading-4 font-medium text-muted-foreground italic">
                      Tip: Adding a personal story about why you need this
                      item to increases your chances of being selected!
                    </p>
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
