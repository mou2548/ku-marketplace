import { notFound } from "next/navigation";

import { getEntrants, getGiveaways, VIEWER_ID } from "@/lib/api/fixtures";

import { ManageGiveaway } from "./manage-giveaway";

/**
 * E7, giver side. Flow 3 splits three ways at the draw: FirstCome and Random
 * are decided by the system, Manual is decided by a person. Only one of those
 * needs a screen, and this is it.
 *
 * The other two used to land here as well and were handed a "Run the draw now"
 * button, which is nonsense for first come, first served — the places were
 * already allocated as people registered. The route now belongs to Manual
 * alone; the detail page tells the other two givers what is happening instead.
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
  if (giveaway.allocation_method !== "Manual") notFound();

  const entrants = await getEntrants(giveaway.giveaway_id);
  return <ManageGiveaway giveaway={giveaway} entrants={entrants} />;
}
