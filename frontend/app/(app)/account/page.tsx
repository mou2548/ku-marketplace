import Link from "next/link";
import { redirect } from "next/navigation";
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
import { TwoColumn } from "@/components/kit/two-column";
import { logout } from "@/lib/actions/auth";
import { getMembership } from "@/lib/api/membership";
import { getAccessToken } from "@/lib/api/session";
import { getTransactions } from "@/lib/api/transactions";
import { getMe, toUser } from "@/lib/api/users";

import { ProfileFields } from "./profile-fields";

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
  if (!(await getAccessToken())) {
    redirect("/login");
  }

  const [me, membership, transactions] = await Promise.all([
    getMe(),
    getMembership(),
    getTransactions(),
  ]);

  const profile = toUser(me);
  const displayName =
    [me.firstNameEn, me.lastNameEn].filter(Boolean).join(" ") || me.email;

  // faculty / year / avatar are not on `GET /users/me` (docs/design/api-gaps.md
  // §3). Every account is a verified `@ku.th` address, so `isVerified` is a
  // fact, not a guess.
  const viewer = {
    name: displayName,
    isVerified: true,
    faculty: null as string | null,
    year: null as number | null,
    avatar_url: null as string | null,
  };

  const completed = transactions.filter(
    (t) =>
      t.status === "Completed" &&
      (t.buyer_id === me.userId || t.seller_id === me.userId),
  ).length;

  /** Shown at every width. */
  const rows = [
    { href: "/account/membership", label: "Membership", icon: Crown },
    { href: "/account/appeals", label: "My appeals", icon: Scale },
    { href: "/account/delete", label: "Close account", icon: Trash2 },
  ];

  /**
   * Who you are on the left, what you can change on the right. As one centred
   * column this screen used 47% of a 1440px window; the two facts another
   * student is actually asking about now hold the rail instead of scrolling
   * past above a list of four links.
   */
  const rail = (
    <Surface shape="card" className="flex flex-col gap-5 p-6">
      <p className="text-overline text-ink-muted uppercase">
        Your profile
      </p>

      <TrustBadge
        size="lg"
        name={viewer.name}
        isVerified={viewer.isVerified}
        faculty={viewer.faculty}
        year={viewer.year}
        avatarUrl={viewer.avatar_url}
      />

      <div className="flex flex-wrap gap-2.5">
        <span className="flex items-center gap-1.5 rounded-pill bg-tone-success-bg px-3 py-1.5 text-[0.875rem] font-medium text-tone-success-fg">
          <ShieldCheck aria-hidden className="size-4" />
          Verified KU student
        </span>
        <span
          data-numeric
          className="rounded-pill bg-gray-100 px-3 py-1.5 text-[0.875rem] font-medium text-ink-secondary"
        >
          {completed} completed {completed === 1 ? "deal" : "deals"}
        </span>
        {membership.tier !== "Free" ? (
          <span className="flex items-center gap-1.5 rounded-pill bg-amber-100 px-3 py-1.5 text-[0.875rem] font-medium text-amber-700">
            <Crown aria-hidden className="size-4" />
            {membership.tier}
          </span>
        ) : null}
      </div>
    </Surface>
  );

  return (
    <TwoColumn rail={rail} railSide="left" railFirst>
      <h1 className="text-h1">Account</h1>

      {/* The two form factors diverge here, and only here. A wide screen has
          room to show the whole profile and change one line in place; a phone
          gets the link out to a full-width form. */}
      <section className="hidden flex-col gap-3 lg:flex">
        <h2 className="text-overline text-ink-muted uppercase">Profile</h2>
        <ProfileFields
          profile={profile}
          faculty={viewer.faculty}
          year={viewer.year}
        />
      </section>

      <nav aria-label="Account settings">
        <ul className="flex flex-col gap-2">
          <li className="lg:hidden">
            <Link href="/account/edit">
              <Surface
                as="div"
                shape="card"
                elevation="raised"
                interactive
                className="flex min-h-16 items-center gap-4 px-5"
              >
                <Pencil
                  aria-hidden
                  className="size-[1.375rem] shrink-0 text-ink-muted"
                />
                <span className="flex-1 text-[1rem] font-medium">
                  Edit profile
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-ink-muted"
                />
              </Surface>
            </Link>
          </li>
          {rows.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href}>
                <Surface
                  as="div"
                  shape="card"
                  elevation="raised"
                  interactive
                  className="flex min-h-16 items-center gap-4 px-5"
                >
                  <Icon
                    aria-hidden
                    className="size-[1.375rem] shrink-0 text-ink-muted"
                  />
                  <span className="flex-1 text-[1rem] font-medium">{label}</span>
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

      <form action={logout}>
        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center gap-2 text-[0.9375rem] font-medium text-tone-danger-fg"
        >
          <LogOut aria-hidden className="size-4" />
          Sign out
        </button>
      </form>
    </TwoColumn>
  );
}
