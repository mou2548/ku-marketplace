"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Gift, ImagePlus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  GIVEAWAY_REQUEST_TYPE_META,
  type GiveawayRequestType,
} from "@/lib/giveaway-items";

// TODO: replace with the real category list from the API
const CATEGORIES = [
  "Education",
  "Electronics",
  "Stationery",
  "Clothing",
  "Dorm Essentials",
  "Other",
];

/** Copy for the distribution-method picker — the core decision on this page. */
const METHODS: {
  value: GiveawayRequestType;
  title: string;
  summary: string;
  detail: string;
  badgeClass: string;
}[] = [
  {
    value: "first-come",
    title: "ใครขอก่อนได้ก่อน",
    summary: "First-come, First-served",
    detail: "ระบบจัดคิวอัตโนมัติ คนที่กดขอคนแรกได้เลย เหมาะกับของที่มีหลายชิ้น",
    badgeClass: "bg-[#FFBE3B]/20 text-[#6F4E00]",
  },
  {
    value: "random",
    title: "สุ่มผู้โชคดี",
    summary: "Random Draw",
    detail: "เปิดให้ลงทะเบียนตามเวลาที่กำหนด แล้วระบบสุ่มผู้ได้รับ ยุติธรรมกับทุกคน",
    badgeClass: "bg-[#FFB2BA]/30 text-[#7C2A39]",
  },
  {
    value: "manual",
    title: "เลือกผู้รับเอง",
    summary: "Manual Selection",
    detail: "อ่านเหตุผลของผู้ขอแล้วเลือกเอง เหมาะกับของที่อยากให้คนที่จำเป็นจริงๆ",
    badgeClass: "bg-primary-light text-primary-dark",
  },
];

export default function NewGiveawayPage() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<GiveawayRequestType | null>(null);
  const [drawClosesIn, setDrawClosesIn] = useState("");
  const [itemsAvailable, setItemsAvailable] = useState("");
  const [pickup, setPickup] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const selectedMethod = METHODS.find((m) => m.value === method);
  const methodMeta = method ? GIVEAWAY_REQUEST_TYPE_META[method] : null;
  const canSubmit = name.trim() !== "" && description.trim() !== "" && method !== null;

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
        <PageHeader
          title="โพสต์แจกของ (Post a Giveaway)"
          subtitle="ส่งต่อของที่ไม่ได้ใช้ให้เพื่อน ๆ ในมหาวิทยาลัย เลือกวิธีแจกที่เหมาะกับของของคุณ"
        />

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <Card className="flex-col gap-6 rounded-3xl p-6 shadow-elevated ring-0 lg:col-span-7 lg:p-8">
            <div className="flex flex-col gap-3">
              <Label className="text-sm font-semibold">รูปของ (Photo)</Label>
              <label className="relative flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary-light bg-primary-light/20 p-8 text-center transition-colors hover:bg-primary-light/40">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setPhoto(file ? URL.createObjectURL(file) : null);
                  }}
                />
                {photo ? (
                  <Image
                    src={photo}
                    alt="Selected item"
                    width={480}
                    height={270}
                    unoptimized
                    className="h-40 w-full rounded-xl object-cover"
                  />
                ) : (
                  <>
                    <ImagePlus className="mb-2 size-8 stroke-[1.75] text-primary-dark" />
                    <span className="text-sm font-bold text-primary-dark">
                      เพิ่มรูปของ
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">
                      PNG หรือ JPG — รูปชัด ๆ ช่วยให้มีคนสนใจมากขึ้น
                    </span>
                  </>
                )}
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="item-name" className="text-sm font-semibold">
                ชื่อของ (Item name)
              </Label>
              <Input
                id="item-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="เช่น หนังสือเรียนแคลคูลัส 1"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">หมวดหมู่ (Category)</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm transition-colors",
                      c === category
                        ? "border-primary-dark bg-primary-dark text-white"
                        : "border-border bg-white text-foreground hover:bg-surface-muted"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="item-description" className="text-sm font-semibold">
                รายละเอียด (Description)
              </Label>
              <Textarea
                id="item-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="สภาพของ เหตุผลที่แจก และเงื่อนไขการรับ..."
                className="min-h-[110px] resize-none"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-sm font-semibold">
                  วิธีแจกของ (How recipients are chosen)
                </Label>
                <p className="text-xs text-muted-foreground">
                  เลือกได้แบบเดียว — เปลี่ยนภายหลังไม่ได้เมื่อมีคนลงทะเบียนแล้ว
                </p>
              </div>

              {METHODS.map((m) => {
                const Icon = GIVEAWAY_REQUEST_TYPE_META[m.value].icon;
                const selected = method === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-start gap-4 rounded-2xl border p-4 text-left transition-colors",
                      selected
                        ? "border-2 border-primary-dark bg-primary-light/30"
                        : "border-border/50 bg-white hover:bg-surface-muted/40"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl",
                        selected
                          ? "bg-primary-dark text-white"
                          : "bg-surface-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-5" />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {m.title}
                        </span>
                        <Badge
                          className={cn("h-auto px-2 py-0.5 text-[11px]", m.badgeClass)}
                        >
                          {m.summary}
                        </Badge>
                      </div>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {m.detail}
                      </span>
                    </div>

                    {selected && (
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-dark text-white">
                        <Check className="size-3.5" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Extra field only the chosen method needs */}
            {method === "random" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="draw-closes" className="text-sm font-semibold">
                  ปิดรับลงทะเบียนใน (Draw closes in)
                </Label>
                <Input
                  id="draw-closes"
                  value={drawClosesIn}
                  onChange={(event) => setDrawClosesIn(event.target.value)}
                  placeholder="เช่น 02วัน 14ชม."
                  className="h-11 rounded-xl"
                />
              </div>
            )}

            {method === "first-come" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="items-available" className="text-sm font-semibold">
                  จำนวนที่แจก (Items available)
                </Label>
                <Input
                  id="items-available"
                  value={itemsAvailable}
                  onChange={(event) => setItemsAvailable(event.target.value)}
                  placeholder="เช่น 1 unit"
                  className="h-11 rounded-xl"
                />
              </div>
            )}

            {method === "manual" && (
              <p className="rounded-2xl bg-surface-muted p-4 text-xs leading-relaxed text-muted-foreground">
                ผู้ขอจะเขียนเหตุผลมาให้คุณอ่าน แล้วคุณเลือกผู้รับเองได้จากหน้า{" "}
                <span className="font-medium text-foreground">My Giveaway Requests</span>
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="pickup" className="text-sm font-semibold">
                จุดนัดรับ (Pickup location)
              </Label>
              <Input
                id="pickup"
                value={pickup}
                onChange={(event) => setPickup(event.target.value)}
                placeholder="เช่น ล็อคเกอร์คณะวิศวกรรมศาสตร์"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-border/20 pt-6 sm:flex-row">
              <Link
                href="/giveaway"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-12 w-full sm:flex-1"
                )}
              >
                ยกเลิก
              </Link>
              {/* TODO: POST to the API — for now this just returns to the manager list */}
              <Link
                href="/giveaway/manager"
                aria-disabled={!canSubmit}
                tabIndex={canSubmit ? undefined : -1}
                className={cn(
                  buttonVariants(),
                  "h-12 w-full gap-2 sm:flex-1",
                  !canSubmit && "pointer-events-none opacity-50"
                )}
              >
                <Gift className="size-4" />
                โพสต์แจกของ
              </Link>
            </div>
            {!canSubmit && (
              <p className="-mt-2 text-center text-xs text-muted-foreground">
                กรอกชื่อของ รายละเอียด และเลือกวิธีแจก เพื่อโพสต์ได้
              </p>
            )}
          </Card>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <h2 className="text-base font-bold text-foreground">
              ตัวอย่างการ์ด (Preview)
            </h2>

            <article className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-card">
              <div className="relative h-[240px] w-full bg-surface-muted">
                {photo ? (
                  <Image src={photo} alt="Preview" fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground/40">
                    <ImagePlus className="size-12 stroke-[1.25]" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between gap-6 p-6">
                <div className="flex flex-col gap-2">
                  {methodMeta && selectedMethod ? (
                    <Badge
                      className={cn(
                        "h-auto w-fit px-3 py-1",
                        selectedMethod.badgeClass
                      )}
                    >
                      {methodMeta.label}
                    </Badge>
                  ) : (
                    <Badge className="h-auto w-fit bg-surface-muted px-3 py-1 text-muted-foreground">
                      ยังไม่เลือกวิธีแจก
                    </Badge>
                  )}
                  <h3 className="line-clamp-2 min-h-[56px] text-lg text-foreground">
                    {name.trim() || "ชื่อของจะแสดงตรงนี้"}
                  </h3>
                </div>
                <span
                  className={cn(
                    buttonVariants(),
                    "pointer-events-none h-12 w-full text-base opacity-70"
                  )}
                >
                  Request Item
                </span>
              </div>
            </article>

            <p className="text-xs leading-relaxed text-muted-foreground">
              การ์ดนี้คือสิ่งที่เพื่อน ๆ จะเห็นในหน้า Giveaway
              {pickup.trim() && <> • นัดรับที่ {pickup.trim()}</>}
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
