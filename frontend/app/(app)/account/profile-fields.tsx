"use client";

import { useState } from "react";

import { EditableField } from "@/components/kit/editable-field";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import { updateProfile } from "@/lib/actions/account";
import type { UpdateProfilePayload } from "@/lib/api/users";
import type { User } from "@/lib/api/types";

/**
 * The profile, editable a line at a time.
 *
 * Desktop only — `/account` renders this from `lg` up and keeps the link out to
 * `/account/edit` below it. A wide screen has room to show the whole profile
 * and change one field in place; a phone does not, and a full-width form behind
 * a modal keyboard is the better shape there.
 *
 * Only three columns are writable. `first_name_en`, `last_name_en` and `email`
 * come from the Nontri system and are the anchor that makes impersonation hard,
 * so they are shown and locked rather than hidden. `faculty` and `year` are
 * shown too, but they exist in no table at all — see docs/design/api-gaps.md —
 * so they cannot be offered for editing.
 */
export function ProfileFields({
  profile,
  faculty,
  year,
}: {
  profile: User;
  faculty?: string | null;
  year?: number | null;
}) {
  const toast = useToast();
  const [firstNameTh, setFirstNameTh] = useState(profile.first_name_th);
  const [lastNameTh, setLastNameTh] = useState(profile.last_name_th);
  const [phone, setPhone] = useState(profile.phone_number ?? "");

  async function save(patch: UpdateProfilePayload, what: string, apply: () => void) {
    try {
      await updateProfile(patch);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not save ${what.toLowerCase()}`);
      return;
    }
    apply();
    toast.success(`${what} saved`);
  }

  const facultyLine = [faculty, year ? `Year ${year}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Surface as="section" shape="card" className="px-5 py-1">
      <EditableField
        label="First name (Thai)"
        value={firstNameTh}
        onSave={(v) => save({ first_name_th: v }, "First name", () => setFirstNameTh(v))}
      />
      <EditableField
        label="Last name (Thai)"
        value={lastNameTh}
        onSave={(v) => save({ last_name_th: v }, "Last name", () => setLastNameTh(v))}
      />
      <EditableField
        label="Phone number"
        value={phone}
        placeholder="Not set"
        inputMode="tel"
        sanitise={(v) => v.replace(/[^\d-]/g, "")}
        onSave={(v) => save({ phone_number: v }, "Phone number", () => setPhone(v))}
      />
      <EditableField
        label="Name (English)"
        value={`${profile.first_name_en} ${profile.last_name_en}`}
        isLocked
        lockedReason="From the university"
      />
      <EditableField
        label="KU email"
        value={profile.email}
        isLocked
        lockedReason="From the university"
      />
      {facultyLine ? (
        <EditableField
          label="Faculty"
          value={facultyLine}
          isLocked
          lockedReason="From the university"
        />
      ) : null}
    </Surface>
  );
}
