"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ScanLine, Users } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Checkbox } from "@/components/kit/choice";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { EmptyState } from "@/components/kit/empty-state";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { QrScanner } from "@/components/kit/qr-scanner";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import type { Entrant } from "@/lib/api/fixtures";
import type { GiveawayPost } from "@/lib/api/types";
import { ALLOCATION_METHOD } from "@/lib/status";

/**
 * Manual giveaways only — the route 404s for the other two methods, because
 * FirstCome allocates on registration and Random is drawn by the system, and
 * neither leaves a giver anything to decide.
 */
export function ManageGiveaway({
  giveaway,
  entrants,
}: {
  giveaway: GiveawayPost;
  entrants: Entrant[];
}) {
  const toast = useToast();
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const method = ALLOCATION_METHOD[giveaway.allocation_method];

  const deadline = giveaway.registered_deadline
    ? {
        kind: "giveaway-pickup" as const,
        expiresAt: Date.parse(giveaway.registered_deadline),
        label: "Registration closes",
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

  async function run(message: string) {
    setBusy(true);
    // POST /giveaways/{id}/draw  or  /giveaways/{id}/select
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show(message);
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <Link
        href={`/giveaway/${giveaway.giveaway_id}`}
        className="flex w-fit items-center gap-1.5 text-[0.875rem] font-medium text-ink-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to giveaway
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
          {giveaway.item_name}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={method} size="sm" />
          {deadline ? <CountdownPill deadline={deadline} showLabel /> : null}
        </div>
      </header>

      <Surface shape="card" elevation="flat" className="bg-tone-trade-bg border-l-4 border-l-tone-trade-solid p-4">
        <p className="text-[0.9375rem] leading-[1.7] text-ink-secondary">
          You chose to pick recipients yourself. Select them below once
          registration closes, and a chat room opens for each one.
        </p>
      </Surface>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[1.125rem] leading-[1.4] font-semibold">
            Entrants
          </h2>
          <span data-numeric className="text-[0.8125rem] text-ink-muted">
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
            {entrants.map((e) => (
              <li key={e.receiver_id}>
                <Surface
                  as="div"
                  shape="card"
                  elevation="raised"
                  className="flex items-center gap-3 p-4"
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

                  <time
                    dateTime={e.registered_at}
                    className="shrink-0 text-[0.75rem] text-ink-muted"
                  >
                    {new Date(e.registered_at).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </Surface>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
              onScan={() => toast.show("Ticket accepted. Handover recorded.")}
            />
          </Overlay>
        </OverlayTrigger>

        <Button
          isDisabled={picked.size === 0}
          isLoading={busy}
          onPress={() =>
            run(
              `Selected ${picked.size} recipient${picked.size === 1 ? "" : "s"}. Chat rooms are open.`,
            )
          }
        >
          <Users className="size-4" />
          Confirm {picked.size} recipient{picked.size === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}
