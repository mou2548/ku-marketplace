import { ChatInbox } from "@/components/chat-inbox";
import { ChatThread } from "@/components/chat-thread";
import { SiteHeader } from "@/components/site-header";

// TODO: replace with the real selected-thread + trade data from the API
const THREAD = {
  name: "Sarah Jenkins",
  status: "Online",
  item: {
    name: "Nikon FM2 Camera Body",
  },
  meetupLocation: "Main Library",
  meetupSubtitle: "Kasetsart University",
};

export default function ChatPage() {
  return (
    <div className="flex h-screen flex-col">
      <SiteHeader active="/chat" />

      <div className="flex flex-1 overflow-hidden">
        <ChatInbox />
        <ChatThread thread={THREAD} />
      </div>
    </div>
  );
}
