import { Wallet } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { getCopy } from "@/lib/copy";

import { Notice } from "./notice";

/**
 * The API refuses a sale or sale-or-trade post until the seller has a
 * PromptPay number, so the listing forms say so before Publish rather than
 * letting the request fail. `message` swaps the reason, for a buyer who is
 * owed a refund.
 */
export function PromptPayNotice({ message }: { message?: string } = {}) {
  const t = getCopy("listing");
  return (
    <Notice
      tone="warning"
      icon={Wallet}
      contentClassName="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <p className="flex-1 text-body-sm">{message ?? t("promptPayNeeded")}</p>
      <LinkButton href="/account/edit" variant="secondary">
        {t("promptPayAction")}
      </LinkButton>
    </Notice>
  );
}
