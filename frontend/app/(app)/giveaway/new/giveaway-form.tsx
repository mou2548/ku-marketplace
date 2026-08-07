"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import { Gift, MapPin } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Radio, RadioGroupField } from "@/components/kit/choice";
import { DatePickerField } from "@/components/kit/date-picker";
import { TextAreaField, TextInput } from "@/components/kit/field";
import { useToast } from "@/components/kit/toast";
import { ALLOCATION_METHOD, type AllocationMethod } from "@/lib/status";

/**
 * E7 giver side.
 *
 * The allocation method is a radio card set, not a dropdown, because the three
 * options carry three different social contracts and the giver is choosing on
 * behalf of everyone who will register (research R7). Manual is the only one
 * that leaves work for the giver later, and it says so.
 */
export function GiveawayForm() {
  const router = useRouter();
  const toast = useToast();
  const tz = getLocalTimeZone();

  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const [method, setMethod] = useState<AllocationMethod>("Random");
  const [closeAt, setCloseAt] = useState<DateValue | null>(
    today(tz).add({ days: 2 }),
  );
  const [pickupFrom, setPickupFrom] = useState<DateValue | null>(
    today(tz).add({ days: 2 }),
  );
  const [pickupTo, setPickupTo] = useState<DateValue | null>(
    today(tz).add({ days: 5 }),
  );
  const [busy, setBusy] = useState(false);

  const canPost =
    itemName.trim().length > 0 && place.trim().length > 0 && !!closeAt;

  async function publish() {
    setBusy(true);
    // POST /giveaways
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show("Giveaway posted");
    router.push("/giveaway");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
        Give something away
      </h1>

      <TextInput
        label="What are you giving away"
        value={itemName}
        onChange={setItemName}
        isRequired
        placeholder="e.g. Faculty shirt, size M"
      />

      <TextAreaField
        label="Details"
        value={description}
        onChange={setDescription}
        rows={3}
        placeholder="What condition is it in, why are you giving it away, any conditions?"
      />

      <TextInput
        label="Pickup location"
        value={place}
        onChange={setPlace}
        isRequired
        icon={<MapPin className="size-4" />}
        placeholder="e.g. Outside Engineering Building 1"
      />

      <RadioGroupField
        label="How will recipients be chosen"
        value={method}
        onChange={(v) => setMethod(v as AllocationMethod)}
        variant="card"
        hint="This is shown on the post before anyone registers"
      >
        <Radio value="Random" description={ALLOCATION_METHOD.Random.hint}>
          {ALLOCATION_METHOD.Random.label}
        </Radio>
        <Radio value="FirstCome" description={ALLOCATION_METHOD.FirstCome.hint}>
          {ALLOCATION_METHOD.FirstCome.label}
        </Radio>
        <Radio
          value="Manual"
          description="You come back and pick recipients yourself. The other two are handled for you."
        >
          {ALLOCATION_METHOD.Manual.label}
        </Radio>
      </RadioGroupField>

      <DatePickerField
        label="Registration closes"
        value={closeAt}
        onChange={setCloseAt}
        minValue={today(tz)}
        hint="At this point recipients are chosen by the method above and a chat room opens for them"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <DatePickerField
          label="Pickup opens"
          value={pickupFrom}
          onChange={setPickupFrom}
          minValue={closeAt ?? today(tz)}
        />
        <DatePickerField
          label="Pickup closes"
          value={pickupTo}
          onChange={setPickupTo}
          minValue={pickupFrom ?? today(tz)}
        />
      </div>

      <p className="rounded-control bg-tone-warning-bg p-3 text-[0.8125rem] leading-[1.6] text-tone-warning-fg">
        Recipients who do not collect within this window lose their ticket automatically.
      </p>

      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[20] flex gap-2 lg:static">
        <Button variant="secondary" block onPress={() => router.back()}>
          Cancel
        </Button>
        <Button
          block
          size="lg"
          isDisabled={!canPost}
          isLoading={busy}
          onPress={publish}
        >
          <Gift className="size-5" />
          Post giveaway
        </Button>
      </div>
    </div>
  );
}
