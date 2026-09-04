"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ScanLine, Users } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Checkbox } from "@/components/kit/choice";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { EmptyState } from "@/components/kit/empty-state";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { QrScanner } from "@/components/kit/qr-scanner";
import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { Notice } from "@/components/patterns/notice";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import { scanTicketQr, selectRecipients } from "@/lib/actions/giveaways";
import type { ApiError } from "@/lib/api/client";
import type { RecipientRow } from "@/lib/api/giveaways";
import type { GiveawayPost } from "@/lib/api/types";
import { decodeTicketQr } from "@/lib/giveaway-qr";
import { ALLOCATION_METHOD } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * Manual giveaways only — the route 404s for the other two methods, because
 * FirstCome allocates on registration and Random is drawn by the system, and
 * neither leaves a giver anything to decide.
 *
 * `entrants` is `GET /giveaways/{id}/recipients` before this giveaway has
 * been drawn — every row is still `selected` (the backend's `Waiting`) until
 * `select()` runs. There is no registration timestamp in that response, so
 * the list is shown in the order the API returns it (ticket id ascending,
 * i.e. join order) rather than a fabricated clock time.
 */
export function ManageGiveaway({
  giveaway,
  entrants,
}: {
  giveaway: GiveawayPost;
  entrants: RecipientRow[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toast = useToast();
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const method = ALLOCATION_METHOD[giveaway.allocation_method];

  const deadline = giveaway.registered_deadline
    ? {
        kind: "giveaway-pickup" as const,
        expiresAt: Date.parse(giveaway.registered_deadline),
        labelKey: "deadline.registration-closes.label",
        onExpiry: "forfeit" as const,
      }
    : undefined;

  function toggle(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmSelection() {
    setBusy(true);
    try {
      const chosen = await selectRecipients(giveaway.giveaway_id, [...picked]);
      toast.show(
        `Selected ${chosen.length} recipient${chosen.length === 1 ? "" : "s"}. Chat rooms are open.`,
      );
      router.push(`/giveaway/${giveaway.giveaway_id}`);
    } catch (error) {
      toast.show((error as ApiError).message ?? "Could not confirm selection.");
    } finally {
      setBusy(false);
    }
  }

  async function handleScan(raw: string) {
    const decoded = decodeTicketQr(raw);
    if (!decoded) {
      toast.show("That QR is not a giveaway ticket.");
      return;
    }
    try {
      const valid = await scanTicketQr(decoded.giveawayId, decoded.ticketId, decoded.token);
      toast.show(valid ? "Ticket accepted. Handover recorded." : "This QR is not valid.");
    } catch (error) {
      toast.show((error as ApiError).message ?? "Could not check that QR.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <Link
        href={`/giveaway/${giveaway.giveaway_id}`}
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to giveaway
      </Link>

      <header className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
        <span className="block overflow-hidden rounded-card shadow-flat">
          <PostImage
            src={giveaway.images[0]?.image_url}
            alt=""
            aspectRatio={1}
            sizes="112px"
            className="h-full"
          />
        </span>
        <div className="flex min-w-0 flex-col justify-center gap-2">
          <p className="text-overline font-semibold text-tone-warning-fg uppercase">
            {t("giveaway.manageRecipients")}
          </p>
          <h1 className="text-h1 text-balance">{giveaway.item_name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={method} size="sm" />
            {deadline ? <CountdownPill deadline={deadline} showLabel /> : null}
          </div>
        </div>
      </header>

      <Notice tone="warning">
        <p className="text-body text-ink-secondary">
          You chose to pick recipients yourself. Select them below once
          registration closes, and a chat room opens for each one.
        </p>
      </Notice>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[1.125rem] leading-[1.4] font-semibold">
            Entrants
          </h2>
          <span data-numeric className="text-caption text-ink-muted">
            {entrants.length} registered
          </span>
        </div>

        {entrants.length === 0 ? (
          <EmptyState
            icon={<Users className="size-6" />}
            title="No one has registered yet"
            description="Entrants appear here as they register, in the order they arrive."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {entrants.map((e, index) => (
              <li key={e.receiver_id}>
                <Surface
                  as="div"
                  shape="card"
                  elevation="raised"
                  className={cn(
                    "flex items-center gap-3 border-l-2 p-4",
                    picked.has(e.receiver_id)
                      ? "border-l-tone-warning-solid bg-tone-warning-bg/35"
                      : "border-l-transparent",
                  )}
                >
                  <Checkbox
                    isSelected={picked.has(e.receiver_id)}
                    onChange={() => toggle(e.receiver_id)}
                    aria-label={`Select ${e.user.name}`}
                  />

                  <div className="min-w-0 flex-1">
                    <TrustBadge
                      name={e.user.name}
                      isVerified={e.user.isVerified}
                      faculty={e.user.faculty}
                      year={e.user.year}
                    />
                  </div>

                  {/* No registration timestamp in the API response — the
                      list itself is already in join order (ticket id
                      ascending), so a rank stands in for a clock time. */}
                  <span
                    data-numeric
                    className="shrink-0 text-meta text-ink-muted"
                  >
                    #{index + 1}
                  </span>
                </Surface>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="sticky action-bar-bottom z-[20] -mx-3 flex flex-col-reverse gap-2 border-t border-line bg-surface/95 px-3 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-card sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        {/* This used to link to the public detail page, which is not a
            scanner. The handover is closed by reading the recipient's rotating
            QR, so the scanner itself belongs here. */}
        <OverlayTrigger>
          <Button variant="secondary">
            <ScanLine className="size-4" />
            Scan a ticket
          </Button>

          <Overlay
            title="Scan a recipient's ticket"
            description="The QR rotates every 15 minutes, so ask them to open it now rather than sending a screenshot."
          >
            <QrScanner
              title="Scan to confirm the handover"
              hint="Point the camera at the recipient's ticket QR"
              onScan={handleScan}
            />
          </Overlay>
        </OverlayTrigger>

        <Button
          isDisabled={picked.size === 0}
          isLoading={busy}
          onPress={confirmSelection}
        >
          <Users className="size-4" />
          Confirm {picked.size} recipient{picked.size === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}
