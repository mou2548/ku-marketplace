import { notFound } from "next/navigation";

import { getGiveaway, getRecipients } from "@/lib/api/giveaways";
import { getMe } from "@/lib/api/users";
import { getAccessToken } from "@/lib/api/session";

import { ManageGiveaway } from "./manage-giveaway";

/**
 * E7, giver side. Flow 3 splits three ways at the draw: FirstCome and Random
 * are decided by the system, Manual is decided by a person — but every
 * method still needs a giver to scan the recipient's QR to close the
 * handover, and the scanner (`qr/scan`) accepts any allocation method. So
 * this page is open to all three; `ManageGiveaway` renders the entrant
 * picker only for Manual.
 *
 * `GET /giveaways/{id}/recipients` doubles as the entrant roster before the
 * giver has picked (everyone who joined is still `Waiting`) — see
 * `lib/api/giveaways.ts`'s `getRecipients` and api-gaps.md §8.
 */
export default async function ManageGiveawayPage({
  params,
}: {
  params: Promise<{ giveawayId: string }>;
}) {
  const { giveawayId } = await params;
  const id = Number(giveawayId);
  if (!Number.isInteger(id) || id < 1) notFound();

  if (!(await getAccessToken())) notFound();
  const viewer = await getMe().catch(() => undefined);
  if (!viewer) notFound();

  const giveaway = await getGiveaway(id).catch(() => undefined);
  if (!giveaway) notFound();
  if (giveaway.giver_id !== viewer.userId) notFound();

  const entrants = await getRecipients(id);
  return <ManageGiveaway giveaway={giveaway} entrants={entrants} />;
}
