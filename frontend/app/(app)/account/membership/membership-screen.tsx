"use client";

import { useState } from "react";
import { Check, Crown } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { SlipUploader } from "@/components/kit/slip";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import { TwoColumn } from "@/components/kit/two-column";
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
  /** What this tier adds. Tiers are cumulative — see `perksOf`. */
  adds: string[];
}> = [
  {
    tier: "Silver",
    price: 49,
    adds: [
      "Up to 20 live posts instead of 5",
      "Verified badge beside your name everywhere it appears",
    ],
  },
  {
    tier: "Gold",
    price: 99,
    adds: [
      "Your posts rank above ordinary posts in the feed and in search",
      "Priority in giveaway draws you enter",
    ],
  },
  {
    tier: "Diamond",
    price: 199,
    adds: ["Unlimited live posts", "Dedicated support channel for disputes"],
  },
];

/** Every perk a tier carries, inherited ones included. */
function perksOf(tier: MembershipTier): string[] {
  const upto = TIERS.findIndex((t) => t.tier === tier);
  return TIERS.slice(0, upto + 1).flatMap((t) => t.adds);
}

/** Every perk in the product, in the order tiers introduce them. */
const ALL_PERKS = TIERS.flatMap((t) => t.adds);

export function MembershipScreen({ membership }: { membership: Membership }) {
  const toast = useToast();
  const [selected, setSelected] = useState<MembershipTier>("Gold");

  const current = TIERS.find((t) => t.tier === selected);

  /**
   * Where you stand, on the left. The three tiers are a comparison and want the
   * width; the one line that says which of them you are already on does not,
   * and as a header above them it scrolled away exactly when you needed it.
   */
  const rail = (
    <>
      <Surface shape="card" className="flex flex-col gap-3 p-4">
        <p className="text-overline text-ink-muted uppercase">
          Your membership
        </p>

        <p className="flex items-center gap-2 text-[1.125rem] font-semibold">
          {membership.tier !== "Free" ? (
            <Crown aria-hidden className="size-5 text-amber-700" />
          ) : null}
          {membership.tier}
        </p>

        {membership.expires_at ? (
          <p className="text-[0.8125rem] leading-[1.6] text-ink-muted">
            Valid until{" "}
            <span data-numeric className="font-medium text-ink-secondary">
              {new Date(membership.expires_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </p>
        ) : (
          <p className="text-[0.8125rem] leading-[1.6] text-ink-muted">
            The free tier: 5 live posts, and everything the marketplace does.
          </p>
        )}
      </Surface>

      {membership.pending_review ? (
        <Surface shape="card" elevation="flat" className="bg-tone-warning-bg border-l-4 border-l-tone-warning-solid p-4">
          <p className="text-[0.9375rem] leading-[1.7] text-tone-warning-fg">
            Your slip is with an admin. Your tier changes as soon as it is
            approved, and you do not need to send it again.
          </p>
        </Surface>
      ) : null}
    </>
  );

  return (
    <TwoColumn rail={rail} railSide="left" railFirst>
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
          Membership
        </h1>
        <p className="text-[0.9375rem] leading-[1.7] text-ink-muted">
          Six months at a time. Transfer, upload the slip, and an admin switches
          your tier.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                      <Crown aria-hidden className="size-4 text-amber-700" />
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
                    {t.adds.map((p) => (
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

      {/* The cards say what each tier *adds*; this says what you end up with.
          Same data, fully stated — "Everything in Gold" is not an answer to
          "what do I actually get". */}
      <section className="flex flex-col gap-3">
        <h2 className="text-h2">What each tier includes</h2>
        <Surface as="div" shape="panel" className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="p-3 text-overline text-ink-muted uppercase">
                  Benefit
                </th>
                {TIERS.map((t) => (
                  <th
                    key={t.tier}
                    scope="col"
                    className="w-24 p-3 text-center text-[0.875rem] font-semibold"
                  >
                    {t.tier}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERKS.map((perk) => (
                <tr key={perk} className="border-b border-line last:border-0">
                  <th
                    scope="row"
                    className="p-3 text-[0.875rem] leading-[1.6] font-normal text-ink-secondary"
                  >
                    {perk}
                  </th>
                  {TIERS.map((t) => (
                    <td key={t.tier} className="p-3 text-center">
                      {perksOf(t.tier).includes(perk) ? (
                        <>
                          <Check
                            aria-hidden
                            className="mx-auto size-4 text-tone-success-fg"
                          />
                          <span className="sr-only">Included</span>
                        </>
                      ) : (
                        <>
                          <span aria-hidden className="text-ink-disabled">
                            &mdash;
                          </span>
                          <span className="sr-only">Not included</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      </section>

      <OverlayTrigger>
        <Button
          size="lg"
          block
          className="sm:w-auto"
          isDisabled={membership.pending_review}
        >
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
    </TwoColumn>
  );
}
