import Link from "next/link";
import { getCopy } from "@/lib/copy";
export default async function SellerNotFound() {
  const t = await getCopy("seller");
  return (
    <section className="space-y-4 py-12 text-center">
      <h1 className="text-h1">{t("unavailable")}</h1>
      <Link
        href="/feed"
        className="inline-flex min-h-11 items-center px-4 text-ink-brand"
      >
        {t("back")}
      </Link>
    </section>
  );
}
