"use client";

import { useState } from "react";
import { Check, Crown } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { SlipUploader } from "@/components/kit/slip";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import type { Membership, MembershipTier } from "@/lib/api/fixtures";
import { cn } from "@/lib/utils";

/**
 * Payment for membership runs through the same evidence path as everything
 * else: transfer, upload a slip, wait for an admin to confirm. Reusing
 * `SlipUploader` here is deliberate — a student who has paid for a deal already
 * knows exactly what this screen wants (research R5, applied to a new context).
 */
const TIERS: Array<{
  tier: MembershipTier;
  price: number;
  perks: string[];
}> = [
  {
    tier: "Silver",
    price: 49,
    perks: [
      "Up to 20 live posts instead of 5",
      "Verified badge beside your name everywhere it appears",
    ],
  },
  {
    tier: "Gold",
    price: 99,
    perks: [
      "Everything in Silver",
      "Your posts rank above ordinary posts in the feed and in search",
      "Priority in giveaway draws you enter",
    ],
  },
  {
    tier: "Diamond",
    price: 199,
    perks: [
      "Everything in Gold",
      "Unlimited live posts",
      "Dedicated support channel for disputes",
    ],
  },
];

export function MembershipScreen({ membership }: { membership: Membership }) {
  const toast = useToast();
  const [selected, setSelected] = useState<MembershipTier>("Gold");

  const current = TIERS.find((t) => t.tier === selected);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
          Membership
        </h1>
        {membership.tier !== "Free" ? (
          <p className="text-[0.875rem] text-ink-muted">
            You are on {membership.tier}
            {membership.expires_at
              ? `, valid until ${new Date(membership.expires_at).toLocaleDateString(
                  "en-GB",
                  { day: "numeric", month: "short", year: "numeric" },
                )}`
              : ""}
          </p>
        ) : null}
      </header>

      {membership.pending_review ? (
        <Surface shape="card" elevation="flat" className="bg-tone-warning-bg p-4">
          <p className="text-[0.9375rem] leading-[1.7] text-tone-warning-fg">
            Your slip is with an admin. Your tier changes as soon as it is
            approved, and you do not need to send it again.
          </p>
        </Surface>
      ) : null}

      <ul className="grid gap-3 md:grid-cols-3">
        {TIERS.map((t) => {
          const isCurrent = membership.tier === t.tier;
          const isSelected = selected === t.tier;
          return (
            <li key={t.tier}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelected(t.tier)}
                className="w-full text-left"
              >
                <Surface
                  as="div"
                  shape="card"
                  elevation={isSelected ? "floating" : "raised"}
                  className={cn(
                    "flex h-full flex-col gap-3 p-4",
                    isSelected && "ring-2 ring-brand",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Crown aria-hidden className="size-4 text-gold-600" />
                      {t.tier}
                    </span>
                    {isCurrent ? (
                      <span className="rounded-pill bg-tone-success-bg px-2 py-0.5 text-[0.6875rem] font-semibold text-tone-success-fg">
                        Current
                      </span>
                    ) : null}
                  </div>

                  <p data-numeric className="text-[1.5rem] leading-[1.2] font-bold">
                    ฿{t.price}
                    <span className="text-[0.8125rem] font-normal text-ink-muted">
                      {" "}
                      / 6 months
                    </span>
                  </p>

                  <ul className="flex flex-col gap-1.5">
                    {t.perks.map((p) => (
                      <li
                        key={p}
                        className="flex gap-2 text-[0.8125rem] leading-[1.6] text-ink-secondary"
                      >
                        <Check
                          aria-hidden
                          className="mt-0.5 size-3.5 shrink-0 text-brand"
                        />
                        {p}
                      </li>
                    ))}
                  </ul>
                </Surface>
              </button>
            </li>
          );
        })}
      </ul>

      <OverlayTrigger>
        <Button size="lg" block isDisabled={membership.pending_review}>
          <Crown className="size-5" />
          Subscribe to {selected}
        </Button>

        <Overlay
          title={`Subscribe to ${selected}`}
          description="Transfer the amount, then upload the slip. An admin checks it and switches your tier."
        >
          <SlipUploader
            amount={current?.price ?? 0}
            onUpload={async () => {
              toast.show("Slip uploaded. An admin will review it shortly.");
            }}
          />
        </Overlay>
      </OverlayTrigger>
    </div>
  );
}
