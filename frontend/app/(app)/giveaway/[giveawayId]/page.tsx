import { notFound } from "next/navigation";

import { getMyTicket, getGiveaway } from "@/lib/api/giveaways";
import { getMe } from "@/lib/api/users";
import { getAccessToken } from "@/lib/api/session";

import { GiveawayDetail } from "./giveaway-detail";

export default async function GiveawayDetailPage({
  params,
}: {
  params: Promise<{ giveawayId: string }>;
}) {
  const { giveawayId } = await params;
  const id = Number(giveawayId);
  if (!Number.isInteger(id) || id < 1) notFound();

  let giveaway;
  try {
    giveaway = await getGiveaway(id);
  } catch {
    notFound();
  }

  const viewer = (await getAccessToken()) ? await getMe().catch(() => undefined) : undefined;
  const ticket = viewer ? await getMyTicket(id, giveaway, viewer.userId) : undefined;

  return (
    <GiveawayDetail
      giveaway={giveaway}
      ticket={ticket}
      isGiver={viewer ? giveaway.giver_id === viewer.userId : false}
    />
  );
}
