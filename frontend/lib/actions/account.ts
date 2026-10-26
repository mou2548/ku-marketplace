"use server";

import { clearSession, getAccessToken } from "@/lib/api/session";
import { deleteMe, updateMe, type Profile, type UpdateProfilePayload } from "@/lib/api/users";

/**
 * Plain async actions, not the `useActionState` `(prevState, formData)` shape
 * used by `lib/actions/auth.ts` — both call sites (`edit-form.tsx`'s
 * single-button save, `profile-fields.tsx`'s per-field autosave) already
 * manage their own busy/toast state and call these directly, the same way
 * they called the `setTimeout` placeholders they replace. Neither wants this
 * action to redirect: `profile-fields.tsx` never navigates away from
 * `/account`, so a server-side redirect here would fight the caller in the one
 * case that does.
 */
export async function updateProfile(patch: UpdateProfilePayload): Promise<Profile> {
  if (!(await getAccessToken())) {
    throw new Error("Not signed in");
  }
  return updateMe(patch);
}

export async function deleteAccount(): Promise<void> {
  if (!(await getAccessToken())) {
    throw new Error("Not signed in");
  }
  await deleteMe();
  await clearSession();
}
