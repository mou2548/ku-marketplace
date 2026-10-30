import Link from "next/link";
import { getCopy } from "@/lib/copy";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Crown,
  Eye,
  Gift,
  Handshake,
  Hourglass,
  LogOut,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Scale,
  Store,
  Trash2,
  Truck,
  Users,
} from "lucide-react";

import {
  ProfileCard,
  ProfileCardLink,
} from "@/components/features/sellers/profile-card";
import { Surface } from "@/components/kit/surface";
import { logout } from "@/lib/actions/auth";
import { offersNeedingAnswer } from "@/lib/inbox";
import { getMembership } from "@/lib/api/membership";
import { getMyOffers } from "@/lib/api/offers";
import { getSeller } from "@/lib/api/sellers";
import { getAccessToken, getCurrentUserId } from "@/lib/api/session";
import { getTransactions } from "@/lib/api/transactions";
import { getMe } from "@/lib/api/users";

import { HeroAvatar } from "./hero-avatar";

export const metadata = { title: "Account - KU Marketplace" };

/**
 * The "Me" page, in the shape students already know from Shopee and Lazada:
 * who you are in a coloured header, your deals as a row of status shortcuts
 * with counts, your selling tools as a second row, membership as a banner,
 * then the account settings as a plain list. On a wide screen the header and
 * settings become a left rail, like those sites' web account pages.
 */
export default async function AccountPage() {
  const t = await getCopy();
  if (!(await getAccessToken())) {
    redirect("/login");
  }

  const viewerId = await getCurrentUserId();
  // One round of requests, all at once. The public profile only serves
  // active accounts; a restricted one still gets its page, just without the
  // public counts.
  const [me, membership, transactions, offers, publicProfile] =
    await Promise.all([
      getMe(),
      getMembership(),
      getTransactions().catch(() => []),
      getMyOffers().catch(() => []),
      viewerId ? getSeller(viewerId).catch(() => null) : null,
    ]);
  const name =
    [me.firstNameEn, me.lastNameEn].filter(Boolean).join(" ") || me.email;
  // The Thai name is the part you can edit, so the page leads with it; the
  // English name from the university system sits under it.
  const thaiName = [me.firstNameTh, me.lastNameTh].filter(Boolean).join(" ");

  const mine = transactions.filter(
    (tx) => tx.buyer_id === me.userId || tx.seller_id === me.userId,
  );
  const count = (...statuses: string[]) =>
    mine.filter((tx) => statuses.includes(tx.status)).length;

  const deals = [
    { status: "Pending", label: "Waiting to pay", icon: Hourglass, count: count("Pending") },
    { status: "Processing", label: "In progress", icon: Truck, count: count("Processing") },
    { status: "Completed", label: "Completed", icon: CheckCircle2, count: count("Completed") },
    {
      // A group the History filter knows by this name, not a backend status.
      status: "ended-badly",
      label: "Cancelled & refunds",
      icon: RotateCcw,
      count: count("Cancelled", "Pending Refund", "Refunded"),
    },
  ];

  const selling = [
    { href: "/post", label: "Post an item", icon: Plus, count: 0 },
    { href: "/inventory", label: "My inventory", icon: Package, count: 0 },
    {
      href: "/offers",
      label: "Offers to answer",
      icon: Handshake,
      count: offersNeedingAnswer(offers, me.userId),
    },
    { href: "/giveaway", label: "Giveaways", icon: Gift, count: 0 },
  ];

  const settings = [
    { href: "/account/following", label: t("seller.directory"), icon: Users },
    { href: "/account/membership", label: t("account.membership"), icon: Crown },
    { href: "/account/appeals", label: t("account.appeals"), icon: Scale },
    { href: "/account/delete", label: t("account.close"), icon: Trash2 },
  ];

  const header = (
    <ProfileCard
      name={thaiName || name}
      subtitle={thaiName ? name : null}
      avatar={<HeroAvatar name={name} avatarUrl={me.avatarUrl} />}
      tier={membership.tier}
      stats={[
        { label: "Listings", value: publicProfile?.active_listing_count ?? 0 },
        { label: "Followers", value: publicProfile?.follower_count ?? 0 },
        { label: "Completed", value: count("Completed") },
      ]}
      actions={
        <>
          <ProfileCardLink href="/account/edit" icon={<Pencil aria-hidden />}>
            {t("account.editProfile")}
          </ProfileCardLink>
          <ProfileCardLink
            href={`/sellers/${me.userId}`}
            icon={<Store aria-hidden />}
          >
            My shop page
          </ProfileCardLink>
        </>
      }
    />
  );

  const settingsList = (
    <nav aria-label={t("account.settings")}>
      <h2 className="mb-2 px-1 text-body-sm font-semibold text-ink-secondary">
        {t("account.settings")}
      </h2>
      <Surface shape="card" className="overflow-hidden p-0">
        <ul className="divide-y divide-line">
          {settings.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-13 items-center gap-3 px-4 text-body transition-colors hover:bg-gray-50"
              >
                <Icon aria-hidden className="size-5 shrink-0 text-ink-muted" />
                <span className="flex-1">{label}</span>
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-ink-muted"
                />
              </Link>
            </li>
          ))}
          <li>
            <form action={logout}>
              <button
                type="submit"
                className="flex min-h-13 w-full items-center gap-3 px-4 text-left text-body text-tone-danger-fg transition-colors hover:bg-tone-danger-bg"
              >
                <LogOut aria-hidden className="size-5 shrink-0" />
                {t("account.signOut")}
              </button>
            </form>
          </li>
        </ul>
      </Surface>
    </nav>
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 pb-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="flex flex-col gap-5 lg:sticky lg:top-24">
        {header}
        <div className="hidden lg:block">{settingsList}</div>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <ShortcutCard
          title="My deals"
          action={{ href: "/history", label: "View all" }}
          items={deals.map(({ status, ...deal }) => ({
            ...deal,
            href: `/history?status=${encodeURIComponent(status)}`,
          }))}
        />
        <ShortcutCard title="My selling" items={selling} />

        <Link
          href="/account/membership"
          className="flex items-center gap-4 rounded-card border border-line bg-surface px-5 py-4 text-ink transition-colors hover:bg-surface-sunken"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--membership-bg)] text-[var(--membership-fg)]">
            <Crown aria-hidden className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">
              {membership.tier === "Free"
                ? "Upgrade your membership"
                : `${membership.tier} member`}
            </span>
            <span className="text-body-sm">
              {membership.tier === "Free"
                ? "List more items every month"
                : "See your plan and listing quota"}
            </span>
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0" />
        </Link>

        <Link
          href={`/sellers/${me.userId}`}
          className="flex items-center gap-3 rounded-card border border-line px-5 py-3.5 text-body-sm text-ink-secondary transition-colors hover:bg-gray-50"
        >
          <Eye aria-hidden className="size-4 shrink-0 text-ink-muted" />
          <span className="flex-1">See your profile the way other students do</span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
        </Link>

        <div className="lg:hidden">{settingsList}</div>
      </div>
    </div>
  );
}

/** A titled row of icon shortcuts with counts, like a shop app's order row. */
function ShortcutCard({
  title,
  action,
  items,
}: {
  title: string;
  action?: { href: string; label: string };
  items: Array<{
    href: string;
    label: string;
    icon: typeof Package;
    count: number;
  }>;
}) {
  return (
    <Surface as="section" shape="card" className="overflow-hidden p-0">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4">
        <h2 className="text-body font-semibold">{title}</h2>
        {action ? (
          <Link
            href={action.href}
            className="touch-link flex items-center gap-0.5 text-body-sm text-ink-muted hover:text-ink-brand"
          >
            {action.label}
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        ) : null}
      </div>
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon, count }) => (
          <li key={label}>
            <Link
              href={href}
              className="flex min-h-24 flex-col items-center justify-center gap-2 px-1 py-3 text-center transition-colors hover:bg-gray-50"
            >
              <span className="relative">
                <Icon aria-hidden className="size-7 text-ink-secondary" strokeWidth={1.6} />
                {count > 0 ? (
                  <span
                    data-numeric
                    className="absolute -right-2.5 -top-1.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-pill bg-tone-danger-solid px-1 text-[0.66rem] font-semibold leading-none text-white"
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
              </span>
              <span className="text-meta leading-tight text-ink-secondary">
                {label}
                {count > 0 ? <span className="sr-only"> ({count})</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
