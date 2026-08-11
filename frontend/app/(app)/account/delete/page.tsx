import { Surface } from "@/components/kit/surface";
import { TwoColumn } from "@/components/kit/two-column";
import {
  getMyItems,
  getOffers,
  getPosts,
  getTransactions,
  VIEWER_ID,
} from "@/lib/api/fixtures";

import { DeleteAccountForm } from "./delete-form";

export const metadata = { title: "Close account - KU Marketplace" };

/**
 * The consequences, counted.
 *
 * The page used to state what closing an account does in the abstract and then
 * sit in a 42% column with the rest of the window empty. The same sentences
 * mean much more with the viewer's own numbers beside them — and the count of
 * deals in progress is not decoration, it is the thing that blocks the button.
 */
export default async function DeleteAccountPage() {
  const [items, posts, transactions, offers] = await Promise.all([
    getMyItems(),
    getPosts(),
    getTransactions(),
    getOffers(),
  ]);

  const mine = new Set(items.map((i) => i.item_id));
  const livePosts = posts.filter((p) => mine.has(p.item_id)).length;
  const openOffers = offers.filter(
    (o) => o.proposer_id === VIEWER_ID && o.status === "Pending",
  ).length;

  const involved = transactions.filter(
    (t) => t.buyer_id === VIEWER_ID || t.seller_id === VIEWER_ID,
  );
  const inProgress = involved.filter(
    (t) => t.status === "Pending" || t.status === "Processing",
  ).length;
  const completed = involved.filter((t) => t.status === "Completed").length;

  const rows: Array<[label: string, value: number, note: string]> = [
    ["Items in your inventory", items.length, "Deleted with the account"],
    ["Live posts", livePosts, "Removed from the market at once"],
    ["Open offers you made", openOffers, "Withdrawn"],
    ["Deals in progress", inProgress, "Must be finished or cancelled first"],
    ["Completed deals", completed, "Stay in the other party's history"],
  ];

  return (
    <TwoColumn
      rail={
        <Surface shape="card" className="flex flex-col gap-4 p-5">
          <p className="text-overline text-ink-muted uppercase">
            What you would lose
          </p>
          <dl className="flex flex-col gap-3">
            {rows.map(([label, value, note]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="flex items-baseline justify-between gap-2 text-[0.875rem] font-medium">
                  {label}
                  <span data-numeric className="shrink-0 tabular-nums">
                    {value}
                  </span>
                </dt>
                <dd className="text-[0.75rem] leading-[1.5] text-ink-muted">
                  {note}
                </dd>
              </div>
            ))}
          </dl>
        </Surface>
      }
    >
      <DeleteAccountForm blocked={inProgress} />
    </TwoColumn>
  );
}
