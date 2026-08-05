import { BadgeCheck } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VERIFIED_TIER_CLASSES = {
  default: "text-primary",
  gold: "text-warning-dark",
} as const;

export function OwnerCard({
  name,
  verified = true,
  verifiedTier = "default",
}: {
  name: string;
  verified?: boolean;
  verifiedTier?: keyof typeof VERIFIED_TIER_CLASSES;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-border/10 bg-surface-muted p-4">
      <Avatar className="size-11 shrink-0 border-2 border-white shadow-card">
        <AvatarImage src="" alt={name} />
        <AvatarFallback>{name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="truncate text-sm font-bold tracking-[0.14px] text-foreground">
          {name}
        </span>
        {verified && (
          <BadgeCheck
            className={cn("size-3.5 shrink-0", VERIFIED_TIER_CLASSES[verifiedTier])}
          />
        )}
      </div>
      <Button
        variant="outline"
        className="shrink-0 border-primary-dark px-4 text-sm font-medium tracking-[0.14px] text-primary-dark hover:bg-primary-dark/5"
      >
        View Profile
      </Button>
    </div>
  );
}
