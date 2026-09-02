import { redirect } from "next/navigation";

import { getAccessToken } from "@/lib/api/session";
import { getMe, toUser } from "@/lib/api/users";

import { EditProfileForm } from "./edit-form";

export const metadata = { title: "Edit profile - KU Marketplace" };

/**
 * The mobile destination. `/account` shows this inline from `lg` up.
 *
 * The form used to hardcode `useState("ปลาย")` and the literal
 * "Praiy Srisuk · b6512345@ku.th", so this screen and `/account` showed two
 * different people. It reads the row now — for real, via `GET /users/me`.
 */
export default async function EditProfilePage() {
  if (!(await getAccessToken())) {
    redirect("/login");
  }
  const profile = toUser(await getMe());
  return <EditProfileForm profile={profile} />;
}
