import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldAlert, ShieldCheck } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TicketScanPanel } from "@/components/ticket-scan-panel";
import { Card } from "@/components/ui/card";
import {
  TICKET_STATUS_LABELS,
  getTicket,
  isTicketUsable,
} from "@/lib/giveaway-tickets";
import { CURRENT_USER_ID } from "@/lib/items";

/**
 * §4.6.4, giveaway direction — where the recipient's ticket QR lands after the
 * GIVER scans it.
 *
 * The entitlement check is the mirror of the sale flow: there the scanner must
 * be the trade's buyer, here the scanner must be the giveaway's owner. Anyone
 * else — including the ticket holder scanning their own code — changes nothing.
 */
export default async function TicketScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { ticketId } = await params;
  const { token } = await searchParams;
  const ticket = getTicket(ticketId);

  if (!ticket) notFound();

  // TODO: compare against the real session user, not the mock constant.
  const isGiver = ticket.giverId === CURRENT_USER_ID;
  const hasToken = Boolean(token);
  const usable = isTicketUsable(ticket);

  const blockedReason = !isGiver
    ? "บัญชีที่เข้าสู่ระบบอยู่ไม่ใช่เจ้าของโพสต์แจกของนี้ จึงยืนยันการรับของแทนไม่ได้"
    : !hasToken
      ? "ลิงก์นี้ไม่มีโทเคนยืนยัน ให้ผู้รับเปิดหน้าตั๋วใหม่แล้วสแกนอีกครั้ง"
      : !usable
        ? ticket.status === "awaiting-pickup"
          ? "เลยกำหนดเวลารับของแล้ว ตั๋วนี้หมดอายุ"
          : `ตั๋วนี้ใช้ไม่ได้แล้ว (${TICKET_STATUS_LABELS[ticket.status].th})`
        : null;

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-6 py-8">
        <Card className="flex-col items-center gap-5 rounded-3xl p-6 text-center shadow-card ring-0">
          {blockedReason ? (
            <>
              <div className="flex size-14 items-center justify-center rounded-full bg-error-bg">
                <ShieldAlert className="size-7 text-error" />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold text-foreground">
                  ยืนยันการรับของไม่ได้
                </h1>
                <p className="text-sm text-muted-foreground">{blockedReason}</p>
              </div>
              <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
                ไม่มีสถานะใดถูกเปลี่ยนแปลงจากการสแกนครั้งนี้
              </p>
              <Link
                href="/giveaway/manager"
                className="text-sm font-medium text-primary-dark underline underline-offset-2"
              >
                กลับไปหน้าจัดการของแจก
              </Link>
            </>
          ) : (
            <>
              <div className="flex size-14 items-center justify-center rounded-full bg-primary-light">
                <ShieldCheck className="size-7 text-primary-dark" />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold text-foreground">
                  ตรวจสอบสิทธิ์ผ่านแล้ว
                </h1>
                <p className="text-sm text-muted-foreground">
                  {ticket.holderName} เป็นผู้ได้รับสิทธิ์ตัวจริงของ{" "}
                  {ticket.giveawayName}
                </p>
              </div>

              <TicketScanPanel
                ticketId={ticket.id}
                holderName={ticket.holderName}
              />
            </>
          )}
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
