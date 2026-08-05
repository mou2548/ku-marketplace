"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MapPin } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// TODO: replace with real on-campus meetup spots from the API
const CAMPUS_SPOTS = [
  { id: "main-library", name: "Main Library", sub: "Central, well-lit, open until 8pm" },
  { id: "engineering-faculty", name: "Engineering Faculty Lobby", sub: "Ground floor, near the entrance" },
  { id: "central-cafeteria", name: "Central Cafeteria", sub: "Busy during lunch hours" },
  { id: "science-building", name: "Science Building Atrium", sub: "Quiet, has seating" },
];

export default function ChatTargetPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = use(params);
  const router = useRouter();
  const [selected, setSelected] = useState(CAMPUS_SPOTS[0].id);

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Choose a meetup spot
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick a location on campus to share with the other person in trade
            #{tradeId}.
          </p>
        </div>

        <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-3xl bg-surface-muted">
          <MapPin className="size-8 text-primary-dark" />
        </div>

        <div className="flex flex-col gap-3">
          {CAMPUS_SPOTS.map((spot) => {
            const isSelected = selected === spot.id;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => setSelected(spot.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                  isSelected
                    ? "border-2 border-primary bg-primary/5"
                    : "border-border/50 bg-white hover:bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    isSelected ? "bg-primary-dark text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  <MapPin className="size-5" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold text-foreground">{spot.name}</span>
                  <span className="text-xs text-muted-foreground">{spot.sub}</span>
                </div>
                {isSelected && (
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-dark text-white">
                    <Check className="size-3.5" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Card className="flex-row items-center justify-between rounded-2xl p-4 shadow-card ring-0">
          <Button
            variant="outline"
            onClick={() => router.push("/chat")}
            className="h-11 flex-1"
          >
            Cancel
          </Button>
          <Button onClick={() => router.push("/chat")} className="ml-3 h-11 flex-1">
            Share Location
          </Button>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
