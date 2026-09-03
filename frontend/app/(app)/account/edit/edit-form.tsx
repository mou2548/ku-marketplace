"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Save } from "lucide-react";

import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import { Notice } from "@/components/patterns/notice";
import { useToast } from "@/components/kit/toast";
import { updateProfile } from "@/lib/actions/account";
import type { User } from "@/lib/api/types";
import { TrustBadge } from "@/components/kit/trust-badge";
import { TwoColumn } from "@/components/kit/two-column";

/**
 * Trust gap T1 again, from the other side. The English name comes from the
 * institutional email and cannot be edited, because it is the anchor that makes
 * impersonation hard. That is a restriction, so the screen says why rather than
 * just greying the field out.
 */
export function EditProfileForm({ profile }: { profile: User }) {
  const router = useRouter();
  const toast = useToast();
  const [firstNameTh, setFirstNameTh] = useState(profile.first_name_th);
  const [lastNameTh, setLastNameTh] = useState(profile.last_name_th);
  const [phone, setPhone] = useState(profile.phone_number ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await updateProfile({
        first_name_th: firstNameTh,
        last_name_th: lastNameTh,
        phone_number: phone || undefined,
      });
    } catch (err) {
      setBusy(false);
      toast.show(err instanceof Error ? err.message : "Could not save profile");
      return;
    }
    setBusy(false);
    toast.show("Profile saved");
    router.push("/account");
  }

  /**
   * What the edit is for, live. The Thai name is the only thing on this form
   * another student ever sees, and until now you typed it blind — the form sat
   * alone in a 42% column with the rest of the window empty.
   */
  const preview = (
    <Surface shape="card" className="flex flex-col gap-4 p-5">
      <p className="text-overline text-ink-muted uppercase">How you appear</p>
      <TrustBadge
        size="lg"
        name={
          `${firstNameTh} ${lastNameTh}`.trim() ||
          `${profile.first_name_en} ${profile.last_name_en}`
        }
        faculty="Engineering"
        year={3}
      />
      <p className="text-caption leading-[1.6] text-ink-muted">
        This is the name and badge shown on your posts, your offers, and every
        chat room you are in.
      </p>
    </Surface>
  );

  return (
    <TwoColumn rail={preview}>
      <Link
        href="/account"
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to account
      </Link>

      <h1 className="text-h1">Edit profile</h1>

      <Notice tone="neutral" className="flex max-w-3xl gap-3">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
        <div className="flex flex-col gap-1">
          <p className="text-body-sm font-medium">
            {profile.first_name_en} {profile.last_name_en} · {profile.email}
          </p>
          <p className="text-caption leading-[1.6] text-ink-muted">
            Your English name and email come from the university system and are
            locked. They are what lets another student trust that you are who
            you say you are.
          </p>
        </div>
      </Notice>

      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
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
        className="max-w-xl"
        label="Phone number"
        value={phone}
        onChange={(v) => setPhone(v.replace(/[^\d-]/g, ""))}
        inputMode="tel"
        placeholder="08x-xxx-xxxx"
        hint="A backup way to reach you. There is no SMS verification, and it is never shown publicly."
      />

      <div className="flex max-w-xl flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onPress={() => router.back()}>
          Cancel
        </Button>
        <Button isLoading={busy} onPress={save}>
          <Save className="size-4" />
          Save
        </Button>
      </div>
    </TwoColumn>
  );
}
