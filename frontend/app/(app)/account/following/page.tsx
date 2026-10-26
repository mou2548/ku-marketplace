import Link from "next/link";
import { redirect } from "next/navigation";
import { getCopy } from "@/lib/copy";
import { ArrowLeft, Users } from "lucide-react";
import { getAccessToken } from "@/lib/api/session";
import { getFollowing } from "@/lib/api/sellers";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import {
  FollowButton,
  RefreshOnFocus,
} from "@/components/features/sellers/actions";
import { SellerPagination } from "@/components/features/sellers/pagination";

export const metadata = { title: "Following - KU Marketplace" };
export default async function FollowingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const token = await getAccessToken();
  if (!token) redirect("/login");
  const t = await getCopy("seller");
  const raw = (await searchParams).page ?? "1";
  const page = /^[1-9]\d{0,4}$/.test(raw) ? Number(raw) : 1;
  const result = await getFollowing(token, page);
  return (
    <div className="flex flex-col gap-6 pb-8">
      <RefreshOnFocus />
      <Link
        href="/account"
        className="flex min-h-11 w-fit items-center gap-2 text-ink-brand"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t("account")}
      </Link>
      <header>
        <h1 className="text-h1">{t("directory")}</h1>
        <p className="mt-2 text-body text-ink-secondary">
          {t("directoryHint")}
        </p>
      </header>
      {result.data.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {result.data.map((entry) => (
            <li key={entry.seller_id} className="min-w-0">
              <Surface
                shape="panel"
                className="flex h-full flex-col justify-between gap-5 p-5"
              >
                {entry.profile ? (
                  <Link
                    href={`/sellers/${entry.seller_id}`}
                    className="block min-h-11 rounded-control"
                  >
                    <TrustBadge
                      name={entry.profile.name}
                      avatarUrl={entry.profile.avatar_url}
                      isVerified={entry.profile.is_verified}
                    />
                    <p className="mt-3 text-body-sm text-ink-secondary">
                      {t("listings", {
                        count: entry.profile.active_listing_count,
                      })}
                    </p>
                  </Link>
                ) : (
                  <p className="text-body text-ink-secondary">
                    {t("unavailable")}
                  </p>
                )}
                <FollowButton sellerId={entry.seller_id} following directory />
              </Surface>
            </li>
          ))}
        </ul>
      ) : (
        <Surface
          shape="panel"
          className="flex flex-col items-center gap-4 p-10 text-center"
        >
          <Users aria-hidden className="size-10 text-ink-muted" />
          <h2 className="text-h2">{t("noFollowing")}</h2>
          <p className="text-body-sm text-ink-secondary">
            {t("directoryHint")}
          </p>
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center px-4 text-ink-brand"
          >
            {t("back")}
          </Link>
        </Surface>
      )}
      <SellerPagination
        pathname="/account/following"
        query={new URLSearchParams()}
        {...result.meta}
      />
    </div>
  );
}
