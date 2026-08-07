import { notFound } from "next/navigation";

import { getGiveaways, getMyTickets, VIEWER_ID } from "@/lib/api/fixtures";

import { GiveawayDetail } from "./giveaway-detail";

export default async function GiveawayDetailPage({
  params,
}: {
  params: Promise<{ giveawayId: string }>;
}) {
  const { giveawayId } = await params;
  const [giveaways, tickets] = await Promise.all([
    getGiveaways(),
    getMyTickets(),
  ]);

  const giveaway = giveaways.find((g) => g.giveaway_id === Number(giveawayId));
  if (!giveaway) notFound();

  const ticket = tickets.find((t) => t.giveaway_id === giveaway.giveaway_id);

  return (
    <GiveawayDetail
      giveaway={giveaway}
      ticket={ticket}
      isGiver={giveaway.giver_id === VIEWER_ID}
    />
  );
}
