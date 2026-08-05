import Image from "next/image";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HeroBadge {
  icon?: LucideIcon;
  label: string;
  className: string;
}

export function ItemDetailHero({
  badges,
  image,
  alt,
  unoptimized,
}: {
  badges: HeroBadge[];
  image?: string;
  alt?: string;
  unoptimized?: boolean;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-white shadow-elevated">
      {image ? (
        <div className="relative h-[480px] w-full bg-[#E5E7EB]">
          <Image
            src={image}
            alt={alt ?? ""}
            fill
            unoptimized={unoptimized}
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-[480px] w-full animate-pulse bg-[#E5E7EB]" />
      )}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <Badge
              key={badge.label}
              className={cn(
                "h-auto gap-1.5 px-4 py-2 text-xs font-medium backdrop-blur-[6px]",
                badge.className
              )}
            >
              {Icon && <Icon className="size-3.5" />}
              {badge.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
