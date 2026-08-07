import { getMembership } from "@/lib/api/fixtures";

import { MembershipScreen } from "./membership-screen";

export const metadata = { title: "Membership - KU Marketplace" };

export default async function MembershipPage() {
  const membership = await getMembership();
  return <MembershipScreen membership={membership} />;
}
