import Link from "next/link";
import {
  ChevronRight,
  Clock,
  Headphones,
  Heart,
  Info,
  Share2,
  Shuffle,
  UserPlus,
  Users,
} from "lucide-react";

import { ItemDetailHero } from "@/components/item-detail-hero";
import { OwnerCard } from "@/components/owner-card";
import { SiteHeader } from "@/components/site-header";
import { SuccessDialog } from "@/components/success-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// TODO: replace with real item + owner + draw data from the API
const ITEM = {
  name: "Sony WH-1000XM4",
  category: "Electronics",
  type: "Random Draw",
  description: [
    "ต้องการส่งต่อหูฟัง Sony WH-1000XM4 สภาพดีมาก ใช้งานไปเพียงไม่กี่ครั้ง อุปกรณ์ครบกล่อง ระบบตัดเสียงรบกวนทำงานได้ยอดเยี่ยม สาเหตุที่แจกเพราะได้รุ่นใหม่มาครับ อยากให้คนที่จำเป็นต้องใช้เพื่อการเรียนหรือการทำงานมาสุ่มรับครับ",
    "- แบตเตอรี่ใช้งานได้ปกติ 30+ ชั่วโมง",
    "- นัดรับได้ที่คณะวิศวกรรมศาสตร์",
    "- ขอสุ่มแจกเพื่อความเท่าเทียมครับ",
  ],
  owner: {
    name: "Dr. Pathomporn S.",
    verified: true,
  },
  drawClosesIn: "02วัน 14ชม.",
  participants: 156,
};

export default function GiveawayItemDetail2Page() {
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
            <span className="text-foreground">
              Calculus: Early Transcendentals
            </span>
          </nav>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_328px]">
            <div className="flex flex-col gap-6">
              <ItemDetailHero
                badges={[
                  {
                    icon: Headphones,
                    label: ITEM.category,
                    className:
                      "border border-border/20 bg-white/90 text-[#2E8F5A]",
                  },
                  {
                    icon: Shuffle,
                    label: ITEM.type,
                    className:
                      "border border-[#7C5800]/20 bg-[#FDF3D8] text-[#5E4200]",
                  },
                ]}
              />

              <Card className="flex-col gap-6 rounded-3xl p-8 shadow-elevated ring-0">
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

                <div className="h-px w-full bg-border/10" />

                <OwnerCard name={ITEM.owner.name} verified={ITEM.owner.verified} />

                <div className="flex flex-col gap-4">
                  <h3 className="text-xl leading-7 font-semibold text-foreground">
                    Description
                  </h3>
                  <div className="flex flex-col gap-1.5 text-base leading-[26px] text-muted-foreground">
                    {ITEM.description.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            <aside className="flex flex-col gap-4 rounded-3xl border-2 border-[#004B24]/10 bg-white p-6 shadow-elevated">
              <h2 className="text-xl leading-7 font-semibold text-foreground">
                ลงทะเบียนสุ่มรับของ (Enter Random Draw)
              </h2>

              <div className="flex flex-col gap-1 rounded-3xl border border-[#004B24]/5 bg-[#006633]/10 p-4">
                <span className="text-xs font-medium text-[#005228]">
                  สุ่มผู้โชคดีในอีก:
                </span>
                <span className="flex items-center gap-2 text-2xl leading-8 font-semibold text-[#2E8F5A]">
                  <Clock className="size-5" />
                  {ITEM.drawClosesIn}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-3xl border border-border/10 bg-[#EAEDFF] p-4">
                <span className="flex items-center gap-2 text-sm font-medium tracking-[0.14px] text-muted-foreground">
                  <Users className="size-4" />
                  ผู้เข้าร่วมปัจจุบัน:
                </span>
                <span className="text-sm font-bold tracking-[0.14px] text-foreground">
                  {ITEM.participants} คน
                </span>
              </div>

              <div className="flex items-start gap-2 rounded-3xl border border-[#FFB2BA]/20 bg-[#FFD9DC]/10 p-4">
                <Info className="size-4 shrink-0 text-[#742433]" />
                <p className="text-xs leading-4 font-medium text-[#7C2A39]">
                  ผู้ชนะจะถูกสุ่มโดยระบบและประกาศผลผ่านทาง Chat
                  ของแอปพลิเคชัน KU Marketplace
                </p>
              </div>

              <SuccessDialog triggerClassName="h-12 w-full gap-2 text-sm font-bold shadow-[0_10px_15px_-3px_rgba(0,75,36,0.2),0_4px_6px_-4px_rgba(0,75,36,0.2)]">
                <UserPlus className="size-4" />
                ลงทะเบียนลุ้นรับสิทธิ์ (Enter Draw)
              </SuccessDialog>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
