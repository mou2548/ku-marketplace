import { notFound } from "next/navigation";

import { getGiveaway, getMyTicket } from "@/lib/api/giveaways";
import { getMe } from "@/lib/api/users";
import { getAccessToken } from "@/lib/api/session";

import { TicketScreen } from "./ticket-screen";

/**
 * E7 receiver side. Research risk R8 lives here: the QR rotates every 15
 * minutes, which is a security control the receiver never asked for.
 *
 * There is no `GET` for a single ticket in the spec — only
 * `GET /giveaways/{id}/recipients`, which is why the route carries both ids
 * and `getMyTicket` re-derives this ticket from that list
 * (docs/design/api-gaps.md §8). A forfeited or expired ticket drops out of
 * that list entirely, so it 404s here rather than showing a stale
 * "ready to collect" state.
 */
export default async function TicketPage({
  params,
}: {
  params: Promise<{ giveawayId: string; ticketId: string }>;
}) {
  const { giveawayId, ticketId } = await params;
  const gId = Number(giveawayId);
  const tId = Number(ticketId);
  if (!Number.isInteger(gId) || !Number.isInteger(tId)) notFound();

  if (!(await getAccessToken())) notFound();
  const viewer = await getMe().catch(() => undefined);
  if (!viewer) notFound();

  const giveaway = await getGiveaway(gId).catch(() => undefined);
  if (!giveaway) notFound();

  const ticket = await getMyTicket(gId, giveaway, viewer.userId);
  if (!ticket || ticket.ticket_id !== tId) notFound();

  return <TicketScreen ticket={ticket} />;
}
