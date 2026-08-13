"use client";

import { useState } from "react";
import { Search, SquarePen } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ChatFilter, Conversation } from "@/lib/chat-threads";

const FILTERS: { label: string; value: ChatFilter }[] = [
  { label: "All", value: "all" },
  { label: "Negotiating", value: "negotiating" },
  { label: "Agreed", value: "agreed" },
];

export function ChatInbox({
  conversations,
  selectedId,
  onSelect,
  className,
}: {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const [filter, setFilter] = useState<ChatFilter>("all");

  const visible =
    filter === "all"
      ? conversations
      : conversations.filter((c) => c.filter === filter);

  return (
    <aside className={cn("h-full w-full shrink-0 flex-col border-r border-border/20 bg-white md:w-[400px]", className)}>
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
            className="h-11 rounded-full border-0 bg-surface-muted pr-4 pl-10 text-sm text-foreground placeholder:text-[#6B7280] focus-visible:ring-0"
          />
        </div>

        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as ChatFilter)}
        >
          <TabsList className="h-auto! w-full max-w-full gap-2 overflow-x-auto bg-transparent p-0">
            {FILTERS.map((f) => (
              <TabsTrigger
                key={f.value}
                value={f.value}
                className="h-auto! flex-none rounded-full bg-surface-muted px-4 py-1.5 text-sm font-medium tracking-[0.14px] whitespace-nowrap text-muted-foreground data-active:bg-foreground data-active:text-white data-active:shadow-none hover:bg-surface-muted/70"
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
            onClick={() => onSelect(conversation.id)}
            className={cn(
              "flex w-full items-start gap-4 border-l-4 p-6 text-left",
              conversation.id === selectedId
                ? "border-[#2E8F5A] bg-[#006633]/10"
                : "border-transparent hover:bg-surface-muted/50",
              conversation.dimmed && "opacity-80"
            )}
          >
            <div className="relative shrink-0">
              <Avatar className="size-14 border-2 border-white">
                <AvatarFallback className="bg-primary-light text-base font-semibold text-primary-dark">
                  {conversation.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {conversation.online && (
                <span className="absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-white bg-[#10B981]" />
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
