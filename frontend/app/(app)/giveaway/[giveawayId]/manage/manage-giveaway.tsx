"use client";

import { formatDate } from "@/lib/date-format";
import { getCopy } from "@/lib/copy";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info, Lock, ScanLine, Users } from "lucide-react";

import { ActionBar } from "@/components/kit/action-bar";
import { Button, LinkButton } from "@/components/kit/button";
import { Checkbox } from "@/components/kit/choice";
import { ConfirmButton } from "@/components/kit/confirm-button";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { EmptyState } from "@/components/kit/empty-state";
import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { Notice } from "@/components/patterns/notice";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import { unwrapAction } from "@/lib/action-result";
import { closeGiveawayRegistration, selectRecipients } from "@/lib/actions/giveaways";
import type { RecipientRow } from "@/lib/api/giveaways";
import type { GiveawayPost } from "@/lib/api/types";
import {
  ALLOCATION_METHOD,
  ENTRANT_STATUS,
  TICKET_STATUS,
  type TicketStatus,
} from "@/lib/status";
import { UNKNOWN_TIME, useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** A place already went to this entrant: chosen and waiting, or collected. */
function isChosen(status: TicketStatus) {
  return status === "Waiting" || status === "Received";
}

/**
 * Every allocation method lands here now: FirstCome allocates on
 * registration and Random is drawn by the system, so neither leaves a giver
 * anything to pick, but all three still need the giver to scan a recipient's
 * QR to close the handover. Only Manual renders the entrant picker below —
 * the other two skip straight to the scanner.
 *
 * `entrants` is the complete roster, including explicit allocation outcomes.
 * There is no registration timestamp in that response, so
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
  const t = getCopy();
  const router = useRouter();
  const toast = useToast();
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const method = ALLOCATION_METHOD[giveaway.allocation_method];
  const isManual = giveaway.allocation_method === "Manual";

  const registerEndMs = giveaway.register_deadline
    ? Date.parse(giveaway.register_deadline)
    : null;
  // 1s, not the 30s default elsewhere: `canSelect` is a boolean gate, not a
  // display, and "End registration now" moves `register_deadline` into the
  // past via a `router.refresh()` — with a coarser bucket this `now` could
  // still read as "before" that new deadline for up to 30s after the
  // refresh, leaving the button looking stuck even though the server has
  // already closed registration.
  const now = useNow(1_000);
  // The backend refuses to select before the deadline no matter what — this
  // only mirrors that so the button doesn't invite a dead click.
  const canSelect = now !== UNKNOWN_TIME && registerEndMs !== null && now >= registerEndMs;
  const registeredCount = entrants.filter(
    (entry) => entry.ticket_status === "Registered",
  ).length;
  const chosenCount = entrants.filter((entry) => isChosen(entry.ticket_status)).length;
  // Picking is one-shot: the API marks every other entrant Not selected and
  // closes the giveaway on the first confirm, so once anyone is chosen there
  // is nothing left to pick, even when fewer people than places were chosen.
  const placesLeft = chosenCount > 0 ? 0 : giveaway.quantity;
  // Chosen people first, so what is settled reads before what is still open;
  // the join-order rank stays attached to each person.
  const roster = entrants
    .map((entry, index) => ({ entry, rank: index + 1 }))
    .sort(
      (a, b) =>
        Number(isChosen(b.entry.ticket_status)) -
        Number(isChosen(a.entry.ticket_status)),
    );

  const deadline = giveaway.register_deadline
    ? {
        kind: "giveaway-pickup" as const,
        expiresAt: Date.parse(giveaway.register_deadline),
        labelKey: "deadline.registration-closes.label",
        onExpiry: "forfeit" as const,
      }
    : undefined;

  function toggle(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < placesLeft) next.add(id);
      return next;
    });
  }

  async function confirmSelection() {
    setBusy(true);
    try {
      const chosen = await unwrapAction(selectRecipients(giveaway.giveaway_id, [...picked]));
      toast.success(
        `Selected ${chosen.length} recipient${chosen.length === 1 ? "" : "s"}. Chat rooms are open.`,
      );
      // Stay here: the roster re-reads with the new people ticked and
      // marked Chosen, which is the confirmation the giver is looking for.
      setPicked(new Set());
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not confirm selection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Back returns to where a giver comes from (My giveaways), not to
          the detail page: the detail page sits one step further in, behind
          Details, so one Back is enough to leave. */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/giveaway?tab=given"
          className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-brand hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to my giveaways
        </Link>
        <LinkButton
          size="sm"
          variant="secondary"
          href={`/giveaway/${giveaway.giveaway_id}`}
        >
          <Info className="size-4" />
          Details
        </LinkButton>
      </div>

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
          {isManual
            ? chosenCount > 0
              ? `${chosenCount} of ${giveaway.quantity} places chosen. A chat room is open with each recipient; scan their ticket when they collect.`
              : `You chose to pick recipients yourself. Once registration closes, select up to ${giveaway.quantity} below and confirm once: everyone else is told they were not selected, and a chat room opens for each recipient.`
            : "Recipients are chosen automatically. Scan a recipient's ticket below to confirm the handover."}
        </p>
      </Notice>

      {isManual ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[1.125rem] leading-[1.4] font-semibold">
              Entrants
            </h2>
            <span data-numeric className="text-caption text-ink-muted">
              {chosenCount}/{giveaway.quantity} chosen · {registeredCount}{" "}
              waiting
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
              {roster.map(({ entry: e, rank }) => {
                const chosen = isChosen(e.ticket_status);
                return (
                  <li key={e.receiver_id}>
                    <Surface
                      as="div"
                      shape="card"
                      elevation="raised"
                      className={cn(
                        "flex items-center gap-3 p-4",
                        picked.has(e.receiver_id) && "bg-surface-sunken",
                        chosen && "bg-brand-subtle",
                      )}
                    >
                      {/* A chosen entrant stays ticked and locked: the place is
                          theirs, and an empty box read as "not picked yet". */}
                      <Checkbox
                        isSelected={chosen || picked.has(e.receiver_id)}
                        onChange={() => toggle(e.receiver_id)}
                        isDisabled={e.ticket_status !== "Registered" || placesLeft === 0}
                        aria-label={
                          chosen ? `${e.user.name} is chosen` : `Select ${e.user.name}`
                        }
                      />

                      <div className="min-w-0 flex-1">
                        <TrustBadge
                          name={e.user.name}
                          avatarUrl={e.user.avatar_url}
                          isVerified={e.user.isVerified}
                          faculty={e.user.faculty}
                          year={e.user.year}
                        />
                      </div>

                      {/* Waiting means chosen, not yet collected — say Chosen,
                          the giver's word for it. Received keeps its own label. */}
                      <StatusBadge
                        status={
                          e.ticket_status === "Waiting"
                            ? ENTRANT_STATUS.Selected
                            : TICKET_STATUS[e.ticket_status]
                        }
                        size="sm"
                      />

                      {/* No registration timestamp in the API response — the
                          list itself is already in join order (ticket id
                          ascending), so a rank stands in for a clock time. */}
                      <span
                        data-numeric
                        className="shrink-0 text-meta text-ink-muted"
                      >
                        #{rank}
                      </span>
                    </Surface>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {isManual && !canSelect ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption leading-[1.6] text-ink-secondary">
            {`Confirming recipients is available once registration closes${
              registerEndMs ? ` at ${formatDate(new Date(registerEndMs))}` : ""
            }. It cannot be run early.`}
          </p>
          <ConfirmButton
            title="End registration now?"
            description={`${registeredCount} ${registeredCount === 1 ? "person has" : "people have"} registered so far. This closes registration immediately${
              registerEndMs ? `, before ${formatDate(new Date(registerEndMs))}` : ""
            } — nobody else can join, and it cannot be undone. You can then confirm recipients right away.`}
            confirmLabel="End registration"
            doneMessage="Registration closed. You can confirm recipients now."
            icon={<Lock className="size-4" />}
            onConfirm={() => unwrapAction(closeGiveawayRegistration(giveaway.giveaway_id))}
            trigger={
              <>
                <Lock className="size-4" />
                End registration now
              </>
            }
            triggerProps={{ variant: "ghost", size: "sm" }}
          />
        </div>
      ) : null}

      <ActionBar>
        {/* `QrScanner` is a full-screen component (design principle 7) and
            breaks inside `Overlay`'s height-capped dialog, so the handover
            scan lives on its own route instead of a popover here. */}
        <LinkButton variant="secondary" href="/giveaway/scan">
          <ScanLine className="size-4" />
          Scan a ticket
        </LinkButton>

        {isManual && placesLeft > 0 ? (
          <Button
            isDisabled={picked.size === 0 || !canSelect}
            isLoading={busy}
            onPress={confirmSelection}
          >
            <Users className="size-4" />
            Confirm {picked.size}/{placesLeft} recipient
            {picked.size === 1 ? "" : "s"}
          </Button>
        ) : null}
      </ActionBar>
    </div>
  );
}
