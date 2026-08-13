export type ChatFilter = "all" | "negotiating" | "agreed";

export interface ChatMessage {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
}

export interface Conversation {
  id: string;
  name: string;
  time: string;
  preview: string;
  tags: { label: string; className: string }[];
  online?: boolean;
  dimmed?: boolean;
  filter: Exclude<ChatFilter, "all">;
  /** Right-pane thread detail for this conversation. */
  thread: {
    tradeId: string;
    name: string;
    status: string;
    /** "giveaway" gets the free-item claim card; "trade" is a paid/swap negotiation. */
    kind: "giveaway" | "trade";
    item: { name: string; image: string };
    /** Only set once both sides agreed on a spot — drives the meetup card. */
    meetupLocation: string | null;
    meetupSubtitle: string;
    messages: ChatMessage[];
    /** When set, this thread is backed by a real /transactions/{id} record — messages load/send through the API instead of staying local-only. */
    transactionId?: number;
  };
}

// TODO: replace with real conversations + message history from the API
export const CONVERSATIONS: Conversation[] = [
  {
    id: "sarah-jenkins",
    name: "Sarah Jenkins",
    time: "10:42 AM",
    preview: "Offer confirmed, agree on meetup spot",
    tags: [
      { label: "AGREED", className: "bg-[#FBBF24]/20 text-[#D99E31]" },
      { label: "Swap", className: "bg-surface-muted text-muted-foreground" },
    ],
    online: true,
    filter: "agreed",
    thread: {
      tradeId: "sarah-jenkins",
      name: "Sarah Jenkins",
      status: "Online",
      kind: "giveaway",
      item: {
        name: "Nikon FM2 Camera Body",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/9/96/Canon_AE-1_Program.jpg",
      },
      meetupLocation: "Main Library",
      meetupSubtitle: "Kasetsart University",
      messages: [
        {
          id: "m1",
          from: "them",
          text: "สวัสดีค่ะ ยังแจกกล้องตัวนี้อยู่ไหมคะ?",
          time: "10:15 AM",
        },
        {
          id: "m2",
          from: "me",
          text: "ยังอยู่ครับ สนใจมารับได้เลย",
          time: "10:22 AM",
        },
        {
          id: "m3",
          from: "them",
          text: "ดีเลยค่ะ นัดรับที่หอสมุดกลางได้ไหมคะ ว่างช่วงบ่ายวันนี้",
          time: "10:38 AM",
        },
        {
          id: "m4",
          from: "me",
          text: "ได้ครับ เดี๋ยวผมแชร์จุดนัดพบให้",
          time: "10:42 AM",
        },
      ],
    },
  },
  {
    id: "david-chen",
    name: "David Chen",
    time: "Yesterday",
    preview: "Would you take 500 THB for the monitor?",
    tags: [{ label: "NEGOTIATING", className: "bg-surface-muted text-muted-foreground" }],
    filter: "negotiating",
    thread: {
      tradeId: "david-chen",
      name: "David Chen",
      status: "Last seen yesterday",
      kind: "trade",
      item: {
        name: 'Dell 24" Monitor',
        image:
          "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=400&auto=format&fit=crop",
      },
      meetupLocation: null,
      meetupSubtitle: "Kasetsart University",
      messages: [
        {
          id: "m1",
          from: "them",
          text: "Hi! Is the monitor still available?",
          time: "Yesterday 4:02 PM",
        },
        { id: "m2", from: "me", text: "Yes, it is. 700 THB.", time: "Yesterday 4:20 PM" },
        {
          id: "m3",
          from: "them",
          text: "Would you take 500 THB for the monitor?",
          time: "Yesterday 4:31 PM",
        },
      ],
    },
  },
  {
    id: "maya-patel",
    name: "Maya Patel",
    time: "Oct 12",
    preview: "Thanks for the quick handoff!",
    tags: [{ label: "COMPLETED", className: "bg-surface-muted text-muted-foreground" }],
    dimmed: true,
    filter: "agreed",
    thread: {
      tradeId: "maya-patel",
      name: "Maya Patel",
      status: "Offline",
      kind: "trade",
      item: {
        name: "Scientific Calculator (Casio FX-991EX)",
        image:
          "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=400&auto=format&fit=crop",
      },
      meetupLocation: "Central Cafeteria",
      meetupSubtitle: "Kasetsart University",
      messages: [
        {
          id: "m1",
          from: "me",
          text: "I'm at the cafeteria, near the entrance.",
          time: "Oct 12 12:04 PM",
        },
        { id: "m2", from: "them", text: "Coming in 2 minutes!", time: "Oct 12 12:05 PM" },
        {
          id: "m3",
          from: "them",
          text: "Thanks for the quick handoff!",
          time: "Oct 12 12:19 PM",
        },
      ],
    },
  },
];

export function getConversation(id: string) {
  return CONVERSATIONS.find((c) => c.id === id) ?? CONVERSATIONS[0];
}
