import Image from "next/image";
import { ArrowLeftRight, Check, X } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// TODO: replace with the real incoming-offer data from the API, looked up by offerId
const OFFER_ALERT = {
  sender: { name: "Nong Ploy" },
  time: "2 hours ago",
  yours: "Calculus 1 Textbook",
  yoursImage: "/images/product-physics-textbooks.png",
  theirs: "Scientific Calculator",
  theirsImage:
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=400&auto=format&fit=crop",
};

export default function OfferAlertPage() {
  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <Card className="w-full max-w-[480px] flex-col gap-6 rounded-3xl p-8 shadow-elevated ring-0">
          <div className="flex flex-col items-center gap-3">
            <Avatar className="size-14 border-2 border-primary-light">
              <AvatarImage src="" alt={OFFER_ALERT.sender.name} />
              <AvatarFallback>{OFFER_ALERT.sender.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-xl font-semibold text-foreground">
                {OFFER_ALERT.sender.name} sent you a trade offer
              </h1>
              <Badge variant="outline" className="h-auto px-3 py-1 text-xs text-muted-foreground">
                {OFFER_ALERT.time}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-surface-muted p-3">
              <div className="relative size-20 overflow-hidden rounded-lg border border-border/30 bg-white">
                <Image
                  src={OFFER_ALERT.theirsImage}
                  alt={OFFER_ALERT.theirs}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Their item</span>
              <span className="text-center text-sm font-semibold text-foreground">
                {OFFER_ALERT.theirs}
              </span>
            </div>
            <ArrowLeftRight className="size-6 shrink-0 text-primary" />
            <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-surface-muted p-3">
              <div className="relative size-20 overflow-hidden rounded-lg border border-border/30 bg-white">
                <Image
                  src={OFFER_ALERT.yoursImage}
                  alt={OFFER_ALERT.yours}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Your item</span>
              <span className="text-center text-sm font-semibold text-foreground">
                {OFFER_ALERT.yours}
              </span>
            </div>
          </div>

          <div className="flex gap-4 border-t border-border/20 pt-6">
            <Button
              variant="outline"
              className="h-12 flex-1 gap-2 border-error text-error hover:bg-error/5"
            >
              <X className="size-4" />
              Decline
            </Button>
            <Button className="h-12 flex-1 gap-2">
              <Check className="size-4" />
              Accept
            </Button>
          </div>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
