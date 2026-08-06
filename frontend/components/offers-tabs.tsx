"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Tab shell for the offer inbox. Cards arrive pre-rendered from the server so
 * the offer store never ships to the browser.
 */
export function OffersTabs({
  received,
  sent,
  receivedCount,
  sentCount,
}: {
  received: React.ReactNode;
  sent: React.ReactNode;
  receivedCount: number;
  sentCount: number;
}) {
  const [tab, setTab] = useState("received");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="h-auto! w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-sm">
        <TabsTrigger
          value="received"
          className="h-10! flex-none rounded-full px-4 text-sm whitespace-nowrap text-foreground/70 data-active:bg-surface-muted data-active:text-foreground data-active:shadow-none"
        >
          ได้รับ ({receivedCount})
        </TabsTrigger>
        <TabsTrigger
          value="sent"
          className="h-10! flex-none rounded-full px-4 text-sm whitespace-nowrap text-foreground/70 data-active:bg-surface-muted data-active:text-foreground data-active:shadow-none"
        >
          ที่ยื่นไป ({sentCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="received" className="pt-6">
        <div className="flex max-w-3xl flex-col gap-4">{received}</div>
      </TabsContent>

      <TabsContent value="sent" className="pt-6">
        <div className="flex max-w-3xl flex-col gap-4">{sent}</div>
      </TabsContent>
    </Tabs>
  );
}
