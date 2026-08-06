import Link from "next/link";
import { notFound } from "next/navigation";

import { GiveawayTicketCard } from "@/components/giveaway-ticket-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { CURRENT_USER_ID } from "@/lib/items";
import {
  TICKET_STATUS_LABELS,
  getTicket,
  isTicketUsable,
} from "@/lib/giveaway-tickets";

/**
 * §5.3 — the recipient opens their own ticket when it is time to collect.
 * §4.6.2: the ticket is created the moment the slot is won, but the code is
 * only rendered here, on demand.
 */
export default async function GiveawayTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const ticket = getTicket(ticketId);

  if (!ticket) notFound();

  // The ticket is personal (§4.6.4) — it is not viewable by anyone else.
  const isHolder = ticket.holderId === CURRENT_USER_ID;
  const usable = isTicketUsable(ticket);

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        {isHolder && usable ? (
          <GiveawayTicketCard
            ticketId={ticket.id}
            giveawayName={ticket.giveawayName}
            pickupBy={ticket.pickupBy}
            pickupPlace={ticket.pickupPlace}
          />
        ) : (
          <Card className="w-full max-w-[440px] flex-col items-center gap-3 rounded-3xl p-8 text-center shadow-elevated ring-0">
            <h1 className="text-xl font-semibold text-foreground">
              เปิดตั๋วนี้ไม่ได้
            </h1>
            <p className="text-sm text-muted-foreground">
              {!isHolder
                ? "ตั๋วรับของเป็นตั๋วเฉพาะบุคคล เปิดได้เฉพาะบัญชีที่ได้รับสิทธิ์เท่านั้น"
                : ticket.status === "awaiting-pickup"
                  ? "เลยกำหนดเวลารับของแล้ว สิทธิ์นี้หมดอายุ"
                  : `สถานะปัจจุบัน: ${TICKET_STATUS_LABELS[ticket.status].th}`}
            </p>
            <Link
              href="/giveaway/manager"
              className="text-sm font-medium text-primary-dark underline underline-offset-2"
            >
              กลับไปหน้ารายการของแจก
            </Link>
          </Card>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
