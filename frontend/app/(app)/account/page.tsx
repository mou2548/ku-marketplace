import Link from "next/link";
import {
  ChevronRight,
  Crown,
  LogOut,
  Pencil,
  Scale,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { getMembership, getTransactions, getViewer, VIEWER_ID } from "@/lib/api/fixtures";

export const metadata = { title: "Account - KU Marketplace" };

/**
 * Trust gap T1, design principle 3: verification is the product. The profile
 * leads with the KU verification and the completed-deal count, because those
 * two facts are what another student is actually asking about when they open
 * someone's profile.
 *
 * Everything else here is settings, and settings are a list.
 */
export default async function AccountPage() {
  const [viewer, membership, transactions] = await Promise.all([
    getViewer(),
    getMembership(),
    getTransactions(),
  ]);

  const completed = transactions.filter(
    (t) =>
      t.status === "Completed" &&
      (t.buyer_id === VIEWER_ID || t.seller_id === VIEWER_ID),
  ).length;

  const rows = [
    { href: "/account/edit", label: "Edit profile", icon: Pencil },
    { href: "/account/membership", label: "Membership", icon: Crown },
    { href: "/account/appeals", label: "My appeals", icon: Scale },
    { href: "/account/delete", label: "Close account", icon: Trash2 },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Surface shape="card" className="flex flex-col gap-4 p-5">
        <TrustBadge
          name={viewer.name}
          isVerified={viewer.isVerified}
          faculty={viewer.faculty}
          year={viewer.year}
        />

        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-pill bg-tone-success-bg px-2.5 py-1 text-[0.8125rem] font-medium text-tone-success-fg">
            <ShieldCheck aria-hidden className="size-4" />
            Verified KU student
          </span>
          <span
            data-numeric
            className="rounded-pill bg-gray-100 px-2.5 py-1 text-[0.8125rem] font-medium text-ink-secondary"
          >
            {completed} completed {completed === 1 ? "deal" : "deals"}
          </span>
          {membership.tier !== "Free" ? (
            <span className="flex items-center gap-1.5 rounded-pill bg-gold-100 px-2.5 py-1 text-[0.8125rem] font-medium text-gold-600">
              <Crown aria-hidden className="size-4" />
              {membership.tier}
            </span>
          ) : null}
        </div>
      </Surface>

      <nav aria-label="Account settings">
        <ul className="flex flex-col gap-2">
          {rows.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href}>
                <Surface
                  as="div"
                  shape="card"
                  elevation="flat"
                  interactive
                  className="flex min-h-14 items-center gap-3 px-4"
                >
                  <Icon aria-hidden className="size-5 shrink-0 text-ink-muted" />
                  <span className="flex-1 text-[0.9375rem] font-medium">
                    {label}
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-ink-muted"
                  />
                </Surface>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Link
        href="/login"
        className="flex min-h-12 items-center justify-center gap-2 text-[0.9375rem] font-medium text-tone-danger-fg"
      >
        <LogOut aria-hidden className="size-4" />
        Sign out
      </Link>
    </div>
  );
}
