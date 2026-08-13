"use client";

import { useEffect, useState } from "react";

import { ChatInbox } from "@/components/chat-inbox";
import { ChatThread } from "@/components/chat-thread";
import { DevTransactionConnect } from "@/components/dev-transaction-connect";
import { SiteHeader } from "@/components/site-header";
import { CONVERSATIONS, type Conversation } from "@/lib/chat-threads";
import { getLiveTransaction, setLiveTransaction } from "@/lib/live-transaction";
import { cn } from "@/lib/utils";

function buildLiveConversation(transactionId: number, meetupLocation?: string): Conversation {
  return {
    id: `live-${transactionId}`,
    name: `Transaction #${transactionId}`,
    time: "",
    preview: "เชื่อมกับ transaction จริงผ่าน API",
    tags: [{ label: "LIVE", className: "bg-primary/10 text-primary" }],
    filter: "negotiating",
    thread: {
      tradeId: String(transactionId),
      name: `Transaction #${transactionId}`,
      status: "Live",
      kind: "trade",
      item: { name: "Transaction", image: "/images/ku-logo.png" },
      meetupLocation: meetupLocation ?? null,
      meetupSubtitle: meetupLocation ? "นัดหมายผ่านแชท" : "",
      messages: [],
      transactionId,
    },
  };
}

export default function ChatPage() {
  const [liveConversation, setLiveConversationState] = useState<Conversation | null>(null);
  const conversations = liveConversation ? [liveConversation, ...CONVERSATIONS] : CONVERSATIONS;

  const [selectedId, setSelectedId] = useState(CONVERSATIONS[0].id);
  // Below md only one pane fits, so the inbox and the thread swap places.
  const [mobileView, setMobileView] = useState<"inbox" | "thread">("inbox");
  const conversation = conversations.find((c) => c.id === selectedId) ?? conversations[0];

  // Re-hydrate the live connection on mount — navigating to /chat/[tradeId]/target
  // and back fully remounts this page, which would otherwise drop it.
  useEffect(() => {
    const stored = getLiveTransaction();
    if (!stored) return;
    setLiveConversationState(buildLiveConversation(stored.transactionId, stored.meetupLocation));
    setSelectedId(`live-${stored.transactionId}`);
  }, []);

  function connectToTransaction(transactionId: number) {
    setLiveTransaction({ transactionId });
    const conv = buildLiveConversation(transactionId);
    setLiveConversationState(conv);
    setSelectedId(conv.id);
    setMobileView("thread");
  }

  return (
    <div className="flex h-screen flex-col bg-page-background">
      <SiteHeader />
      <DevTransactionConnect onConnect={connectToTransaction} />

      <div className="flex flex-1 overflow-hidden">
        <ChatInbox
          conversations={conversations}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setMobileView("thread");
          }}
          className={cn(mobileView === "inbox" ? "flex" : "hidden", "md:flex")}
        />
        {/* key resets per-thread local state (cancelled flag, messages) when switching */}
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
