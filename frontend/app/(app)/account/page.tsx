import Link from "next/link";
import { getCopy } from "@/lib/copy";
import { redirect } from "next/navigation";
import {
  ChevronRight,
  Crown,
  Eye,
  Handshake,
  LogOut,
  Pencil,
  Scale,
  Trash2,
  Users,
} from "lucide-react";

import {
  parseSellerQuery,
  SellerProfileView,
} from "@/components/features/sellers/seller-profile-view";
import { Surface } from "@/components/kit/surface";
import { logout } from "@/lib/actions/auth";
import { getMembership } from "@/lib/api/membership";
import { getSeller, getSellerPosts, type SellerProfile } from "@/lib/api/sellers";
import { getAccessToken } from "@/lib/api/session";
import { getTransactions } from "@/lib/api/transactions";
import { getMe } from "@/lib/api/users";

import { HeroAvatar } from "./hero-avatar";

export const metadata = { title: "Account - KU Marketplace" };

const ownerLinkClass =
  "inline-flex min-h-11 items-center gap-2 rounded-control px-3 font-medium text-ink-brand hover:bg-brand-subtle";

/**
 * Your own profile, laid out exactly as other students see it on
 * `/sellers/:id`, with your account settings between the header and your
 * listings. Seeing yourself the way others do is the point: verification and
 * your listings are what another student checks before trading with you.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getCopy();
  if (!(await getAccessToken())) {
    redirect("/login");
  }

  const [me, membership, transactions, raw] = await Promise.all([
    getMe(),
    getMembership(),
    getTransactions().catch(() => []),
    searchParams,
  ]);
  const query = parseSellerQuery(raw);
  const name =
    [me.firstNameEn, me.lastNameEn].filter(Boolean).join(" ") || me.email;

  // The public profile only serves active accounts. A restricted account
  // still reaches its own page, built from what /users/me already says.
  const fallback: SellerProfile = {
    user_id: me.userId,
    name,
    // Every account is a verified @ku.th address.
    is_verified: true,
    member_since: me.createdAt,
    active_listing_count: 0,
    follower_count: 0,
  };
  const [profile, listings] = await Promise.all([
    getSeller(me.userId).catch(() => fallback),
    getSellerPosts(me.userId, query).catch(() => ({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })),
  ]);

  const completed = transactions.filter(
    (tx) =>
      tx.status === "Completed" &&
      (tx.buyer_id === me.userId || tx.seller_id === me.userId),
  ).length;

  const settings = [
    {
      href: "/account/edit",
      label: t("account.editProfile"),
      hint: "Thai name, phone number and photo",
      icon: Pencil,
      iconClass: "bg-brand-subtle text-ink-brand",
    },
    {
      href: "/account/following",
      label: t("seller.directory"),
      hint: "Sellers you saved to find again",
      icon: Users,
      iconClass: "bg-brand-subtle text-ink-brand",
    },
    {
      href: "/account/membership",
      label: t("account.membership"),
      hint:
        membership.tier === "Free"
          ? "Free plan. Upgrade for more listings"
          : `${membership.tier} plan`,
      icon: Crown,
      iconClass: "bg-tone-warning-bg text-tone-warning-fg",
    },
    {
      href: "/account/appeals",
      label: t("account.appeals"),
      hint: "Decisions about your account",
      icon: Scale,
      iconClass: "bg-tone-trade-bg text-tone-trade-fg",
    },
    {
      href: "/account/delete",
      label: t("account.close"),
      hint: "Your history is kept",
      icon: Trash2,
      iconClass: "bg-tone-danger-bg text-tone-danger-fg",
    },
  ];

  return (
    <SellerProfileView
      profile={profile}
      listings={listings}
      query={query}
      pathname="/account"
      signedIn
      following={null}
      mine
      avatar={<HeroAvatar name={name} avatarUrl={me.avatarUrl} />}
      ownerActions={
        <>
          <Link className={ownerLinkClass} href="/account/edit">
            <Pencil aria-hidden className="size-4" />
            {t("seller.edit")}
          </Link>
          <Link className={ownerLinkClass} href={`/sellers/${me.userId}`}>
            <Eye aria-hidden className="size-4" />
            View as others
          </Link>
        </>
      }
      extraFacts={
        <>
          <div className="flex items-center gap-3 text-body-sm">
            <Handshake
              aria-hidden
              className="size-5 shrink-0 text-ink-muted"
            />
            <dt>Completed deals</dt>
            <dd data-numeric className="font-semibold text-ink-brand">
              {completed.toLocaleString("en-GB")}
            </dd>
          </div>
          <div className="flex items-center gap-3 text-body-sm">
            <Crown aria-hidden className="size-5 shrink-0 text-ink-muted" />
            <dt>{t("account.membership")}</dt>
            <dd className="font-semibold text-ink-brand">{membership.tier}</dd>
          </div>
        </>
      }
    >
      <section aria-labelledby="account-settings">
        <h2 id="account-settings" className="mb-3 text-h2">
          {t("account.settings")}
        </h2>
        <Surface shape="card" className="overflow-hidden p-0">
          <ul className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
            {settings.map(({ href, label, hint, icon: Icon, iconClass }) => (
              <li key={href} className="sm:border-b sm:border-line">
                <Link
                  href={href}
                  className="flex min-h-16 items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50"
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-pill ${iconClass}`}
                  >
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[1rem] font-medium">{label}</span>
                    <span className="truncate text-meta text-ink-muted">
                      {hint}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-ink-muted"
                  />
                </Link>
              </li>
            ))}
            <li className="sm:border-b sm:border-line">
              <form action={logout} className="h-full">
                <button
                  type="submit"
                  className="flex min-h-16 w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-gray-50"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-pill bg-tone-danger-bg text-tone-danger-fg">
                    <LogOut aria-hidden className="size-4" />
                  </span>
                  <span className="flex-1 text-[1rem] font-medium text-tone-danger-fg">
                    {t("account.signOut")}
                  </span>
                </button>
              </form>
            </li>
          </ul>
        </Surface>
      </section>
    </SellerProfileView>
  );
}
