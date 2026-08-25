"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  parseDate,
  type DateValue,
} from "@internationalized/date";
import { ArrowLeft, ImagePlus, Save, X } from "lucide-react";

import { Button } from "@/components/kit/button";
import {
  Radio,
  RadioGroupField,
  SelectField,
  SelectOption,
} from "@/components/kit/choice";
import { DatePickerField } from "@/components/kit/date-picker";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { PostImage } from "@/components/kit/post-image";
import { Surface } from "@/components/kit/surface";
import { TwoColumn } from "@/components/kit/two-column";
import { useToast } from "@/components/kit/toast";
import type { Item, ItemCategory } from "@/lib/api/types";
import { CATEGORY_OPTIONS, hasExtraField } from "@/lib/categories";
import { ITEM_CONDITION, type ItemCondition } from "@/lib/status";

/**
 * Best first, worst last — the order the rarity ramp runs in, so the colour of
 * the border a student is choosing goes one way down the list.
 */
const CONDITION_ORDER: ItemCondition[] = [
  "New",
  "Very Good",
  "Good",
  "Acceptable",
  "Poor",
];

/** What each grade means, in the words a seller has to be honest in. */
const CONDITION_HINT: Record<ItemCondition, string> = {
  New: "Never used, tags or seal still on",
  "Very Good": "Used a handful of times, nothing you would point out",
  Good: "Used, works perfectly, no visible damage",
  Acceptable: "Works fine, but clearly shows its use",
  Poor: "Has faults worth declaring: cracks, noise, missing parts",
};

/**
 * One form, two modes. Create and edit differ only in their starting values and
 * their verb — duplicating the form would guarantee the two drift apart, which
 * is what happened in the old app (`inventory/add` and `inventory/[id]/edit`
 * had diverged field sets).
 *
 * Condition uses description-carrying radio cards rather than a dropdown: a
 * student choosing between "Good" and "Acceptable" needs the definitions in front
 * of them, and honest condition data is what keeps the rarity border on the
 * slot meaningful.
 */
export function ItemForm({
  mode,
  item,
}: {
  mode: "create" | "edit";
  item?: Item;
}) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<ItemCategory>(
    item?.category ?? "Books",
  );
  const [condition, setCondition] = useState<ItemCondition>(
    item?.condition ?? "Good",
  );
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [description, setDescription] = useState(item?.description ?? "");
  const [courseName, setCourseName] = useState(item?.course_name ?? "");
  const [brandModel, setBrandModel] = useState(item?.brand_model ?? "");
  const [size, setSize] = useState(item?.size ?? "");
  const [warranty, setWarranty] = useState<DateValue | null>(
    item?.warranty_expiry ? parseDate(item.warranty_expiry.slice(0, 10)) : null,
  );
  const [previews, setPreviews] = useState<string[]>(
    item?.images.map((i) => i.image_url) ?? [],
  );
  const [busy, setBusy] = useState(false);

  // Category-specific fields, per the schema's optional columns (lib/categories.ts).
  // Showing all of them all the time is how a six-field form becomes a
  // ten-field wall; showing none of them, which is what the previous
  // lowercase-slug comparison did against a picker that emits "Books", is
  // worse — a shirt could not record its size at all.
  const needsCourse = hasExtraField(category, "course_name");
  const needsBrand = hasExtraField(category, "brand_model");
  const needsWarranty = hasExtraField(category, "warranty_expiry");
  const needsSize = hasExtraField(category, "size");

  const canSave = name.trim().length > 0 && Number(quantity) > 0;

  async function save() {
    setBusy(true);
    // POST /items  or  PATCH /items/{item_id}
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show(mode === "create" ? "Item added to your inventory" : "Changes saved");
    router.push("/inventory");
  }

  /**
   * The item as it will look in the stash, updating as you type.
   *
   * The form was a capped column with no rail, so at 1600 it used 44% of the
   * window and left 896px of grey — the widest dead band in the product. The
   * preview is the same answer `/account/edit` and `/inventory/[id]/list`
   * already use: real state, no invented content, and it happens to be the one
   * thing worth seeing while filling this form in.
   */
  const preview = (
    <Surface shape="card" className="flex w-full max-w-md flex-col gap-3 p-5 mx-auto">
      <p className="text-overline text-ink-muted uppercase">In your stash</p>

      <span
        style={
          {
            "--slot-edge": ITEM_CONDITION[condition].edge,
          } as React.CSSProperties
        }
        className="block w-full overflow-hidden rounded-slot ring-2 ring-[var(--slot-edge)]"
      >
        {/* PostImage shrinks itself to a short 16:7 plate when there is no
            photo yet (right, for a feed card — a card with nothing to show
            should not leave a tall gap) and only takes the square
            `aspectRatio` once a photo lands. Here that swap reads as the
            whole preview card jumping size as you add the first photo, so
            the square is forced regardless of which state PostImage is in. */}
        <PostImage
          src={previews[0]}
          alt=""
          aspectRatio={1}
          sizes="320px"
          className="!aspect-square"
        />
      </span>

      <p className="font-semibold">{name.trim() || "Untitled item"}</p>

      <dl className="flex flex-col gap-2 border-t border-line pt-3 text-[0.8125rem]">
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">Category</dt>
          <dd>{category}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">Condition</dt>
          <dd>{ITEM_CONDITION[condition].label}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">Quantity</dt>
          <dd data-numeric>{quantity || "1"}</dd>
        </div>
      </dl>

      <p className="border-t border-line pt-3 text-[0.75rem] leading-[1.6] text-ink-muted">
        The border colour is the condition. It is how the item reads at a glance
        everywhere it appears.
      </p>
    </Surface>
  );

  return (
    <TwoColumn rail={preview} columns="minmax(0,1fr) minmax(0,1fr)">
      <Link
        href={mode === "create" ? "/inventory" : `/inventory/${item?.item_id}`}
        className="flex w-fit items-center gap-1.5 text-[0.875rem] font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {mode === "create" ? "Back to my stuff" : "Back to item"}
      </Link>

      <h1 className="text-h1">
        {mode === "create" ? "Add an item" : "Edit details"}
      </h1>

      {/* Photos first: it is the fastest field to fill and the one that makes
          the rest feel worth doing. */}
      <Surface shape="card" className="flex flex-col gap-3 p-4">
        <p className="text-[0.875rem] font-medium text-ink-secondary">
          Photos
          <span className="ml-1 font-normal text-ink-muted">
            the first one is the cover
          </span>
        </p>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previews.map((src, i) => (
            <div
              key={src}
              className="relative aspect-square overflow-hidden rounded-slot bg-surface-sunken shadow-sunken"
            >
              <Image src={src} alt="" fill className="object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() =>
                  setPreviews((list) => list.filter((s) => s !== src))
                }
                className="absolute top-1 right-1 grid size-6 place-items-center rounded-pill bg-surface-inverse/80 text-white"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid aspect-square place-items-center rounded-slot border-2 border-dashed border-line-default bg-surface-sunken text-ink-muted transition-colors hover:border-brand hover:text-ink-brand"
          >
            <ImagePlus aria-hidden className="size-5" />
            <span className="sr-only">Add photos</span>
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            setPreviews((list) => [
              ...list,
              ...files.map((f) => URL.createObjectURL(f)),
            ]);
          }}
        />
      </Surface>

      <TextInput
        label="Item name"
        value={name}
        onChange={setName}
        isRequired
        placeholder="e.g. Calculus textbook, volume 1"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Category"
          selectedKey={category}
          onSelectionChange={(k) => setCategory(k as ItemCategory)}
        >
          {CATEGORY_OPTIONS.map((c) => (
            <SelectOption key={c} id={c} textValue={c}>
              {c}
            </SelectOption>
          ))}
        </SelectField>

        <TextInput
          label="Quantity"
          value={quantity}
          onChange={(v) => setQuantity(v.replace(/\D/g, ""))}
          inputMode="numeric"
        />
      </div>

      {needsCourse ? (
        <TextInput
          label="Course code"
          value={courseName}
          onChange={setCourseName}
          placeholder="e.g. 01417111"
          hint="Most people search by course code. Adding it makes this far easier to find."
        />
      ) : null}

      {needsBrand ? (
        <TextInput
          label="Brand and model"
          value={brandModel}
          onChange={setBrandModel}
          placeholder="e.g. Keychron K2"
        />
      ) : null}

      {needsWarranty ? (
        <DatePickerField
          label="Warranty expires"
          value={warranty}
          onChange={setWarranty}
          hint="Leave empty if it is out of warranty or never had one"
        />
      ) : null}

      {needsSize ? (
        <TextInput
          label="Size"
          value={size}
          onChange={setSize}
          placeholder="e.g. M, 42, or 15 inch"
          hint="Whatever the label says. This is the question every buyer asks first."
        />
      ) : null}

      {/* Rendered from the map rather than hand-written, which is how this
          form came to offer four grades while the market filtered on five —
          "Very Good" was missing, and it is the grade the seed uses most. */}
      <RadioGroupField
        label="Condition"
        value={condition}
        onChange={(v) => setCondition(v as ItemCondition)}
        variant="card"
        hint="Condition shows as the border colour of the item, in your inventory and in the market. Be honest and the meetup goes smoothly."
      >
        {CONDITION_ORDER.map((value) => (
          <Radio key={value} value={value} description={CONDITION_HINT[value]}>
            {ITEM_CONDITION[value].label}
          </Radio>
        ))}
      </RadioGroupField>

      <TextAreaField
        label="Details"
        value={description}
        onChange={setDescription}
        placeholder="Say honestly how long you have had it, what is wrong with it, and anything the next owner should know"
        rows={5}
      />

      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[20] flex gap-2 lg:static">
        <Button
          variant="secondary"
          block
          onPress={() => router.back()}
          isDisabled={busy}
        >
          Cancel
        </Button>
        <Button block size="lg" isDisabled={!canSave} isLoading={busy} onPress={save}>
          <Save className="size-5" />
          {mode === "create" ? "Add to inventory" : "Save"}
        </Button>
      </div>
    </TwoColumn>
  );
}
