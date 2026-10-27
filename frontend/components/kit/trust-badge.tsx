import { getCopy } from "@/lib/copy";
import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Research trust gap T1 and design principle 3.
 *
 * Money moves by bank transfer, outside the platform. There is no escrow. The
 * only thing separating this from a Facebook group is that every account is
 * tied to a verified @ku.th address — so verification appears wherever a
 * person appears, not buried in a profile page.
 */
export interface TrustBadgeProps {
  name: string;
  isVerified?: boolean;
  faculty?: string | null;
  year?: number | null;
  avatarUrl?: string | null;
  /**
   * `lg` stacks the avatar above the name and is for the one screen where the
   * person is the subject rather than an attribution — the account rail. At
   * `sm` and `md` the badge stays inline, because everywhere else it is a
   * caption on something else.
   */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const AVATAR_SIZE: Record<NonNullable<TrustBadgeProps["size"]>, string> = {
  sm: "size-6 text-meta",
  md: "size-9 text-caption",
  lg: "size-16 text-[1.25rem]",
};

const NAME_SIZE: Record<NonNullable<TrustBadgeProps["size"]>, string> = {
  sm: "text-meta",
  md: "text-body-sm",
  lg: "text-[1.25rem] leading-[1.3] font-semibold",
};

export function TrustBadge({
  name,
  isVerified = true,
  faculty,
  year,
  avatarUrl,
  size = "md",
  className,
}: TrustBadgeProps) {
  const t = getCopy();
  const initials = name.trim().slice(0, 2);
  const meta = [faculty, year ? `Year ${year}` : null].filter(Boolean).join(" · ");
  const stacked = size === "lg";

  return (
    <span
      className={cn(
        "flex",
        stacked ? "flex-col items-start gap-3" : "items-center gap-2",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-pill bg-brand-subtle font-semibold text-ink-brand",
          AVATAR_SIZE[size],
        )}
        style={
          avatarUrl
            ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover" }
            : undefined
        }
      >
        {avatarUrl ? null : initials}
      </span>

      <span className={cn("flex min-w-0 flex-col", stacked && "gap-1")}>
        <span
          className={cn(
            "flex items-center gap-1 truncate font-medium",
            NAME_SIZE[size],
          )}
        >
          {name}
          {isVerified ? (
            <>
              <BadgeCheck
                aria-hidden
                className={cn(
                  "shrink-0 text-brand",
                  size === "sm" && "size-3.5",
                  size === "md" && "size-4",
                  stacked && "size-5",
                )}
              />
              <span className="sr-only">{t("card.verified")}</span>
            </>
          ) : null}
        </span>
        {meta && size !== "sm" ? (
          <span
            className={cn(
              "truncate text-ink-muted",
              stacked
                ? "text-body-sm"
                : "text-meta leading-[1.4]",
            )}
          >
            {meta}
          </span>
        ) : null}
      </span>
    </span>
  );
}
