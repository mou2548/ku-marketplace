import { BadgeCheck } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function OwnerCard({
  name,
  verified = true,
  verifiedColor = "#2E8F5A",
}: {
  name: string;
  verified?: boolean;
  verifiedColor?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-border/10 bg-[#F2F3FF] p-4">
      <Avatar className="size-11 border-2 border-white shadow-card">
        <AvatarImage src="" alt={name} />
        <AvatarFallback>{name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 items-center gap-1">
        <span className="text-sm font-bold tracking-[0.14px] text-foreground">
          {name}
        </span>
        {verified && (
          <BadgeCheck className="size-3.5" style={{ color: verifiedColor }} />
        )}
      </div>
      <Button
        variant="outline"
        className="border-[#2E8F5A] px-4 text-sm font-medium tracking-[0.14px] text-[#2E8F5A] hover:bg-[#2E8F5A]/5"
      >
        View Profile
      </Button>
    </div>
  );
}
