import { getCopy } from "@/lib/copy";
export async function SellerLoading() {
  const t = await getCopy("seller");
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">{t("loading")}</span>
      <div className="h-56 rounded-panel bg-surface-sunken motion-safe:animate-pulse" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 rounded-card bg-surface-sunken motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
