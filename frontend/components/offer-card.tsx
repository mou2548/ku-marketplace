import Image from "next/image";
import Link from "next/link";
import { ArrowLeftRight, Coins } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getItem } from "@/lib/items";
import {
  OFFER_STATUS_LABELS,
  getPost,
  offeredItems,
  type Offer,
  type OfferStatus,
} from "@/lib/offers";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<OfferStatus, string> = {
  pending: "bg-warning-bg text-warning-dark",
  accepted: "bg-primary-light text-primary-dark",
  rejected: "bg-error-bg text-error",
  "auto-rejected": "bg-error-bg text-error",
  withdrawn: "bg-surface-muted text-muted-foreground",
};

function Thumb({ name, image }: { name: string; image: string }) {
  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border/30 bg-white">
      <Image src={image} alt={name} fill sizes="64px" className="object-cover" />
    </div>
  );
}

export function OfferCard({
  offer,
  direction,
}: {
  offer: Offer;
  /** "received" = someone wants my item; "sent" = I want theirs. */
  direction: "received" | "sent";
}) {
  const post = getPost(offer.postId);
  const target = post ? getItem(post.itemId) : undefined;
  const offered = offeredItems(offer);

  return (
    <Card
      className={cn(
        "flex-col gap-4 rounded-3xl p-5 shadow-card ring-0",
        offer.status !== "pending" && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {direction === "received"
            ? `${offer.fromName} เสนอแลกกับสินค้าของคุณ`
            : `คุณยื่นข้อเสนอกับโพสต์ของ ${post?.ownerId ?? "ผู้ขาย"}`}
        </span>
        <Badge
          className={cn(
            "h-auto shrink-0 px-3 py-1 text-xs whitespace-nowrap",
            STATUS_CLASS[offer.status]
          )}
        >
          {OFFER_STATUS_LABELS[offer.status].th}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {offered.map((item) => (
            <Thumb key={item.id} name={item.name} image={item.images[0]} />
          ))}
        </div>
        <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground/60" />
        {target && <Thumb name={target.name} image={target.images[0]} />}
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-foreground">
          {offered.map((item) => item.name).join(" + ")}
          <span className="text-muted-foreground"> ↔ </span>
          {target?.name}
        </span>
        {/* §3.2 — cash on top is part of the offer, not a hidden side deal. */}
        {offer.topUpAmount !== undefined && (
          <span className="flex items-center gap-1.5 text-xs text-primary-dark">
            <Coins className="size-3.5" />
            เพิ่มเงินให้อีก ฿{offer.topUpAmount.toLocaleString()}
          </span>
        )}
      </div>

      {offer.status === "pending" && direction === "received" && (
        <Link
          href={`/offers/${offer.id}`}
          className={cn(buttonVariants(), "h-11 w-full bg-primary-dark text-sm")}
        >
          ดูข้อเสนอ
        </Link>
      )}
    </Card>
  );
}
