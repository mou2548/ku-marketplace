import Link from "next/link";
import { CheckCircle2, Clock, TimerOff, UserMinus } from "lucide-react";

import { GiveawayRequestTabs } from "@/components/giveaway-request-tabs";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TICKET_STATUS_LABELS,
  ticketSummary,
  ticketsHeldBy,
  ticketsIssuedBy,
  type TicketStatus,
} from "@/lib/giveaway-tickets";
import { CURRENT_USER_ID } from "@/lib/items";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  TicketStatus,
  { icon: typeof Clock; className: string }
> = {
  "awaiting-pickup": { icon: Clock, className: "bg-warning-bg text-warning-dark" },
  received: { icon: CheckCircle2, className: "bg-primary-light text-primary-dark" },
  forfeited: { icon: UserMinus, className: "bg-surface-muted text-muted-foreground" },
  expired: { icon: TimerOff, className: "bg-error-bg text-error" },
};

const STATUS_ORDER: TicketStatus[] = [
  "awaiting-pickup",
  "received",
  "forfeited",
  "expired",
];

/**
 * §5.5 — the giver must be able to see the status of every recipient at all
 * times, across exactly these four states. §5.4 is why "expired" is terminal
 * rather than a hand-off: the slot is never rolled over to a runner-up,
 * because someone told at the last minute cannot make it either.
 */
export default function GiveawayManagerPage() {
  const issued = ticketsIssuedBy(CURRENT_USER_ID);
  const held = ticketsHeldBy(CURRENT_USER_ID);
  const summary = ticketSummary(issued);

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 justify-center px-6 py-8">
        <div className="flex w-full max-w-[1200px] flex-col gap-8">
          <PageHeader
            title="จัดการของแจก"
            subtitle="สถานะของผู้ได้รับสิทธิ์ในโพสต์ของคุณ และตั๋วรับของที่คุณถืออยู่"
          />

          {issued.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">
                ผู้ได้รับสิทธิ์ในโพสต์ของคุณ
              </h2>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {STATUS_ORDER.map((status) => {
                  const meta = STATUS_META[status];
                  return (
                    <Card
                      key={status}
                      className="flex-col items-center gap-1 rounded-2xl p-4 text-center shadow-card ring-0"
                    >
                      <meta.icon className="size-5 text-muted-foreground" />
                      <span className="text-2xl font-semibold text-primary-dark">
                        {summary[status]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {TICKET_STATUS_LABELS[status].th}
                      </span>
                    </Card>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3">
                {issued.map((ticket) => {
                  const meta = STATUS_META[ticket.status];
                  return (
                    <Card
                      key={ticket.id}
                      className="flex-row flex-wrap items-center justify-between gap-3 rounded-2xl p-4 shadow-card ring-0"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">
                          {ticket.holderName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ticket.giveawayName} • นัดรับ {ticket.pickupPlace}
                        </span>
                      </div>

                      <Badge
                        className={cn(
                          "h-auto shrink-0 gap-1.5 px-3 py-1 text-xs whitespace-nowrap",
                          meta.className
                        )}
                      >
                        <meta.icon className="size-3.5" />
                        {TICKET_STATUS_LABELS[ticket.status].th}
                      </Badge>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {held.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">
                ตั๋วรับของของคุณ
              </h2>
              <div className="flex flex-col gap-3">
                {held.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="flex-row flex-wrap items-center justify-between gap-3 rounded-2xl p-4 shadow-card ring-0"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground">
                        {ticket.giveawayName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ticket.pickupPlace} • ถึง{" "}
                        {new Date(ticket.pickupBy).toLocaleString("th-TH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>

                    {ticket.status === "awaiting-pickup" ? (
                      <Link
                        href={`/giveaway/ticket/${ticket.id}`}
                        className={cn(
                          buttonVariants(),
                          "h-10 shrink-0 bg-primary-dark px-5 text-sm"
                        )}
                      >
                        เปิดตั๋ว QR
                      </Link>
                    ) : (
                      <Badge className="h-auto shrink-0 bg-surface-muted px-3 py-1 text-xs text-muted-foreground">
                        {TICKET_STATUS_LABELS[ticket.status].th}
                      </Badge>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              คำขอรับของที่คุณลงทะเบียนไว้
            </h2>
            <GiveawayRequestTabs />
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
