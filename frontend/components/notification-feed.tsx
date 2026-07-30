"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Frown,
  Info,
  MoreVertical,
  PackageOpen,
  QrCode,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Category = "result" | "system";

interface Notification {
  id: string;
  category: Category;
  variant: "won" | "expiring" | "missed" | "system";
  title: string;
  titleClassName: string;
  subtitle: string;
  time: string;
  icon: typeof CheckCircle2;
  iconWrapClassName: string;
  iconClassName: string;
  accentClassName: string;
  dimmed?: boolean;
  action:
    | { label: string; className: string; icon?: typeof QrCode }
    | null;
}

// TODO: replace with real notifications from the API
const NOTIFICATIONS: Notification[] = [
  {
    id: "won-desk-lamp",
    category: "result",
    variant: "won",
    title: "ขอแสดงความยินดี! คุณได้รับสิทธิ์รับของ",
    titleClassName: "text-[#2E8F5A]",
    subtitle: "โมเดลไฟตั้งโต๊ะมินิมอล (Minimal Desk Lamp)",
    time: "2 นาทีที่แล้ว",
    icon: CheckCircle2,
    iconWrapClassName: "bg-[#F2F3FF]",
    iconClassName: "text-[#2E8F5A]",
    accentClassName: "border-l-4 border-[#2E8F5A]",
    action: {
      label: "ดูตั๋ว QR Code",
      className: "bg-[#2E8F5A] text-white hover:bg-[#2E8F5A]/90",
      icon: QrCode,
    },
  },
  {
    id: "expiring-calculus",
    category: "result",
    variant: "expiring",
    title: "แจ้งเตือน: ใกล้หมดเวลารับของ",
    titleClassName: "text-[#B3465B]",
    subtitle:
      "หนังสือเรียนแคลคูลัส 1 (Calculus 1 Textbook) - รับที่ล็อคเกอร์คณะวิศวะ",
    time: "เหลือเวลาอีก 45 นาที",
    icon: TriangleAlert,
    iconWrapClassName: "bg-[#F2F3FF]",
    iconClassName: "text-[#B3465B]",
    accentClassName: "border-l-4 border-[#B3465B]",
    action: {
      label: "เปิด Inventory",
      className: "border border-[#B3465B] text-[#B3465B] hover:bg-[#B3465B]/5",
      icon: PackageOpen,
    },
  },
  {
    id: "missed-tote",
    category: "result",
    variant: "missed",
    title: "น่าเสียดาย, มีผู้ได้รับสิทธิ์ชิ้นนี้ไปแล้ว",
    titleClassName: "text-foreground font-medium",
    subtitle: "กระเป๋าผ้าแคนวาส KU (KU Canvas Tote)",
    time: "เมื่อวาน",
    icon: Frown,
    iconWrapClassName: "bg-[#DAE2FD] saturate-50",
    iconClassName: "text-muted-foreground",
    accentClassName: "border border-border/20",
    dimmed: true,
    action: {
      label: "หาของแจกฟรีอื่นๆ",
      className: "bg-[#F4F6F8] text-foreground hover:bg-[#F4F6F8]/70",
    },
  },
  {
    id: "system-update",
    category: "system",
    variant: "system",
    title: "อัปเดตระบบ (System Update)",
    titleClassName: "text-foreground",
    subtitle:
      "ระบบจะปิดปรับปรุงชั่วคราวเพื่ออัปเดตฟีเจอร์ใหม่ ในวันที่ 15 พ.ย. เวลา 02:00 - 04:00 น.",
    time: "3 วันที่แล้ว",
    icon: Info,
    iconWrapClassName: "bg-[#FFBE3B]/20",
    iconClassName: "text-[#7C5800]",
    accentClassName: "border border-border/20",
    action: null,
  },
];

const FILTERS: { label: string; value: "all" | Category }[] = [
  { label: "ผลการแจกของ", value: "result" },
  { label: "ทั้งหมด", value: "all" },
  { label: "ระบบ", value: "system" },
];

export function NotificationFeed() {
  const [filter, setFilter] = useState<"all" | Category>("all");

  const visible =
    filter === "all"
      ? NOTIFICATIONS
      : NOTIFICATIONS.filter((n) => n.category === filter);

  return (
    <div className="flex flex-col gap-8">
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as "all" | Category)}
      >
        <TabsList className="h-auto w-fit gap-3 bg-transparent p-0">
          {FILTERS.map((f) => (
            <TabsTrigger
              key={f.value}
              value={f.value}
              className="h-10 rounded-full border border-border/30 bg-white px-4 text-sm font-medium tracking-[0.14px] text-muted-foreground data-active:border-transparent data-active:bg-[#2E8F5A] data-active:text-white data-active:shadow-card"
            >
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-4 rounded-3xl border border-border/30 bg-white p-6 shadow-card">
        {visible.map((notification) => {
          const Icon = notification.icon;
          return (
            <div
              key={notification.id}
              className={cn(
                "flex items-center gap-4 rounded-[20px] bg-[#FAF8FF] p-[17px] shadow-card",
                notification.accentClassName,
                notification.dimmed && "opacity-80"
              )}
            >
              <div
                className={cn(
                  "flex size-16 shrink-0 items-center justify-center rounded-xl",
                  notification.iconWrapClassName
                )}
              >
                <Icon className={cn("size-6", notification.iconClassName)} />
              </div>

              <div className="flex flex-1 flex-col gap-1">
                <h3
                  className={cn(
                    "text-lg leading-6 font-semibold",
                    notification.titleClassName
                  )}
                >
                  {notification.title}
                </h3>
                <p className="text-sm font-medium tracking-[0.14px] text-muted-foreground">
                  {notification.subtitle}
                </p>
                <span className="text-xs text-muted-foreground/70">
                  {notification.time}
                </span>
              </div>

              {notification.action ? (
                <Button
                  className={cn(
                    "h-10 shrink-0 gap-2 text-sm font-medium tracking-[0.14px]",
                    notification.action.className
                  )}
                >
                  {notification.action.icon && (
                    <notification.action.icon className="size-3.5" />
                  )}
                  {notification.action.label}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="More options"
                  className="size-10 shrink-0 text-muted-foreground hover:bg-[#F4F6F8]"
                >
                  <MoreVertical className="size-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          className="h-12 gap-2 px-6 text-sm font-medium tracking-[0.14px]"
        >
          โหลดเพิ่มเติม
          <ChevronDown className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
