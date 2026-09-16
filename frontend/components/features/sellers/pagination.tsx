import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function SellerPagination({
  pathname,
  query,
  page,
  totalPages,
}: {
  pathname: string;
  query: URLSearchParams;
  page: number;
  totalPages: number;
}) {
  const t = await getTranslations("seller");
  if (totalPages < 2 && page === 1) return null;
  const href = (value: number) => {
    const params = new URLSearchParams(query);
    params.set("page", String(value));
    return `${pathname}?${params}`;
  };
  const pages = [
    ...new Set([
      1,
      ...[page - 1, page, page + 1].filter((p) => p > 0 && p <= totalPages),
      totalPages,
    ]),
  ]
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  return (
    <nav
      aria-label={t("pagination")}
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="grid min-h-11 min-w-11 place-items-center rounded-control px-3"
        >
          {t("previous")}
        </Link>
      ) : null}
      {pages.map((value) => (
        <Link
          key={value}
          href={href(value)}
          aria-current={value === page ? "page" : undefined}
          className={`grid min-h-11 min-w-11 place-items-center rounded-control px-3 ${value === page ? "bg-brand-subtle font-bold text-ink-brand" : "hover:bg-surface-sunken"}`}
        >
          {value}
        </Link>
      ))}
      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="grid min-h-11 min-w-11 place-items-center rounded-control px-3"
        >
          {t("next")}
        </Link>
      ) : null}
    </nav>
  );
}
