"use client";

import { useState } from "react";
import Link from "next/link";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ITEM_CONDITIONS,
  ITEM_CONDITION_LABELS,
  REQUIRED_CATEGORY_FIELDS,
  type ItemCondition,
} from "@/lib/items";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/marketplace-products";
import { cn } from "@/lib/utils";

/** §2.1 — between one and five photos, no more. */
const MIN_PHOTOS = 1;
const MAX_PHOTOS = 5;

export interface ItemFormDefaults {
  name: string;
  category: ProductCategory | null;
  condition: ItemCondition | null;
  description: string;
  existingPhotoCount: number;
  subjectName: string;
  brandModel: string;
  hasWarranty: boolean;
  warrantyExpiry: string;
  size: string;
}

/**
 * §2.1–§2.2 — the item form, used both to create and to edit.
 *
 * Editing shares this form on purpose: §2.3.1 gives an unlisted item's owner
 * free rein over *every* field, so an edit screen with a narrower set of
 * inputs would silently be a different rule. The only difference is that an
 * existing item already has photos on file, so the 1-photo minimum can be met
 * without re-uploading.
 *
 * Two things the earlier version got wrong and this fixes: it asked for a
 * price (price is post data per §2.1, set later in /inventory/[id]/post), and
 * it skipped the per-category required fields in the §2.2 table.
 */
export function AddItemForm({
  mode = "create",
  defaults,
}: {
  mode?: "create" | "edit";
  defaults?: ItemFormDefaults;
}) {
  const [name, setName] = useState(defaults?.name ?? "");
  const [photos, setPhotos] = useState<File[]>([]);
  const [category, setCategory] = useState<ProductCategory | null>(
    defaults?.category ?? null
  );
  const [condition, setCondition] = useState<ItemCondition | null>(
    defaults?.condition ?? null
  );
  const [description, setDescription] = useState(defaults?.description ?? "");
  const [saved, setSaved] = useState(false);

  // §2.2 extras
  const [subjectName, setSubjectName] = useState(defaults?.subjectName ?? "");
  const [brandModel, setBrandModel] = useState(defaults?.brandModel ?? "");
  const [hasWarranty, setHasWarranty] = useState(defaults?.hasWarranty ?? false);
  const [warrantyExpiry, setWarrantyExpiry] = useState(
    defaults?.warrantyExpiry ?? ""
  );
  const [size, setSize] = useState(defaults?.size ?? "");

  const existingPhotoCount = defaults?.existingPhotoCount ?? 0;

  const requiredExtras: readonly string[] =
    category && category in REQUIRED_CATEGORY_FIELDS
      ? REQUIRED_CATEGORY_FIELDS[category as keyof typeof REQUIRED_CATEGORY_FIELDS]
      : [];

  const extrasFilled =
    (!requiredExtras.includes("subjectName") || subjectName.trim() !== "") &&
    (!requiredExtras.includes("brandModel") || brandModel.trim() !== "") &&
    // §2.2 — warranty is only required to carry a date when there IS one.
    (!requiredExtras.includes("warrantyStatus") || !hasWarranty || warrantyExpiry !== "") &&
    (!requiredExtras.includes("size") || size.trim() !== "");

  const canSubmit =
    name.trim() !== "" &&
    photos.length + existingPhotoCount >= MIN_PHOTOS &&
    category !== null &&
    condition !== null &&
    extrasFilled;

  return (
    <Card className="flex-col gap-6 rounded-2xl p-6 shadow-card ring-0 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {mode === "edit" ? "แก้ไขข้อมูลสินค้า" : "เพิ่มสินค้าเข้าคลัง"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {mode === "edit"
            ? "สินค้าที่ยังไม่ประกาศขายแก้ไขได้ทุกช่อง"
            : "ยังไม่ต้องตั้งราคาตอนนี้ — ราคาและเงื่อนไขแลกเปลี่ยนตั้งตอนสร้างโพสต์"}
        </p>
      </div>

      {existingPhotoCount > 0 && photos.length === 0 && (
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
          มีรูปเดิมอยู่ {existingPhotoCount} รูป — อัปโหลดใหม่เฉพาะเมื่อต้องการแทนที่
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">
          รูปภาพ ({photos.length}/{MAX_PHOTOS})
        </Label>

        <label
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
            photos.length >= MAX_PHOTOS
              ? "cursor-not-allowed border-border bg-surface-muted opacity-60"
              : "border-primary-light bg-primary-light/20 hover:bg-primary-light/40"
          )}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={photos.length >= MAX_PHOTOS}
            className="hidden"
            onChange={(event) =>
              setPhotos((previous) =>
                [...previous, ...Array.from(event.target.files ?? [])].slice(
                  0,
                  MAX_PHOTOS
                )
              )
            }
          />
          <ImagePlus className="mb-2 size-8 stroke-[1.75] text-primary-dark" />
          <span className="text-sm font-bold text-primary-dark">
            {photos.length >= MAX_PHOTOS ? "ครบ 5 รูปแล้ว" : "เพิ่มรูปภาพ"}
          </span>
          <span className="mt-0.5 text-[11px] text-muted-foreground">
            อย่างน้อย 1 รูป สูงสุด 5 รูป
          </span>
        </label>

        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((photo, index) => (
              <button
                key={`${photo.name}-${index}`}
                type="button"
                onClick={() =>
                  setPhotos((previous) => previous.filter((_, i) => i !== index))
                }
                className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs text-foreground hover:bg-error-bg hover:text-error"
              >
                <span className="max-w-32 truncate">{photo.name}</span>
                <X className="size-3 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name" className="text-xs font-semibold">
          ชื่อสินค้า
        </Label>
        <Input
          id="name"
          placeholder="เช่น หนังสือแคลคูลัส 1"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-11 rounded-xl border-border"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold">หมวดหมู่</Label>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_CATEGORIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              aria-pressed={category === option}
              className={cn(
                "rounded-full border px-4 py-2 text-xs transition-colors",
                category === option
                  ? "border-primary-dark bg-primary-dark text-white"
                  : "border-border text-muted-foreground hover:bg-surface-muted"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* §2.2 — the extra fields only three categories demand. */}
      {requiredExtras.includes("subjectName") && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="subject" className="text-xs font-semibold">
            ชื่อวิชา (บังคับ)
          </Label>
          <Input
            id="subject"
            value={subjectName}
            onChange={(event) => setSubjectName(event.target.value)}
            placeholder="เช่น 01417167 Engineering Mathematics I"
            className="h-11 rounded-xl border-border"
          />
          <p className="text-[11px] text-muted-foreground">
            พิมพ์ได้อิสระ ระบบไม่มีการแนะนำคำอัตโนมัติ
          </p>
        </div>
      )}

      {requiredExtras.includes("brandModel") && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand" className="text-xs font-semibold">
            ยี่ห้อ / รุ่น (บังคับ)
          </Label>
          <Input
            id="brand"
            value={brandModel}
            onChange={(event) => setBrandModel(event.target.value)}
            placeholder="เช่น Casio fx-991EX"
            className="h-11 rounded-xl border-border"
          />
        </div>
      )}

      {requiredExtras.includes("warrantyStatus") && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-muted p-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={hasWarranty}
              onChange={(event) => setHasWarranty(event.target.checked)}
              className="size-4 accent-[var(--primary-dark)]"
            />
            <span className="text-xs font-semibold text-foreground">
              ยังอยู่ในประกัน
            </span>
          </label>
          {hasWarranty && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="warranty" className="text-xs font-medium">
                วันหมดประกัน (บังคับเมื่อมีประกัน)
              </Label>
              <Input
                id="warranty"
                type="date"
                value={warrantyExpiry}
                onChange={(event) => setWarrantyExpiry(event.target.value)}
                className="h-11 rounded-xl border-border bg-white"
              />
            </div>
          )}
        </div>
      )}

      {requiredExtras.includes("size") && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="size" className="text-xs font-semibold">
            ไซส์ (บังคับ)
          </Label>
          <Input
            id="size"
            value={size}
            onChange={(event) => setSize(event.target.value)}
            placeholder="เช่น M หรือ 38"
            className="h-11 rounded-xl border-border"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold">สภาพสินค้า</Label>
        <div className="grid grid-cols-2 gap-2">
          {ITEM_CONDITIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCondition(option)}
              aria-pressed={condition === option}
              className={cn(
                "rounded-xl border p-3 text-xs transition-colors",
                condition === option
                  ? "border-primary bg-primary/5 font-semibold text-primary-dark"
                  : "border-border/40 text-muted-foreground hover:bg-surface-muted"
              )}
            >
              {ITEM_CONDITION_LABELS[option].th}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description" className="text-xs font-semibold">
          คำอธิบายเพิ่มเติม (ไม่บังคับ)
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="ตำหนิ ร่องรอยการใช้งาน หรือรายละเอียดอื่น"
          className="min-h-24 rounded-xl border-border"
        />
      </div>

      {saved && (
        <p className="rounded-2xl bg-primary-light/40 px-4 py-3 text-center text-sm text-primary-dark">
          บันทึกแล้ว
        </p>
      )}

      {/* TODO: POST a new item (starts unlisted per §2.3.1) or PATCH the
          existing one; the server re-checks the item is still unlisted and
          unlocked before accepting an edit. */}
      <Button
        disabled={!canSubmit}
        onClick={() => setSaved(true)}
        className="mt-2 h-12 w-full rounded-full bg-primary-dark text-sm font-semibold shadow-card"
      >
        {mode === "edit" ? "บันทึกการแก้ไข" : "บันทึกเข้าคลัง"}
      </Button>

      <Link
        href="/inventory"
        className="text-center text-sm text-muted-foreground hover:text-foreground"
      >
        ยกเลิก
      </Link>
    </Card>
  );
}
