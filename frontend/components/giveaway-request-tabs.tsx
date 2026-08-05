"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  Shuffle,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Status = "pending" | "won" | "not-selected";

interface RequestItem {
  id: string;
  title: string;
  image: string;
  type: string;
  typeIcon: typeof Shuffle;
  status: Status;
}

// TODO: replace with real request data from the API
const REQUESTS: RequestItem[] = [
  {
    id: "calculus-textbook",
    title: "Calculus Textbook Vol. 1",
    image: "/images/product-physics-textbooks.png",
    type: "Random Draw",
    typeIcon: Shuffle,
    status: "pending",
  },
  {
    id: "desk-succulent",
    title: "Desk Succulent",
    image: "https://upload.wikimedia.org/wikipedia/commons/8/84/Two_potted_succulents.jpg",
    type: "First-come",
    typeIcon: Zap,
    status: "won",
  },
  {
    id: "desk-lamp",
    title: "Minimalist Desk Lamp",
    image: "https://upload.wikimedia.org/wikipedia/commons/0/09/White_desk_light.jpg",
    type: "Random Draw",
    typeIcon: Shuffle,
    status: "not-selected",
  },
];

const TABS: { label: string; value: "all" | Status }[] = [
  { label: "All Requests (ทั้งหมด)", value: "all" },
  { label: "Pending (รอผล)", value: "pending" },
  { label: "Won/Selected (ได้รับของ)", value: "won" },
  { label: "Not Selected (ไม่ได้รับเลือก)", value: "not-selected" },
];

export function GiveawayRequestTabs() {
  const [activeTab, setActiveTab] = useState<"all" | Status>("all");

  const visible =
    activeTab === "all"
      ? REQUESTS
      : REQUESTS.filter((request) => request.status === activeTab);

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "all" | Status)}
      >
        <TabsList className="h-auto! w-full justify-start gap-4 overflow-x-auto rounded-none border-b border-border/30 bg-transparent p-0">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-auto! flex-none rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-6 pb-4 text-base whitespace-nowrap text-muted-foreground data-active:border-primary data-active:bg-transparent data-active:font-medium data-active:text-primary-dark data-active:shadow-none hover:text-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
      </div>
    </div>
  );
}

function RequestCard({ request }: { request: RequestItem }) {
  const TypeIcon = request.typeIcon;

  return (
    <article
      className={cn(
        "flex flex-col gap-6 rounded-3xl border p-6 shadow-elevated",
        request.status === "won"
          ? "border-primary-dark/30 bg-primary-dark/[0.02]"
          : "border-border bg-white",
        request.status === "not-selected" && "opacity-80 saturate-50"
      )}
    >
      <div className="relative isolate overflow-hidden rounded-xl bg-surface-muted shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
        <div className="relative h-[220px] w-full bg-surface-muted">
          <Image
            src={request.image}
            alt={request.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="absolute top-4 right-4">
          {request.status === "pending" && (
            <Badge className="h-auto gap-1 bg-warning-bg px-4 py-1.5 text-sm text-warning-dark shadow-card">
              <Clock className="size-3" />
              Pending Review
            </Badge>
          )}
          {request.status === "won" && (
            <Badge className="h-auto gap-1 bg-primary-dark px-4 py-1.5 text-sm text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
              <CheckCircle2 className="size-3" />
              You Won!
            </Badge>
          )}
          {request.status === "not-selected" && (
            <Badge className="h-auto border-border/30 bg-surface-muted px-4 py-1.5 text-sm text-muted-foreground">
              Better Luck Next Time
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl leading-7 font-semibold text-foreground">
            {request.title}
          </h3>
          <Badge className="h-auto w-fit gap-1 rounded-md border-border/30 bg-surface-muted px-2 py-0.5 text-base text-muted-foreground">
            <TypeIcon className="size-3" />
            {request.type}
          </Badge>
        </div>

        <div className="flex gap-4 border-t border-border/20 pt-6">
          {request.status === "pending" && (
            <>
              <Link
                href={`/giveaway/${request.id}`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-10 flex-1 border-muted-foreground text-base"
                )}
              >
                View Post
              </Link>
              <Button
                variant="outline"
                className="h-10 flex-1 border-error text-base text-error hover:bg-error/5"
              >
                Cancel
              </Button>
            </>
          )}
          {request.status === "won" && (
            <Link
              href="/chat"
              className={cn(buttonVariants(), "h-10 w-full gap-2 text-base")}
            >
              <MessageSquare className="size-4" />
              Go to Chat
            </Link>
          )}
          {request.status === "not-selected" && (
            <Button
              variant="outline"
              disabled
              className="h-10 w-full border-muted-foreground/40 text-base text-muted-foreground"
            >
              Closed
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
