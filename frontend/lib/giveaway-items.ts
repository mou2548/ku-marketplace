import { Hand, Shuffle, Zap, type LucideIcon } from "lucide-react";

export type GiveawayRequestType = "manual" | "random" | "first-come";

interface GiveawayItemBase {
  id: string;
  image: string;
  name: string;
  category: string;
  owner: { name: string; verified: boolean; verifiedTier?: "gold" };
}

export type GiveawayItem = GiveawayItemBase &
  (
    | { requestType: "manual"; description: string }
    | {
        requestType: "random";
        description: string[];
        drawClosesIn: string;
        participants: number;
      }
    | {
        requestType: "first-come";
        description: string;
        itemsAvailable: string;
        queueCount: string;
      }
  );

export const GIVEAWAY_REQUEST_TYPE_META: Record<
  GiveawayRequestType,
  { label: string; icon: LucideIcon }
> = {
  "first-come": { label: "First-come, First-served", icon: Zap },
  random: { label: "Random Draw", icon: Shuffle },
  manual: { label: "Manual Selection", icon: Hand },
};

// TODO: replace with real giveaway items from the API
export const GIVEAWAY_ITEMS: GiveawayItem[] = [
  {
    id: "vintage-canon-ae1",
    image: "https://upload.wikimedia.org/wikipedia/commons/9/96/Canon_AE-1_Program.jpg",
    name: "Vintage Canon AE-1 Program",
    category: "Electronics",
    owner: { name: "Dr. Pathomporn S.", verified: true },
    requestType: "manual",
    description:
      "A well-maintained vintage camera for students interested in film photography. Comes with a 50mm f/1.8 lens. Perfect for photography club members!",
  },
  {
    id: "sony-wh1000xm4",
    image: "/images/product-sony-headphones.png",
    name: "Sony WH-1000XM4",
    category: "Electronics",
    owner: { name: "Dr. Pathomporn S.", verified: true },
    requestType: "random",
    description: [
      "ต้องการส่งต่อหูฟัง Sony WH-1000XM4 สภาพดีมาก ใช้งานไปเพียงไม่กี่ครั้ง อุปกรณ์ครบกล่อง ระบบตัดเสียงรบกวนทำงานได้ยอดเยี่ยม สาเหตุที่แจกเพราะได้รุ่นใหม่มาครับ อยากให้คนที่จำเป็นต้องใช้เพื่อการเรียนหรือการทำงานมาสุ่มรับครับ",
      "- แบตเตอรี่ใช้งานได้ปกติ 30+ ชั่วโมง",
      "- นัดรับได้ที่คณะวิศวกรรมศาสตร์",
      "- ขอสุ่มแจกเพื่อความเท่าเทียมครับ",
    ],
    drawClosesIn: "02วัน 14ชม.",
    participants: 156,
  },
  {
    id: "calculus-textbook",
    image: "/images/product-physics-textbooks.png",
    name: "Calculus: Early Transcendentals",
    category: "Education",
    owner: { name: "Praewpan K.", verified: true, verifiedTier: "gold" },
    requestType: "first-come",
    description:
      "Calculus textbook for engineering students. Good condition, some highlights inside. It helped me through Calc 1 and 2, hope it can help someone else too! Pick up during weekdays near the Engineering Faculty.",
    itemsAvailable: "1 unit",
    queueCount: "12 students",
  },
];

export function getGiveawayItem(id: string) {
  return GIVEAWAY_ITEMS.find((item) => item.id === id);
}
