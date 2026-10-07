import Link from "next/link";
import { Crown, ShieldCheck } from "lucide-react";

import { Surface } from "@/components/kit/surface";
import { UserAvatar } from "@/components/kit/user-avatar";
import { cn } from "@/lib/utils";

export interface ProfileStat {
  label: string;
  value: number | string;
}

/**
 * The one profile card: a green header with the photo, name, verification
 * and up to three stats, then a row of actions underneath. The account page,
 * every seller page and the edit-profile preview all use it, so a person's
 * card looks the same wherever it is shown.
 */
export function ProfileCard({
  name,
  subtitle,
  avatarUrl,
  avatar,
  verified = true,
  tier,
  stats = [],
  headerAction,
  actions,
  as = "h1",
  className,
}: {
  name: string;
  /** A second line under the name, e.g. the English name. */
  subtitle?: string | null;
  avatarUrl?: string | null;
  /** Replaces the plain avatar, e.g. with one that can be changed. */
  avatar?: React.ReactNode;
  verified?: boolean;
  /** Membership tier; shown when it is not Free. */
  tier?: string | null;
  stats?: ProfileStat[];
  /** Inside the green header, under the stats (e.g. Follow). */
  headerAction?: React.ReactNode;
  /** The row under the header; each child gets an equal column. */
  actions?: React.ReactNode;
  as?: "h1" | "h2" | "p";
  className?: string;
}) {
  const Name = as;
  return (
    <Surface shape="panel" className={cn("overflow-hidden p-0", className)}>
      <div className="relative overflow-hidden bg-brand-strong px-5 pb-5 pt-6 text-on-brand-strong">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full border-[22px] border-on-brand-strong/5"
        />
        <div className="relative flex items-center gap-4">
          {avatar ?? (
            <UserAvatar
              name={name}
              avatarUrl={avatarUrl}
              size="lg"
              className="border-2 border-on-brand-strong/40 bg-on-brand-strong/10 text-on-brand-strong"
            />
          )}
          <div className="min-w-0">
            <Name className="break-words text-h3 font-semibold">{name}</Name>
            {subtitle ? (
              <p className="break-words text-body-sm text-on-brand-strong/85">
                {subtitle}
              </p>
            ) : null}
            {verified ? (
              <p className="mt-1 flex items-center gap-1.5 text-meta text-on-brand-strong/85">
                <ShieldCheck aria-hidden className="size-4 shrink-0" />
                Verified KU student
              </p>
            ) : null}
            {tier && tier !== "Free" ? (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-pill bg-on-brand-strong/15 px-2 py-0.5 text-meta font-medium">
                <Crown aria-hidden className="size-3.5" />
                {tier}
              </p>
            ) : null}
          </div>
        </div>
        {stats.length ? (
        <dl
          className="relative mt-5 grid text-center"
          style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
        >
          {stats.map(({ label, value }) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="text-meta text-on-brand-strong/80">{label}</dt>
              {/* Counts read big; a text value such as a join date is
                  longer, so it drops a size and stays on one line, sitting on
                  the same baseline as the counts beside it. */}
              {typeof value === "number" ? (
                <dd data-numeric className="text-h3 font-semibold">
                  {value.toLocaleString("en-GB")}
                </dd>
              ) : (
                <dd className="whitespace-nowrap pb-1 text-body font-semibold">
                  {value}
                </dd>
              )}
            </div>
          ))}
        </dl>
        ) : null}
        {headerAction ? (
          <div className="relative mt-5 [&>div]:w-full">{headerAction}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex divide-x divide-line [&>*]:flex-1">{actions}</div>
      ) : null}
    </Surface>
  );
}

/** One cell of the action row under the card. */
export function ProfileCardLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center justify-center gap-2 px-2 text-body-sm font-medium text-ink-brand hover:bg-brand-subtle [&_svg]:size-4"
    >
      {icon}
      {children}
    </Link>
  );
}
