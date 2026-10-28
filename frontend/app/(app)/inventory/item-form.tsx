"use client";

import { getCopy } from "@/lib/copy";
import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  parseDate,
  type DateValue,
} from "@internationalized/date";
import { ImagePlus, Save, Trash2, X } from "lucide-react";

import { ActionBar } from "@/components/kit/action-bar";
import { Button } from "@/components/kit/button";
import {
  Radio,
  RadioGroupField,
  SelectField,
  SelectOption,
} from "@/components/kit/choice";
import { ConfirmButton } from "@/components/kit/confirm-button";
import { DatePickerField } from "@/components/kit/date-picker";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { PostImage } from "@/components/kit/post-image";
import { Surface } from "@/components/kit/surface";
import { TwoColumn } from "@/components/kit/two-column";
import { useToast } from "@/components/kit/toast";
import { useStatusText } from "@/lib/status-text";
import { unwrapAction } from "@/lib/action-result";
import { removeItem, saveItemEdits, saveNewItem } from "@/lib/actions/items";
import { uploadFile } from "@/lib/actions/uploads";
import type { ItemPayload } from "@/lib/api/items";
import type { Item, ItemCategory } from "@/lib/api/types";
import { CATEGORY_OPTIONS, hasExtraField } from "@/lib/categories";
import { ITEM_CONDITION, type ItemCondition } from "@/lib/status";

interface Photo {
  key: string;
  /** Present for a newly picked file, still local, not yet uploaded. */
  file?: File;
  previewUrl: string;
}

/**
 * Best first, worst last — the order the rarity ramp runs in, so the colour of
 * the border a student is choosing goes one way down the list.
 *
 * Four grades, not five: the real `Item.condition` column is
 * `CHECK IN ('New', 'Good', 'Acceptable', 'Poor')` (`init.sql`) — `'Very
 * Good'` exists in `lib/status.ts`'s `ItemCondition` because seed *display*
 * data used it before this screen posted to a real backend, but submitting it
 * here fails the database constraint. Not offered as a choice.
 */
const CONDITION_ORDER: ItemCondition[] = ["New", "Good", "Acceptable", "Poor"];

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
  const t = getCopy();
  const st = useStatusText();
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
  const [photos, setPhotos] = useState<Photo[]>(
    item?.images.map((i) => ({
      key: `existing-${i.image_id}`,
      previewUrl: i.image_url,
    })) ?? [],
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
    try {
      // New photos are still local `File`s (blob preview only) — upload each
      // to get a real hosted URL before the item itself can reference it.
      const images = await Promise.all(
        photos.map(async (p, i) => ({
          image_url: p.file ? await unwrapAction(uploadFile(p.file)) : p.previewUrl,
          is_primary: i === 0,
          display_order: i,
        })),
      );

      const payload: ItemPayload = {
        name: name.trim(),
        category,
        condition,
        quantity: Number(quantity) || 1,
        description: description.trim() || undefined,
        course_name: needsCourse ? courseName.trim() || undefined : undefined,
        brand_model: needsBrand ? brandModel.trim() || undefined : undefined,
        warranty_expiry: needsWarranty && warranty ? warranty.toString() : undefined,
        size: needsSize ? size.trim() || undefined : undefined,
        images,
      };

      if (mode === "create") {
        await unwrapAction(saveNewItem(payload));
      } else if (item) {
        await unwrapAction(saveItemEdits(item.item_id, payload));
      }
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Could not save item");
      return;
    }
    setBusy(false);
    toast.success(mode === "create" ? "Item added to your inventory" : "Changes saved");
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
    <Surface shape="panel" className="flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
        <PostImage
          src={photos[0]?.previewUrl}
          alt={name.trim() || "Untitled item"}
          aspectRatio={4 / 3}
          sizes="320px"
          className="h-full"
        />
        <span
          aria-hidden
          style={{ "--slot-edge": ITEM_CONDITION[condition].edge } as React.CSSProperties}
          className="absolute inset-x-0 bottom-0 h-1 bg-[var(--slot-edge)]"
        />
      </div>

      <div className="flex flex-col gap-3 p-5">
        <p className="text-overline font-semibold text-ink-brand uppercase">
          {t("inventory.inYourStash")}
        </p>
        <p className="text-h3">{name.trim() || "Untitled item"}</p>
        <span
          style={
            {
              "--slot-edge": ITEM_CONDITION[condition].fg,
              "--slot-glow": ITEM_CONDITION[condition].glow,
            } as React.CSSProperties
          }
          className="w-fit rounded-pill bg-[var(--slot-glow)] px-2.5 py-1 text-meta font-medium text-[var(--slot-edge)]"
        >
          {st.of(ITEM_CONDITION[condition]).label}
        </span>

        <dl className="flex flex-col gap-2 border-t border-line pt-3 text-caption">
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">{t("inventory.category")}</dt>
          <dd>{category}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">{t("inventory.condition")}</dt>
          <dd>{st.of(ITEM_CONDITION[condition]).label}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">{t("inventory.quantity")}</dt>
          <dd data-numeric>{quantity || "1"}</dd>
        </div>
        </dl>
      </div>
    </Surface>
  );

  return (
    <TwoColumn rail={preview}>
      <header>
        <p className="text-overline font-semibold text-ink-brand uppercase">
          {t("inventory.myStuff")}
        </p>
        <h1 className="mt-1 text-h1">
          {mode === "create" ? t("inventory.addItem") : t("inventory.editDetails")}
        </h1>
      </header>

      {/* Photos first: it is the fastest field to fill and the one that makes
          the rest feel worth doing. */}
      <Surface shape="card" className="flex flex-col gap-3 p-4">
        <p className="text-body-sm font-medium text-ink-secondary">{t("inventory.photos")}<span className="ml-1 font-normal text-ink-muted">
            the first one is the cover
          </span>
        </p>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <div
              key={p.key}
              className="relative aspect-square overflow-hidden rounded-slot bg-surface-sunken shadow-sunken"
            >
              {/* `fill` with no `sizes` makes next/image emit sizes="100vw",
                  so a thumbnail in a four-column grid downloads a full-width
                  image on every device. */}
              <Image
                src={p.previewUrl}
                alt=""
                fill
                sizes="(min-width: 768px) 25vw, 33vw"
                className="object-cover"
              />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() =>
                  setPhotos((list) => list.filter((x) => x.key !== p.key))
                }
                // The smallest control in the product at 24px, sitting in a photo corner
                // where a thumb has the least room. touch-target lifts the hit area
                // to 44px on a phone without growing the drawn circle.
                className="touch-target absolute top-1 right-1 grid size-7 place-items-center rounded-pill bg-surface-inverse/80 text-white"
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
            <span className="sr-only">{t("inventory.addPhotos")}</span>
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
            setPhotos((list) => [
              ...list,
              ...files.map((f) => ({
                key: `new-${f.name}-${f.lastModified}-${Math.random()}`,
                file: f,
                previewUrl: URL.createObjectURL(f),
              })),
            ]);
          }}
        />
      </Surface>

      <Surface shape="panel" className="flex flex-col gap-5 p-4 sm:p-5">
        <h2 className="text-h3">{t("market.productInfo")}</h2>
        <TextInput
          className="max-w-2xl"
          label={t("inventory.itemName")}
          value={name}
          onChange={setName}
          isRequired
          placeholder={t("inventory.itemNamePlaceholder")}
        />

      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <SelectField
          label={t("inventory.category")}
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
          label={t("inventory.quantity")}
          value={quantity}
          onChange={(v) => setQuantity(v.replace(/\D/g, ""))}
          inputMode="numeric"
        />
      </div>

      {needsCourse ? (
        <TextInput
          className="max-w-2xl"
          label={t("inventory.courseCode")}
          value={courseName}
          onChange={setCourseName}
          placeholder="e.g. 01417111"
          hint={t("inventory.courseHint")}
        />
      ) : null}

      {needsBrand ? (
        <TextInput
          label={t("inventory.brandModel")}
          value={brandModel}
          onChange={setBrandModel}
          placeholder={t("inventory.brandPlaceholder")}
        />
      ) : null}

      {needsWarranty ? (
        <DatePickerField
          label={t("inventory.warranty")}
          value={warranty}
          onChange={setWarranty}
          hint={t("inventory.warrantyHint")}
        />
      ) : null}

        {needsSize ? (
          <TextInput
            label={t("inventory.size")}
            value={size}
            onChange={setSize}
            placeholder={t("inventory.sizePlaceholder")}
            hint={t("inventory.sizeHint")}
          />
        ) : null}
      </Surface>

      {/* Rendered from the map rather than hand-written, which is how this
          form came to offer four grades while the market filtered on five —
          "Very Good" was missing, and it is the grade the seed uses most. */}
      <RadioGroupField
        label={t("inventory.condition")}
        value={condition}
        onChange={(v) => setCondition(v as ItemCondition)}
        variant="card"
        hint={t("inventory.conditionHint")}
      >
        {CONDITION_ORDER.map((value) => (
          <Radio key={value} value={value} description={CONDITION_HINT[value]}>
            {st.of(ITEM_CONDITION[value]).label}
          </Radio>
        ))}
      </RadioGroupField>

      <TextAreaField
        className="max-w-2xl"
        label={t("inventory.details")}
        value={description}
        onChange={setDescription}
        placeholder={t("inventory.descHint")}
        rows={5}
      />

      {mode === "edit" && item ? (
        <div className="flex justify-end">
          <ConfirmButton
            title="Delete this item?"
            description="This removes it from your inventory for good. Only possible while nothing of it is committed to a listing or a giveaway — unlist everything first if this is blocked."
            confirmLabel="Delete item"
            doneMessage="Item deleted."
            icon={<Trash2 className="size-4" />}
            onConfirm={() => unwrapAction(removeItem(item.item_id))}
            onDone={() => router.push("/inventory")}
            trigger={
              <>
                <Trash2 className="size-4" />
                Delete item
              </>
            }
            triggerProps={{ variant: "ghost", size: "sm" }}
          />
        </div>
      ) : null}

      <ActionBar>
        <Button
          variant="secondary"
          block
          onPress={() => router.back()}
          isDisabled={busy}
        >{t("inventory.cancel")}</Button>
        <Button block size="lg" isDisabled={!canSave} isLoading={busy} onPress={save}>
          <Save className="size-5" />
          {mode === "create" ? "Add to inventory" : "Save"}
        </Button>
      </ActionBar>
    </TwoColumn>
  );
}
