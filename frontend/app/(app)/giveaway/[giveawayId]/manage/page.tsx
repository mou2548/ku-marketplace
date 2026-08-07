import { notFound } from "next/navigation";

import { getEntrants, getGiveaways, VIEWER_ID } from "@/lib/api/fixtures";

import { ManageGiveaway } from "./manage-giveaway";

/**
 * E7, giver side. Flow 3 splits three ways at the draw: FirstCome and Random
 * are decided by the system, Manual is decided by a person. Only one of those
 * needs a screen, and this is it — but it also has to show the other two
 * honestly, so a giver who picked Random does not sit here waiting for a button
 * that will never be theirs to press.
 */
export default async function ManageGiveawayPage({
  params,
}: {
  params: Promise<{ giveawayId: string }>;
}) {
  const { giveawayId } = await params;
  const giveaways = await getGiveaways();
  const giveaway = giveaways.find((g) => g.giveaway_id === Number(giveawayId));
  if (!giveaway) notFound();
  if (giveaway.giver_id !== VIEWER_ID) notFound();

  const entrants = await getEntrants(giveaway.giveaway_id);
  return <ManageGiveaway giveaway={giveaway} entrants={entrants} />;
}
