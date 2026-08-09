"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Save } from "lucide-react";

import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";

/**
 * Trust gap T1 again, from the other side. The English name comes from the
 * institutional email and cannot be edited, because it is the anchor that makes
 * impersonation hard. That is a restriction, so the screen says why rather than
 * just greying the field out.
 */
export default function EditProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [firstNameTh, setFirstNameTh] = useState("ปลาย");
  const [lastNameTh, setLastNameTh] = useState("ศรีสุข");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    // PATCH /users/me
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show("Profile saved");
    router.push("/account");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
        Edit profile
      </h1>

      <Surface shape="card" elevation="flat" className="flex gap-3 bg-gray-100 border-l-4 border-l-line-strong p-4">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
        <div className="flex flex-col gap-1">
          <p className="text-[0.875rem] font-medium">
            Praiy Srisuk · b6512345@ku.th
          </p>
          <p className="text-[0.8125rem] leading-[1.6] text-ink-muted">
            Your English name and email come from the university system and are
            locked. They are what lets another student trust that you are who
            you say you are.
          </p>
        </div>
      </Surface>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="First name (Thai)"
          value={firstNameTh}
          onChange={setFirstNameTh}
        />
        <TextInput
          label="Last name (Thai)"
          value={lastNameTh}
          onChange={setLastNameTh}
        />
      </div>

      <TextInput
        label="Phone number"
        value={phone}
        onChange={(v) => setPhone(v.replace(/[^\d-]/g, ""))}
        inputMode="tel"
        placeholder="08x-xxx-xxxx"
        hint="A backup way to reach you. There is no SMS verification, and it is never shown publicly."
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onPress={() => router.back()}>
          Cancel
        </Button>
        <Button isLoading={busy} onPress={save}>
          <Save className="size-4" />
          Save
        </Button>
      </div>
    </div>
  );
}
