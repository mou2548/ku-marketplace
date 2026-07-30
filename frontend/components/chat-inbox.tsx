"use client";

import { useState } from "react";
import { Search, SquarePen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Filter = "all" | "negotiating" | "agreed";

interface Conversation {
  id: string;
  name: string;
  time: string;
  preview: string;
  tags: { label: string; className: string }[];
  online?: boolean;
  dimmed?: boolean;
  filter: Filter;
}

// TODO: replace with real conversations from the API
const CONVERSATIONS: Conversation[] = [
  {
    id: "sarah-jenkins",
    name: "Sarah Jenkins",
    time: "10:42 AM",
    preview: "Offer confirmed, agree on meetup spot",
    tags: [
      { label: "AGREED", className: "bg-[#FBBF24]/20 text-[#D99E31]" },
      { label: "Swap", className: "bg-[#DAE2FD]/50 text-muted-foreground" },
    ],
    online: true,
    filter: "agreed",
  },
  {
    id: "david-chen",
    name: "David Chen",
    time: "Yesterday",
    preview: "Would you take 500 THB for the monitor?",
    tags: [{ label: "NEGOTIATING", className: "bg-[#E2E7FF] text-muted-foreground" }],
    filter: "negotiating",
  },
  {
    id: "maya-patel",
    name: "Maya Patel",
    time: "Oct 12",
    preview: "Thanks for the quick handoff!",
    tags: [{ label: "COMPLETED", className: "bg-[#EAEDFF] text-muted-foreground" }],
    dimmed: true,
    filter: "agreed",
  },
];

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Negotiating", value: "negotiating" },
  { label: "Agreed", value: "agreed" },
];

export function ChatInbox() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState("sarah-jenkins");

  const visible =
    filter === "all"
      ? CONVERSATIONS
      : CONVERSATIONS.filter((c) => c.filter === filter);

  return (
    <aside className="flex h-full w-[400px] shrink-0 flex-col border-r border-border/20 bg-[#FAF8FF]">
      <div className="flex flex-col gap-4 border-b border-border/10 px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl leading-7 font-semibold text-foreground">
            Inbox
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="New message"
            className="size-8 bg-[#006633]/30 text-[#2E8F5A] hover:bg-[#006633]/40"
          >
            <SquarePen className="size-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search conversations..."
            className="h-11 rounded-full border-0 bg-[#F2F3FF] pr-4 pl-10 text-sm text-foreground placeholder:text-[#6B7280] focus-visible:ring-0"
          />
        </div>

        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as Filter)}
        >
          <TabsList className="h-auto w-fit gap-2 overflow-x-auto bg-transparent p-0">
            {FILTERS.map((f) => (
              <TabsTrigger
                key={f.value}
                value={f.value}
                className="h-auto shrink-0 rounded-full bg-[#F2F3FF] px-4 py-1.5 text-sm font-medium tracking-[0.14px] whitespace-nowrap text-muted-foreground data-active:bg-foreground data-active:text-[#FAF8FF] data-active:shadow-none hover:bg-[#F2F3FF]/70"
              >
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visible.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => setSelectedId(conversation.id)}
            className={cn(
              "flex w-full items-start gap-4 border-l-4 p-6 text-left",
              conversation.id === selectedId
                ? "border-[#2E8F5A] bg-[#006633]/10"
                : "border-transparent hover:bg-[#F2F3FF]/50",
              conversation.dimmed && "opacity-80"
            )}
          >
            <div className="relative shrink-0">
              <div className="size-14 animate-pulse rounded-full border-2 border-[#FAF8FF] bg-[#DAE2FD]" />
              {conversation.online && (
                <span className="absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-[#FAF8FF] bg-[#10B981]" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-base font-semibold text-foreground">
                  {conversation.name}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-xs",
                    conversation.id === selectedId
                      ? "text-[#2E8F5A]"
                      : "text-muted-foreground"
                  )}
                >
                  {conversation.time}
                </span>
              </div>
              <p className="truncate text-sm text-foreground">
                {conversation.preview}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {conversation.tags.map((tag) => (
                  <Badge
                    key={tag.label}
                    className={cn(
                      "h-auto rounded-md px-2 py-0.5 text-[11px] font-bold tracking-[0.55px] uppercase",
                      tag.className
                    )}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
