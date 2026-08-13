import { notFound } from "next/navigation";

import { getMyTickets } from "@/lib/api/fixtures";

import { TicketScreen } from "./ticket-screen";

/**
 * E7 receiver side. Research risk R8 lives here: the QR rotates every 15
 * minutes, which is a security control the receiver never asked for. If it
 * expires mid-handover it reads as a bug, so the ring, the silent refresh, and
 * the one-line explanation are all load-bearing.
 */
export default async function TicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const tickets = await getMyTickets();
  const ticket = tickets.find((t) => t.ticket_id === Number(ticketId));
  if (!ticket) notFound();

  return <TicketScreen ticket={ticket} />;
}
