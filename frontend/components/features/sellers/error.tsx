"use client";
import { getCopy } from "@/lib/copy";
import { Button } from "@/components/kit/button";
export function SellerError({ reset }: { reset: () => void }) {
  const t = getCopy("seller");
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-panel bg-surface-sunken p-6"
    >
      <h2 className="text-h2">{t("loadError")}</h2>
      <Button onPress={reset}>{t("retry")}</Button>
    </div>
  );
}
