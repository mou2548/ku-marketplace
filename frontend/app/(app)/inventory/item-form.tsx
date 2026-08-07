"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Save, X } from "lucide-react";

import { Button } from "@/components/kit/button";
import {
  Radio,
  RadioGroupField,
  SelectField,
  SelectOption,
} from "@/components/kit/choice";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import type { Item, ItemCategory } from "@/lib/api/types";
import { ITEM_CONDITION, type ItemCondition } from "@/lib/status";

/**
 * Suggestions, not a closed taxonomy: `init.sql` stores readable category
 * names and the design document lists different slugs. The field accepts what
 * the database already contains.
 */
const CATEGORY_OPTIONS = [
  "Books",
  "Clothing",
  "Electronics",
  "Home & Living",
  "Bags",
  "Vehicles",
  "Sports",
  "Stationery",
  "Tickets",
  "Other",
];

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
  const [previews, setPreviews] = useState<string[]>(
    item?.images.map((i) => i.image_url) ?? [],
  );
  const [busy, setBusy] = useState(false);

  // Category-specific fields, per the schema's optional columns. Showing all of
  // them all the time is how a six-field form becomes a ten-field wall.
  const needsCourse = category === "books" || category === "stationery";
  const needsBrand = category === "electronics" || category === "specialized";
  const needsSize = category === "clothing";

  const canSave = name.trim().length > 0 && Number(quantity) > 0;

  async function save() {
    setBusy(true);
    // POST /items  or  PATCH /items/{item_id}
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show(mode === "create" ? "Item added to your inventory" : "Changes saved");
    router.push("/inventory");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
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

      {needsSize ? (
        <TextInput label="Size" value={size} onChange={setSize} placeholder="M" />
      ) : null}

      <RadioGroupField
        label="Condition"
        value={condition}
        onChange={(v) => setCondition(v as ItemCondition)}
        variant="card"
        hint="Condition shows as the border colour of the item, in your inventory and in the market. Be honest and the meetup goes smoothly."
      >
        <Radio value="New" description="Never used, tags or seal still on">
          {ITEM_CONDITION.New.label}
        </Radio>
        <Radio value="Good" description="Used, works perfectly, no visible damage">
          {ITEM_CONDITION.Good.label}
        </Radio>
        <Radio value="Acceptable" description="Works fine, but clearly shows its use">
          {ITEM_CONDITION.Acceptable.label}
        </Radio>
        <Radio value="Poor" description="Has faults worth declaring: cracks, noise, missing parts">
          {ITEM_CONDITION.Poor.label}
        </Radio>
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
    </div>
  );
}
