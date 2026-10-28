import { notFound } from "next/navigation";
import Link from "next/link";

import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { TwoColumn } from "@/components/kit/two-column";
import { getChatHistory } from "@/lib/api/chat";
import { getTransaction } from "@/lib/api/transactions";
import { formatPrice } from "@/lib/format-price";
import { deadlineFor } from "@/lib/inbox";
import { canReport, requiresPayment, transactionStatusPresentation } from "@/lib/status";
import { requireViewer } from "@/lib/viewer";

import { ReportForm } from "./report-form";

export const metadata = { title: "Report a problem - KU Marketplace" };

/**
 * E8 — reporting a transaction.
 *
 * Research risk R2: the report action exists only once a flow deadline has
 * actually passed. Reaching this URL early is not an error page, it is a
 * *explanation* — telling a worried student "not yet, here is when" is the
 * whole job of this screen in that state.
 *
 * Real now: `getTransaction` requires the viewer to actually be the buyer or
 * seller (backend `assertParticipant`), so a failed fetch means "not signed
 * in" or "not your deal" — both collapse to `notFound()` the same way a
 * missing fixture id used to.
 */
export default async function ReportPage({
  params,
}: {
  params: Promise<{ txId: string }>;
}) {
  // Only a 401 means signed out (audit N01); see `requireViewer`.
  const viewerProfile = await requireViewer();

  const { txId } = await params;
  const tx = await getTransaction(Number(txId)).catch(() => undefined);
  if (!tx) notFound();

  // The deal's chat, so the reporter can point at the messages they mean.
  // A failed read only hides the picker; photos and details still work.
  const messages = await getChatHistory(tx.transaction_id)
    .then((chat) => chat.messages)
    .catch(() => undefined);

  const deadline = deadlineFor(tx);
  const allowed = canReport(deadline ? [deadline] : []);
  const viewer = tx.buyer_id === viewerProfile.userId ? "buyer" : "seller";
  const other = viewer === "buyer" ? tx.seller : tx.buyer;

  /**
   * The deal being reported, beside the form. An admin will read this report
   * against this transaction, and the person writing it should be able to see
   * which one they picked without navigating away and losing what they typed.
   */
  const subject = (
    <Surface shape="panel" className="overflow-hidden p-0">
      <div aria-hidden className="h-1 bg-tone-danger-solid" />
      <div className="flex flex-col gap-3 p-5">
      <p className="text-overline text-ink-muted uppercase">
        The deal you are reporting
      </p>

      <span className="block w-full overflow-hidden rounded-slot">
        <PostImage
          src={tx.post.item.images.find((i) => i.is_primary)?.image_url}
          alt=""
          aspectRatio={4 / 3}
          sizes="320px"
        />
      </span>

      <Link
        href={`/market/${tx.post_id}`}
        className="font-semibold hover:underline"
      >
        {tx.post.item.name}
      </Link>

      <StatusBadge
        status={transactionStatusPresentation(tx)}
        size="sm"
        className="w-fit"
      />

      <dl className="flex flex-col gap-2 border-t border-line pt-3 text-caption">
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">Deal</dt>
          <dd data-numeric>#{tx.transaction_id}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">Handover</dt>
          <dd>{tx.delivery_method}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">Amount</dt>
          <dd data-numeric>
            {requiresPayment(tx)
              ? formatPrice(tx.final_amount)
              : "Trade, no money"}
          </dd>
        </div>
      </dl>

      <div className="border-t border-line pt-3">
        <p className="mb-2 text-meta text-ink-muted">
          You are reporting
        </p>
        <TrustBadge
          name={other.name}
          avatarUrl={other.avatar_url}
          isVerified={other.isVerified}
        />
      </div>
      </div>
    </Surface>
  );

  return (
    <TwoColumn rail={subject}>
      <ReportForm
        transaction={tx}
        transactionId={tx.transaction_id}
        itemName={tx.post.item.name}
        counterparty={other.name}
        allowed={allowed}
        deadline={deadline}
        messages={messages}
        viewerId={viewerProfile.userId}
      />
    </TwoColumn>
  );
}
