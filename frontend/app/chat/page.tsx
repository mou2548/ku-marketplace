"use client";

import { useState } from "react";

import { ChatInbox } from "@/components/chat-inbox";
import { ChatThread } from "@/components/chat-thread";
import { SiteHeader } from "@/components/site-header";
import { CONVERSATIONS, getConversation } from "@/lib/chat-threads";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const [selectedId, setSelectedId] = useState(CONVERSATIONS[0].id);
  // Below md only one pane fits, so the inbox and the thread swap places.
  const [mobileView, setMobileView] = useState<"inbox" | "thread">("inbox");
  const conversation = getConversation(selectedId);

  return (
    <div className="flex h-screen flex-col bg-page-background">
      <SiteHeader />

      <div className="flex flex-1 overflow-hidden">
        <ChatInbox
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setMobileView("thread");
          }}
          className={cn(mobileView === "inbox" ? "flex" : "hidden", "md:flex")}
        />
        {/* key resets per-thread local state (cancelled flag) when switching */}
        <ChatThread
          key={conversation.id}
          thread={conversation.thread}
          onBack={() => setMobileView("inbox")}
          className={cn(mobileView === "thread" ? "flex" : "hidden", "md:flex")}
        />
      </div>
    </div>
  );
}
