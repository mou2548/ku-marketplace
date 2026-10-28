import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { deriveAppointmentView } from "@/lib/appointment";
import { getAppointmentCards } from "@/lib/api/chat";
import { getCurrentUserId } from "@/lib/api/session";
import { getTransaction } from "@/lib/api/transactions";

import { DealQr } from "./deal-qr";

/**
 * The Meetup handover, seller side. Full screen, no chrome — design principle
 * 7: this is the moment the whole transaction exists for, and a QR competing
 * with a nav bar in daylight is a QR that does not scan.
 */
export default async function DealQrPage({
  params,
}: {
  params: Promise<{ txId: string }>;
}) {
  const { txId } = await params;
  if (!(await getCurrentUserId())) redirect("/login");

  const [tx, cards] = await Promise.all([
    getTransaction(Number(txId)).catch(() => undefined),
    // A failed lookup falls through to the QR: the API refuses the code
    // itself when the meetup is not confirmed, and that message is shown.
    getAppointmentCards(Number(txId)).catch(() => undefined),
  ]);
  if (!tx) notFound();

  // The API only issues a handover code once the latest meetup card is
  // Confirmed (`assertHandoverReady`). Asking anyway used to leave an empty
  // QR box under a running 15-minute countdown and a generic error (audit
  // F01). Same rule as the chat's pinned card: lib/appointment.ts.
  if (cards && !deriveAppointmentView(cards).pinned) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <LinkButton
          variant="ghost"
          size="sm"
          href={`/history/${tx.transaction_id}`}
          className="self-start"
        >
          <ArrowLeft className="size-4" />
          Back to the chat
        </LinkButton>
        <EmptyState
          icon={<CalendarClock className="size-6" />}
          title="Confirm the meetup first"
          description="The handover code opens once you and the buyer have both agreed on the latest meetup time and place. Propose or accept one in the chat, then come back here."
          action={
            <LinkButton href={`/history/${tx.transaction_id}`}>
              Go to the chat
            </LinkButton>
          }
        />
      </div>
    );
  }

  return (
    <DealQr
      transactionId={tx.transaction_id}
      itemName={tx.post?.item?.name ?? "the item"}
    />
  );
}
