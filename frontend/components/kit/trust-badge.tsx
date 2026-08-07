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
  size?: "sm" | "md";
  className?: string;
}

export function TrustBadge({
  name,
  isVerified = true,
  faculty,
  year,
  avatarUrl,
  size = "md",
  className,
}: TrustBadgeProps) {
  const initials = name.trim().slice(0, 2);
  const meta = [faculty, year ? `Year ${year}` : null].filter(Boolean).join(" · ");

  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-pill bg-brand-subtle font-semibold text-ink-brand",
          size === "sm" ? "size-6 text-[0.6875rem]" : "size-9 text-[0.8125rem]",
        )}
        style={
          avatarUrl
            ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover" }
            : undefined
        }
      >
        {avatarUrl ? null : initials}
      </span>

      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "flex items-center gap-1 truncate font-medium",
            size === "sm" ? "text-[0.75rem]" : "text-[0.875rem]",
          )}
        >
          {name}
          {isVerified ? (
            <>
              <BadgeCheck
                aria-hidden
                className={cn(
                  "shrink-0 text-brand",
                  size === "sm" ? "size-3.5" : "size-4",
                )}
              />
              <span className="sr-only">Verified with a KU email address</span>
            </>
          ) : null}
        </span>
        {meta && size === "md" ? (
          <span className="truncate text-[0.75rem] leading-[1.4] text-ink-muted">
            {meta}
          </span>
        ) : null}
      </span>
    </span>
  );
}
