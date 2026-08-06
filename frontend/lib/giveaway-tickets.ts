/**
 * Giveaway allocation and pickup tickets — proposal §5.
 *
 * §5.1 keeps giveaways completely separate from the personal inventory (§2):
 * the giver types the item in on the post form, nothing enters a locker, and
 * no status machine from §2.3 applies here.
 *
 * The QR direction is the mirror of a sale, and §4.6 explains why. In a sale
 * the fact to prove is "the goods reached the buyer", so the buyer scans. In a
 * giveaway the fact to prove is "the person collecting is the one entitled",
 * so the ticket belongs to the recipient and the GIVER scans it. A giver with
 * many recipients would otherwise have to refresh their own code after every
 * single pickup, since tokens are single-use (§4.6.1).
 */

/** §5.5 — the four states a giver must be able to see at any time. */
export type TicketStatus =
  | "awaiting-pickup"
  | "received"
  /** §5.4 — the recipient gave the slot up themselves. */
  | "forfeited"
  /** §5.4 — the pickup window closed. Never rolls over to a runner-up. */
  | "expired";

export const TICKET_STATUS_LABELS: Record<
  TicketStatus,
  { th: string; en: string }
> = {
  "awaiting-pickup": { th: "รอมารับ", en: "Awaiting pickup" },
  received: { th: "รับแล้ว", en: "Received" },
  forfeited: { th: "สละสิทธิ์เอง", en: "Forfeited" },
  expired: { th: "หมดเวลาไม่มารับ", en: "Expired" },
};

export interface GiveawayTicket {
  id: string;
  giveawayId: string;
  giveawayName: string;
  /** The account entitled to collect — §4.6.4 checks the scanner against this. */
  holderId: string;
  holderName: string;
  giverId: string;
  /** §5.3 — the giver's collection window. */
  pickupBy: string;
  pickupPlace: string;
  status: TicketStatus;
  issuedAt: string;
}

// TODO: replace with the real tickets from the API
export const GIVEAWAY_TICKETS: GiveawayTicket[] = [
  {
    id: "ticket-1",
    giveawayId: "vintage-canon-ae1",
    giveawayName: "Vintage Canon AE-1 Program",
    holderId: "user-me",
    holderName: "Mike R.",
    giverId: "user-ploy",
    pickupBy: "2026-08-08T17:00:00+07:00",
    pickupPlace: "โรงอาหารกลาง บางเขน",
    status: "awaiting-pickup",
    issuedAt: "2026-08-06T09:00:00+07:00",
  },
  {
    id: "ticket-2",
    giveawayId: "desk-succulent",
    giveawayName: "Desk Succulent",
    holderId: "user-siriwan",
    holderName: "Siriwan K.",
    giverId: "user-me",
    pickupBy: "2026-08-07T18:00:00+07:00",
    pickupPlace: "หน้าคณะวิศวกรรมศาสตร์",
    status: "awaiting-pickup",
    issuedAt: "2026-08-06T10:00:00+07:00",
  },
  {
    id: "ticket-3",
    giveawayId: "desk-succulent",
    giveawayName: "Desk Succulent",
    holderId: "user-kritsada",
    holderName: "Kritsada P.",
    giverId: "user-me",
    pickupBy: "2026-08-07T18:00:00+07:00",
    pickupPlace: "หน้าคณะวิศวกรรมศาสตร์",
    status: "received",
    issuedAt: "2026-08-05T10:00:00+07:00",
  },
  {
    id: "ticket-4",
    giveawayId: "desk-succulent",
    giveawayName: "Desk Succulent",
    holderId: "user-anan",
    holderName: "Anan W.",
    giverId: "user-me",
    pickupBy: "2026-08-05T18:00:00+07:00",
    pickupPlace: "หน้าคณะวิศวกรรมศาสตร์",
    status: "forfeited",
    issuedAt: "2026-08-04T10:00:00+07:00",
  },
  {
    id: "ticket-5",
    giveawayId: "desk-succulent",
    giveawayName: "Desk Succulent",
    holderId: "user-warisara",
    holderName: "Warisara P.",
    giverId: "user-me",
    pickupBy: "2026-08-04T18:00:00+07:00",
    pickupPlace: "หน้าคณะวิศวกรรมศาสตร์",
    status: "expired",
    issuedAt: "2026-08-03T10:00:00+07:00",
  },
];

export function getTicket(ticketId: string): GiveawayTicket | undefined {
  return GIVEAWAY_TICKETS.find((ticket) => ticket.id === ticketId);
}

export function ticketsIssuedBy(giverId: string): GiveawayTicket[] {
  return GIVEAWAY_TICKETS.filter((ticket) => ticket.giverId === giverId);
}

export function ticketsHeldBy(holderId: string): GiveawayTicket[] {
  return GIVEAWAY_TICKETS.filter((ticket) => ticket.holderId === holderId);
}

/**
 * §5.3/§5.4 — a ticket is only good inside the giver's window. Note this is
 * the *right*, not the token: §4.6.6's 15-minute expiry applies to the code on
 * screen, and refreshing it does not extend or shorten anything here.
 */
export function isTicketUsable(
  ticket: GiveawayTicket,
  now: Date = new Date()
): boolean {
  return (
    ticket.status === "awaiting-pickup" && now <= new Date(ticket.pickupBy)
  );
}

/** §5.5 — the counts the giver's summary screen is required to show. */
export function ticketSummary(tickets: GiveawayTicket[]): Record<TicketStatus, number> {
  return tickets.reduce(
    (totals, ticket) => ({ ...totals, [ticket.status]: totals[ticket.status] + 1 }),
    {
      "awaiting-pickup": 0,
      received: 0,
      forfeited: 0,
      expired: 0,
    } as Record<TicketStatus, number>
  );
}
