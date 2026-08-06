"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Plus, ShoppingBag, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { POST_MODE_LABELS, type PostMode } from "@/lib/posts";
import { cn } from "@/lib/utils";

/**
 * §3.1 — turning an inventory item into a marketplace post.
 *
 * This is the step the app was missing entirely: price and exchange terms are
 * post data (§2.1), and the three post shapes decide which buttons a viewer
 * gets (§3.1.1–§3.1.3). Sell-only carries a price and no offer button;
 * swap-only carries wants and no price; both shows the two side by side.
 */
const MODE_META: {
  value: PostMode;
  icon: typeof ShoppingBag;
  detail: string;
}[] = [
  {
    value: "buy",
    icon: ShoppingBag,
    detail: "แสดงเฉพาะปุ่มซื้อทันทีในราคาที่กำหนด ไม่รับข้อเสนอแลกเปลี่ยน",
  },
  {
    value: "swap",
    icon: ArrowLeftRight,
    detail: "แสดงเฉพาะปุ่มยื่นข้อเสนอแลกเปลี่ยน ไม่มีราคาให้ซื้อ",
  },
  {
    value: "both",
    icon: Sparkles,
    detail: "ผู้สนใจเลือกได้ว่าจะซื้อทันทีตามราคา หรือยื่นสินค้ามาแลก",
  },
];

export function CreatePostForm({
  itemId,
  itemName,
}: {
  itemId: string;
  itemName: string;
}) {
  const [mode, setMode] = useState<PostMode | null>(null);
  const [price, setPrice] = useState("");
  const [wants, setWants] = useState<string[]>([]);
  const [wantDraft, setWantDraft] = useState("");
  const [posted, setPosted] = useState(false);

  const needsPrice = mode === "buy" || mode === "both";
  const acceptsSwap = mode === "swap" || mode === "both";
  const priceValue = Number(price);
  const canSubmit =
    mode !== null && (!needsPrice || (price.trim() !== "" && priceValue > 0));

  function addWant() {
    const value = wantDraft.trim();
    if (value === "" || wants.includes(value)) return;
    setWants((previous) => [...previous, value]);
    setWantDraft("");
  }

  if (posted) {
    return (
      <Card className="w-full flex-col items-center gap-4 rounded-3xl p-8 text-center shadow-card ring-0">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary-light">
          <Sparkles className="size-7 text-primary-dark" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">
            ประกาศขายแล้ว
          </h2>
          <p className="text-sm text-muted-foreground">
            {itemName} เปลี่ยนเป็นสถานะ Listed และปรากฏในหน้าตลาดแล้ว
          </p>
        </div>
        {/* §2.3.2 — a listed item can still be offered to other people's posts
            and the post can be withdrawn to go back to unlisted. */}
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
          สินค้าที่ประกาศขายแล้วยังนำไปยื่นข้อเสนอกับโพสต์อื่นได้พร้อมกัน
          และถอนโพสต์กลับเป็น Unlisted ได้ทุกเมื่อ
        </p>
        <div className="flex w-full gap-3">
          <Link
            href="/inventory"
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted"
          >
            กลับไปคลังสินค้า
          </Link>
          <Link
            href="/marketplace"
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-primary-dark text-sm font-medium text-white"
          >
            ดูในหน้าตลาด
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full flex-col gap-6 rounded-3xl p-6 shadow-card ring-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-foreground">
          ตั้งเงื่อนไขการประกาศ
        </h2>
        <p className="text-sm text-muted-foreground">
          ราคาและเงื่อนไขแลกเปลี่ยนผูกกับโพสต์ ไม่ใช่ตัวสินค้า
          สินค้าชิ้นเดิมจึงตั้งเงื่อนไขต่างกันได้ในแต่ละครั้ง
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-semibold">รูปแบบโพสต์</Label>
        <div className="flex flex-col gap-2">
          {MODE_META.map((option) => {
            const selected = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                aria-pressed={selected}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border/40 bg-white hover:bg-surface-muted"
                )}
              >
                <option.icon
                  className={cn(
                    "mt-0.5 size-5 shrink-0",
                    selected ? "text-primary-dark" : "text-muted-foreground"
                  )}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {POST_MODE_LABELS[option.value].th}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {option.detail}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {needsPrice && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="price" className="text-sm font-semibold">
            ราคา (บาท)
          </Label>
          <Input
            id="price"
            type="number"
            inputMode="numeric"
            min={1}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="เช่น 650"
            className="h-12 rounded-xl bg-surface-muted"
          />
          {/* §8.1 — worth repeating wherever money is named. */}
          <p className="text-xs text-muted-foreground">
            ผู้ซื้อโอนเงินให้คุณโดยตรง แพลตฟอร์มไม่รับฝากเงินและไม่หักค่าธรรมเนียม
          </p>
        </div>
      )}

      {acceptsSwap && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="want" className="text-sm font-semibold">
            อยากแลกกับอะไร (ไม่บังคับ)
          </Label>
          <div className="flex gap-2">
            <Input
              id="want"
              value={wantDraft}
              onChange={(event) => setWantDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addWant();
                }
              }}
              placeholder="เช่น เครื่องคิดเลข Casio"
              className="h-12 flex-1 rounded-xl bg-surface-muted"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addWant}
              aria-label="เพิ่มรายการที่อยากแลก"
              className="h-12 bg-white"
            >
              <Plus className="size-4" />
            </Button>
          </div>
          {wants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {wants.map((want) => (
                <button
                  key={want}
                  type="button"
                  onClick={() =>
                    setWants((previous) => previous.filter((entry) => entry !== want))
                  }
                  className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs text-foreground hover:bg-error-bg hover:text-error"
                >
                  {want}
                  <X className="size-3" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TODO: POST the new post; the server creates it and flips the item to
          listed (§2.3.2). */}
      <Button
        disabled={!canSubmit}
        onClick={() => setPosted(true)}
        className="h-12 w-full bg-primary-dark"
      >
        ประกาศขาย
      </Button>

      <Link
        href={`/inventory?item=${itemId}`}
        className="text-center text-sm text-muted-foreground hover:text-foreground"
      >
        ยกเลิก
      </Link>
    </Card>
  );
}
