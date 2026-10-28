"use client";

import { formatDate } from "@/lib/date-format";


import { getCopy } from "@/lib/copy";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { SlipUploader } from "@/components/kit/slip";
import { Surface } from "@/components/kit/surface";
import { Notice } from "@/components/patterns/notice";
import { useToast } from "@/components/kit/toast";
import { TwoColumn } from "@/components/kit/two-column";
import { unwrapAction } from "@/lib/action-result";
import { subscribeToMembership } from "@/lib/actions/membership";
import { uploadFile } from "@/lib/actions/uploads";
import type { Membership, MembershipTier } from "@/lib/api/membership";
import { cn } from "@/lib/utils";

/**
 * Payment for membership runs through the same evidence path as everything
 * else: transfer, upload a slip, wait for an admin to confirm. Reusing
 * `SlipUploader` here is deliberate — a student who has paid for a deal already
 * knows exactly what this screen wants (research R5, applied to a new context).
 *
 * Prices and duration match `backend/src/common/constants/membership.constant.ts`
 * exactly — this used to show ฿49/฿99/฿199 for "6 months", which was never what
 * the backend actually charged or granted (฿29/฿49/฿89, 30 days flat for every
 * tier — `reviewPayment` matches the amount transferred against this exact
 * table, so showing the wrong price here would make a correct payment look
 * like the wrong amount to the admin reviewing it).
 */
const TIERS: Array<{
  tier: MembershipTier;
  price: number;
  /** What this tier adds. Tiers are cumulative — see `perksOf`. */
  adds: string[];
}> = [
  {
    tier: "Silver",
    price: 29,
    adds: [
      "Up to 10 live posts instead of 3",
      "Verified badge beside your name everywhere it appears",
    ],
  },
  {
    tier: "Gold",
    price: 49,
    adds: [
      "Your posts rank above ordinary posts in the feed and in search",
      "Priority in giveaway draws you enter",
    ],
  },
  {
    tier: "Diamond",
    price: 89,
    adds: ["Unlimited live posts", "Dedicated support channel for disputes"],
  },
];

const MEMBERSHIP_DURATION_DAYS = 30;

/** Every perk a tier carries, inherited ones included. */
function perksOf(tier: MembershipTier): string[] {
  const upto = TIERS.findIndex((t) => t.tier === tier);
  return TIERS.slice(0, upto + 1).flatMap((t) => t.adds);
}

/** Every perk in the product, in the order tiers introduce them. */
const ALL_PERKS = TIERS.flatMap((t) => t.adds);

export function MembershipScreen({ membership }: { membership: Membership }) {
  const t = getCopy();
  const router = useRouter();
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
      <Surface shape="panel" className="overflow-hidden p-0">
        <div aria-hidden className="h-1 bg-tone-warning-solid" />
        <div className="flex flex-col gap-3 p-5">
        <p className="text-overline text-ink-muted uppercase">
          Your membership
        </p>

        <p className="flex items-center gap-2 text-[1.125rem] font-semibold">
          {membership.tier !== "Free" ? (
            <Crown aria-hidden className="size-5 text-[var(--membership-fg)]" />
          ) : null}
          {membership.tier}
        </p>

        {membership.expires_at ? (
          <p className="text-caption leading-[1.6] text-ink-muted">
            Valid until{" "}
            <span data-numeric className="font-medium text-ink-secondary">
              {formatDate(new Date(membership.expires_at))}
            </span>
          </p>
        ) : (
          <p className="text-caption leading-[1.6] text-ink-muted">
            The free tier: 3 live posts, and everything the marketplace does.
          </p>
        )}
        </div>
      </Surface>

      {membership.pending_review ? (
        <Notice tone="warning">
          <p className="text-body text-tone-warning-fg">
            Your slip is with an admin. Your tier changes as soon as it is
            approved, and you do not need to send it again.
          </p>
        </Notice>
      ) : null}
    </>
  );

  return (
    <TwoColumn rail={rail} railSide="left" railFirst>
      <header>
        <p className="text-overline font-semibold text-tone-warning-fg uppercase">
          {t("membership.moreFromMarketplace")}
        </p>
        <h1 className="mt-1 text-h1">{t("account.membership")}</h1>
        <p className="text-body text-ink-muted">
          {MEMBERSHIP_DURATION_DAYS} days at a time. Transfer, upload the slip,
          and an admin switches your tier.
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
                    "flex h-full flex-col gap-3 overflow-hidden p-4",
                    isSelected &&
                      "bg-[var(--membership-bg)] ring-2 ring-[var(--membership-fg)]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Crown aria-hidden className="size-4 text-[var(--membership-fg)]" />
                      {t.tier}
                    </span>
                    {isCurrent ? (
                      <span className="rounded-pill bg-tone-success-bg px-2 py-0.5 text-meta font-semibold text-tone-success-fg">
                        Current
                      </span>
                    ) : null}
                  </div>

                  <p data-numeric className="text-[1.5rem] leading-[1.2] font-bold">
                    ฿{t.price}
                    <span className="text-caption font-normal text-ink-muted">
                      {" "}
                      / {MEMBERSHIP_DURATION_DAYS} days
                    </span>
                  </p>

                  <ul className="flex flex-col gap-1.5">
                    {t.adds.map((p) => (
                      <li
                        key={p}
                        className="flex gap-2 text-caption leading-[1.6] text-ink-secondary"
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
                    className="w-24 p-3 text-center text-body-sm font-semibold"
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
                    className="p-3 text-body-sm leading-[1.6] font-normal text-ink-secondary"
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
            embedded
            amount={current?.price ?? 0}
            onUpload={async (file) => {
              const url = await unwrapAction(uploadFile(file));
              await unwrapAction(subscribeToMembership(selected, url));
              toast.success("Slip uploaded. An admin will review it shortly.");
              router.refresh();
            }}
          />
        </Overlay>
      </OverlayTrigger>
    </TwoColumn>
  );
}
