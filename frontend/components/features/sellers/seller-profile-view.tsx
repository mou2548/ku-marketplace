import { formatDate } from "@/lib/date-format";
import Link from "next/link";
import { getCopy } from "@/lib/copy";
import {
  ArrowLeft,
  Package,
  ShieldCheck,
  Users,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Surface } from "@/components/kit/surface";
import { UserAvatar } from "@/components/kit/user-avatar";
import { SellerFilterSelect } from "@/components/features/sellers/filter-select";
import { PostCard } from "@/components/kit/post-card";
import {
  FollowButton,
  SellerActions,
  RefreshOnFocus,
} from "@/components/features/sellers/actions";
import { SellerPagination } from "@/components/features/sellers/pagination";
import type { getSellerPosts, SellerProfile } from "@/lib/api/sellers";
import { CATEGORY_OPTIONS } from "@/lib/categories";

const linkClass =
  "inline-flex min-h-11 items-center gap-2 rounded-control px-3 font-medium text-ink-brand hover:bg-brand-subtle";
const fieldClass =
  "min-h-11 w-full min-w-0 rounded-control border border-line bg-surface px-3 text-body-sm text-ink";

type Listings = Awaited<ReturnType<typeof getSellerPosts>>;

/** The listing filters a profile page accepts, cleaned of anything else. */
export function parseSellerQuery(
  raw: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const query = new URLSearchParams();
  for (const key of ["q", "category", "type", "sort", "page"])
    if (typeof raw[key] === "string") query.set(key, raw[key]);
  if (!["all", "sell", "trade"].includes(query.get("type") ?? "all"))
    query.delete("type");
  if (
    !["latest", "price_asc", "price_desc"].includes(
      query.get("sort") ?? "latest",
    )
  )
    query.delete("sort");
  if (!/^[1-9]\d{0,4}$/.test(query.get("page") ?? "1")) query.delete("page");
  query.set("q", (query.get("q") ?? "").slice(0, 150));
  query.set("category", (query.get("category") ?? "").slice(0, 50));
  return query;
}

/**
 * A person's profile: who they are, then what they have listed. The public
 * seller page and the owner's own `/account` both render this, so what you
 * see of yourself is what other students see of you.
 *
 * `mine` swaps Follow for the owner's own actions; `avatar`, `ownerActions`,
 * `extraFacts` and `children` let `/account` add its photo upload, account
 * facts and settings without forking the layout.
 */
export async function SellerProfileView({
  profile,
  listings,
  query,
  pathname,
  signedIn,
  following,
  mine,
  avatarUrl,
  avatar,
  ownerActions,
  extraFacts,
  children,
}: {
  profile: SellerProfile;
  listings: Listings;
  query: URLSearchParams;
  pathname: string;
  signedIn: boolean;
  following: boolean | null;
  mine: boolean;
  avatarUrl?: string | null;
  avatar?: React.ReactNode;
  ownerActions?: React.ReactNode;
  extraFacts?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const t = await getCopy("seller");
  const id = profile.user_id;
  const hasFilters = Boolean(
    query.get("q") ||
    query.get("category") ||
    (query.get("type") && query.get("type") !== "all"),
  );
  const href = (changes: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(query);
    if (resetPage) next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    return `${pathname}?${next}`;
  };
  const category = query.get("category") ?? "";
  const sort = query.get("sort") ?? "latest";
  const type = query.get("type") ?? "all";
  const categoryOptions = [
    { value: "", label: t("allProducts") },
    ...CATEGORY_OPTIONS.map((value) => ({
      value,
      label: t(`categories.${value}`),
    })),
  ];
  return (
    <div className="flex min-w-0 flex-col gap-6 pb-8">
      <RefreshOnFocus />
      <Link href="/feed" className={`${linkClass} w-fit`}>
        <ArrowLeft aria-hidden className="size-4" />
        {t("back")}
      </Link>
      <Surface shape="panel" className="p-4 sm:p-5">
        <header className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-center lg:gap-8">
          <div className="relative min-w-0 overflow-hidden rounded-control bg-brand-strong p-5 text-on-brand-strong">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full border-[24px] border-on-brand-strong/5"
            />
            <div className="relative flex min-w-0 items-center gap-4">
              {avatar ?? (
                <UserAvatar
                  name={profile.name}
                  avatarUrl={avatarUrl}
                  size="lg"
                  className="border-2 border-on-brand-strong/40 bg-on-brand-strong/10 text-on-brand-strong"
                />
              )}
              <div className="min-w-0">
                <p className="mb-1 text-meta text-on-brand-strong/80">
                  {t("profile")}
                </p>
                <h1 className="break-words text-h3 font-semibold">
                  {profile.name}
                </h1>
                {profile.is_verified ? (
                  <p className="mt-2 flex items-center gap-1.5 text-meta">
                    <ShieldCheck aria-hidden className="size-4 shrink-0" />
                    {t("verified")}
                  </p>
                ) : null}
              </div>
            </div>
            <div
              className={`relative mt-5 flex flex-wrap items-center gap-2 [&>div]:w-full ${mine ? "rounded-control bg-surface p-2 text-ink" : ""}`}
            >
              {mine ? (
                (ownerActions ?? (
                  <>
                    <Link className={linkClass} href="/account/edit">
                      {t("edit")}
                    </Link>
                    <Link className={linkClass} href="/inventory">
                      {t("manage")}
                    </Link>
                  </>
                ))
              ) : (
                <FollowButton
                  sellerId={id}
                  appearance="profile"
                  signedIn={signedIn}
                  following={following}
                />
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <div className="flex items-center gap-3 text-body-sm">
                <Package
                  aria-hidden
                  className="size-5 shrink-0 text-ink-muted"
                />
                <dt>{t("productsLabel")}</dt>
                <dd className="font-semibold text-ink-brand">
                  {profile.active_listing_count.toLocaleString("en-GB")}
                </dd>
              </div>
              <div className="flex items-center gap-3 text-body-sm">
                <Users aria-hidden className="size-5 shrink-0 text-ink-muted" />
                <dt>{t("followersLabel")}</dt>
                <dd className="font-semibold text-ink-brand">
                  <span aria-hidden>
                    {profile.follower_count.toLocaleString("en-GB")}
                  </span>
                  <span className="sr-only">
                    {t("followers", { count: profile.follower_count })}
                  </span>
                </dd>
              </div>
              {extraFacts}
              {profile.member_since ? (
                <div className="flex flex-wrap items-center gap-3 text-body-sm sm:col-span-2">
                  <CalendarDays
                    aria-hidden
                    className="size-5 shrink-0 text-ink-muted"
                  />
                  <dt>{t("joinedLabel")}</dt>
                  <dd className="text-ink-brand">
                    {formatDate(new Date(profile.member_since))}
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="border-t border-line pt-3">
              <SellerActions sellerId={id} report={signedIn && !mine} />
            </div>
          </div>
        </header>
      </Surface>
      {children}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside aria-label={t("category")} className="min-w-0">
          <h2 className="mb-3 flex min-h-11 items-center gap-2 border-b border-line pb-3 text-body font-semibold">
            <List aria-hidden className="size-4" />
            {t("category")}
          </h2>
          <nav
            aria-label={t("category")}
            className="hidden flex-col gap-1 lg:flex"
          >
            {categoryOptions.map((option) => (
              <Link
                key={option.value}
                href={href({ category: option.value })}
                scroll={false}
                aria-current={category === option.value ? "true" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-control px-2 py-2 text-body-sm ${category === option.value ? "bg-brand-subtle font-semibold text-ink-brand" : "text-ink-secondary hover:bg-surface-sunken"}`}
              >
                <ChevronRight
                  aria-hidden
                  className={`size-3 shrink-0 ${category === option.value ? "" : "invisible"}`}
                />
                {option.label}
              </Link>
            ))}
          </nav>
          <SellerFilterSelect
            pathname={pathname}
            query={query.toString()}
            name="category"
            value={category}
            label={t("category")}
            options={categoryOptions}
            className={`${fieldClass} lg:hidden`}
          />
        </aside>
        <section
          aria-labelledby="seller-listings"
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 id="seller-listings" className="text-h2">
              {t("products")}
            </h2>
            <form
              key={query.toString()}
              action={pathname}
              className="flex min-w-0 items-center gap-2 sm:w-80"
            >
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="sort" value={sort} />
              <input
                aria-label={t("search")}
                className={fieldClass}
                name="q"
                defaultValue={query.get("q") ?? ""}
                maxLength={150}
                placeholder={t("searchPlaceholder")}
              />
              <button
                aria-label={t("apply")}
                type="submit"
                className="grid size-11 shrink-0 place-items-center rounded-control bg-brand-subtle text-ink-brand"
              >
                <Search aria-hidden className="size-4" />
              </button>
            </form>
          </div>
          <nav
            aria-label={t("type")}
            className="flex gap-2 border-b border-line pb-3"
          >
            {["all", "sell", "trade"].map((value) => (
              <Link
                key={value}
                href={href({ type: value })}
                scroll={false}
                aria-current={type === value ? "true" : undefined}
                className={`inline-flex min-h-11 items-center rounded-control px-4 text-body-sm ${type === value ? "bg-brand-subtle font-semibold text-ink-brand" : "text-ink-secondary hover:bg-surface-sunken"}`}
              >
                {t(value)}
              </Link>
            ))}
          </nav>
          <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-control bg-surface-sunken p-3">
            <span className="mr-1 text-body-sm text-ink-secondary">
              {t("sort")}
            </span>
            <Link
              href={href({ sort: "latest" })}
              scroll={false}
              aria-current={sort === "latest" ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-control px-4 text-body-sm font-medium ${sort === "latest" ? "bg-brand-strong text-on-brand-strong" : "bg-surface text-ink"}`}
            >
              {t("latest")}
            </Link>
            <SellerFilterSelect
              pathname={pathname}
              query={query.toString()}
              name="sort"
              value={sort === "latest" ? "" : sort}
              label={t("priceSort")}
              options={[
                { value: "", label: t("price") },
                { value: "price_asc", label: t("price_asc") },
                { value: "price_desc", label: t("price_desc") },
              ]}
              className={`min-h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-body-sm sm:max-w-52 ${sort !== "latest" ? "font-semibold text-ink-brand" : "text-ink"}`}
            />
            <nav
              aria-label={t("quickPagination")}
              className="ml-auto flex items-center gap-2"
            >
              <span className="px-2 text-body-sm">
                <span className="font-semibold text-ink-brand">
                  {listings.meta.page}
                </span>{" "}
                / {Math.max(1, listings.meta.totalPages)}
              </span>
              {listings.meta.page > 1 ? (
                <Link
                  aria-label={t("previous")}
                  href={href({ page: String(listings.meta.page - 1) }, false)}
                  className="grid size-11 place-items-center rounded-control bg-surface"
                >
                  <ChevronLeft aria-hidden className="size-4" />
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  aria-label={t("previous")}
                  className="grid size-11 place-items-center rounded-control bg-surface text-ink-muted opacity-40"
                >
                  <ChevronLeft aria-hidden className="size-4" />
                </span>
              )}
              {listings.meta.page < listings.meta.totalPages ? (
                <Link
                  aria-label={t("next")}
                  href={href({ page: String(listings.meta.page + 1) }, false)}
                  className="grid size-11 place-items-center rounded-control bg-surface"
                >
                  <ChevronRight aria-hidden className="size-4" />
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  aria-label={t("next")}
                  className="grid size-11 place-items-center rounded-control bg-surface text-ink-muted opacity-40"
                >
                  <ChevronRight aria-hidden className="size-4" />
                </span>
              )}
            </nav>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-body-sm text-ink-secondary">
              {t("results", { count: listings.meta.total })}
            </p>
            {hasFilters ? (
              <Link href={pathname} className={linkClass}>
                {t("clear")}
              </Link>
            ) : null}
          </div>
          {listings.data.length ? (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {listings.data.map((post) => (
                <li key={post.post_id} className="min-w-0">
                  <PostCard
                    className="h-full rounded-card bg-surface p-2 shadow-flat"
                    aspectRatio={1}
                    postId={post.post_id}
                    name={post.item.name}
                    price={post.price}
                    postType={post.post_type}
                    condition={post.item.condition}
                    imageUrl={
                      post.item.images.find((image) => image.is_primary)
                        ?.image_url ?? post.item.images[0]?.image_url
                    }
                    courseName={post.item.course_name}
                    seller={post.seller}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Surface
              shape="panel"
              className="flex flex-col items-center gap-3 p-10 text-center"
            >
              <Package aria-hidden className="size-10 text-ink-muted" />
              <h3 className="text-h3">
                {t(hasFilters ? "noMatches" : mine ? "emptyMine" : "empty")}
              </h3>
              <p className="text-body-sm text-ink-secondary">
                {t(
                  hasFilters
                    ? "noMatchesHint"
                    : mine
                      ? "emptyMineHint"
                      : "emptyHint",
                )}
              </p>
              <Link
                className={linkClass}
                href={hasFilters ? pathname : mine ? "/inventory" : "/feed"}
              >
                {t(hasFilters ? "clear" : mine ? "manage" : "back")}
              </Link>
            </Surface>
          )}
          <SellerPagination pathname={pathname} query={query} {...listings.meta} />
        </section>
      </div>
    </div>
  );
}
