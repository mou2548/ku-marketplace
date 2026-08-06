import Image from "next/image";
import { ArrowLeftRight, Coins } from "lucide-react";

import { OfferDecisionActions } from "@/components/offer-decision-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getItem } from "@/lib/items";
import {
  OFFER_STATUS_LABELS,
  acceptanceFallout,
  getPost,
  offeredItems,
  type Offer,
} from "@/lib/offers";

function ItemTile({
  label,
  name,
  image,
}: {
  label: string;
  name: string;
  image: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-surface-muted p-3">
      <div className="relative size-20 overflow-hidden rounded-lg border border-border/30 bg-white">
        <Image src={image} alt={name} fill sizes="80px" className="object-cover" />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-center text-sm font-semibold text-foreground">
        {name}
      </span>
    </div>
  );
}

/**
 * The offer detail body, shared by the full page and the intercepted modal so
 * the two can't drift apart.
 */
export function OfferReview({ offer }: { offer: Offer }) {
  const post = getPost(offer.postId);
  const target = post ? getItem(post.itemId) : undefined;
  const offered = offeredItems(offer);
  const fallout = acceptanceFallout(offer);

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <Avatar className="size-14 border-2 border-primary-light">
          <AvatarFallback>{offer.fromName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-center text-xl font-semibold text-foreground">
            {offer.fromName} ยื่นข้อเสนอแลกเปลี่ยน
          </h1>
          <Badge
            variant="outline"
            className="h-auto px-3 py-1 text-xs text-muted-foreground"
          >
            {OFFER_STATUS_LABELS[offer.status].th}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* §3.2 — an offer can bundle several items, so this side is a list. */}
        <div className="flex flex-1 flex-col gap-2">
          {offered.map((item) => (
            <ItemTile
              key={item.id}
              label="ของเขา"
              name={item.name}
              image={item.images[0]}
            />
          ))}
        </div>
        <ArrowLeftRight className="size-6 shrink-0 text-primary" />
        {target && (
          <ItemTile label="ของคุณ" name={target.name} image={target.images[0]} />
        )}
      </div>

      {offer.topUpAmount !== undefined && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-primary-light/40 px-4 py-3">
          <Coins className="size-4 text-primary-dark" />
          <span className="text-sm font-semibold text-primary-dark">
            พร้อมเพิ่มเงินให้อีก ฿{offer.topUpAmount.toLocaleString()}
          </span>
        </div>
      )}

      <div className="border-t border-border/20 pt-6">
        {offer.status === "pending" ? (
          <OfferDecisionActions
            offerId={offer.id}
            rivalCount={fallout.rivals.length}
            pulledOfferCount={fallout.pulledOffers.length}
            pulledPostCount={fallout.pulledPosts.length}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            ข้อเสนอนี้ได้ข้อสรุปไปแล้ว ({OFFER_STATUS_LABELS[offer.status].th})
          </p>
        )}
      </div>
    </>
  );
}
