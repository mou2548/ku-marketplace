"use client";

import { useState } from "react";

import { GiveawayRequestTabs } from "@/components/giveaway-request-tabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Tab shell only. The trade cards arrive pre-rendered from the server page so
 * the whole trade store doesn't have to ship to the browser (this app is
 * auth-walled — no reason to hydrate what nobody interacts with).
 */
export function HistoryTabs({ trades }: { trades: React.ReactNode }) {
  const [tab, setTab] = useState("trades");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="h-auto! w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-sm">
        <TabsTrigger
          value="trades"
          className="h-10! flex-none rounded-full px-4 text-sm whitespace-nowrap text-foreground/70 data-active:bg-surface-muted data-active:text-foreground data-active:shadow-none"
        >
          Marketplace Trades
        </TabsTrigger>
        <TabsTrigger
          value="giveaways"
          className="h-10! flex-none rounded-full px-4 text-sm whitespace-nowrap text-foreground/70 data-active:bg-surface-muted data-active:text-foreground data-active:shadow-none"
        >
          Giveaway Requests
        </TabsTrigger>
      </TabsList>

      <TabsContent value="trades" className="pt-6">
        {/* capped width: a full 1200px row leaves the two item boxes stretched and empty */}
        <div className="flex max-w-5xl flex-col gap-6">{trades}</div>
      </TabsContent>

      <TabsContent value="giveaways" className="pt-6">
        <GiveawayRequestTabs />
      </TabsContent>
    </Tabs>
  );
}
