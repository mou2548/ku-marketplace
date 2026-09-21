import { redirect } from "next/navigation";

import { getMembership } from "@/lib/api/membership";
import { getAccessToken } from "@/lib/api/session";

import { MembershipScreen } from "./membership-screen";

export const metadata = { title: "Membership - KU Marketplace" };

export default async function MembershipPage() {
  if (!(await getAccessToken())) {
    redirect("/login");
  }

  const membership = await getMembership();
  return <MembershipScreen membership={membership} />;
}
