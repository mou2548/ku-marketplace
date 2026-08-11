import { getViewerProfile } from "@/lib/api/fixtures";

import { EditProfileForm } from "./edit-form";

export const metadata = { title: "Edit profile - KU Marketplace" };

/**
 * The mobile destination. `/account` shows this inline from `lg` up.
 *
 * The form used to hardcode `useState("ปลาย")` and the literal
 * "Praiy Srisuk · b6512345@ku.th", so this screen and `/account` showed two
 * different people. It reads the row now.
 */
export default async function EditProfilePage() {
  const profile = await getViewerProfile();
  return <EditProfileForm profile={profile} />;
}
