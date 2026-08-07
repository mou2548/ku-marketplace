"use client";

import { useState } from "react";
import { Dices, ScanLine, Users } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { Checkbox } from "@/components/kit/choice";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { EmptyState } from "@/components/kit/empty-state";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import type { Entrant } from "@/lib/api/fixtures";
import type { GiveawayPost } from "@/lib/api/types";
import { ALLOCATION_METHOD } from "@/lib/status";

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
  const isManual = giveaway.allocation_method === "Manual";

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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
          {giveaway.item_name}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={method} size="sm" />
          {deadline ? <CountdownPill deadline={deadline} showLabel /> : null}
        </div>
      </header>

      {/* Say plainly whose job the draw is. A giver who chose Random should not
          be hunting for a button that does not belong to them. */}
      <Surface
        shape="card"
        elevation="flat"
        className={isManual ? "bg-tone-trade-bg p-4" : "bg-tone-info-bg p-4"}
      >
        <p className="text-[0.9375rem] leading-[1.7] text-ink-secondary">
          {isManual
            ? "You chose to pick recipients yourself. Select them below once registration closes, and a chat room opens for each one."
            : `${method.hint}. You do not need to do anything here — the system runs the draw when registration closes.`}
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
                  elevation="flat"
                  className="flex items-center gap-3 p-4"
                >
                  {isManual ? (
                    <Checkbox
                      isSelected={picked.has(e.receiver_id)}
                      onChange={() => toggle(e.receiver_id)}
                      aria-label={`Select ${e.user.name}`}
                    />
                  ) : null}

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
        <LinkButton
          variant="secondary"
          href={`/giveaway/${giveaway.giveaway_id}`}
        >
          <ScanLine className="size-4" />
          Scan a ticket
        </LinkButton>

        {isManual ? (
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
        ) : (
          <Button
            isLoading={busy}
            onPress={() => run("Draw complete. Winners have been notified.")}
          >
            <Dices className="size-4" />
            Run the draw now
          </Button>
        )}
      </div>
    </div>
  );
}
