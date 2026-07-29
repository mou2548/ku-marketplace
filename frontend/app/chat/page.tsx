import Link from "next/link";
import {
  Search,
  ShoppingCart,
  Plus,
  Phone,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  MapPin,
  ArrowLeftRight,
  CheckCheck,
  QrCode,
  ImageIcon,
} from "lucide-react";

const navLinks = [
  { label: "Home", href: "/", active: false },
  { label: "Inventory", href: "#", active: false },
  { label: "Messages", href: "/chat", active: true },
  { label: "History", href: "#", active: false },
  { label: "Account", href: "#", active: false },
];

const filters = [
  { label: "All", active: true },
  { label: "Trade Offers", active: false },
  { label: "Sold", active: false },
];

const conversations = [
  {
    name: "Somsri K.",
    time: "2m",
    preview: "Offer confirmed, agree on meetup spot",
    badges: [{ text: "AGREED", tone: "amber" as const }, { text: "Trade", tone: "blue" as const }],
    active: true,
    online: true,
  },
  {
    name: "Tar M.",
    time: "1h",
    preview: "Would you take 500 THB for the monitor?",
    badges: [{ text: "NEGOTIATING", tone: "periwinkle" as const }],
    active: false,
    online: false,
  },
  {
    name: "Nok P.",
    time: "1d",
    preview: "Thanks for the quick handoff!",
    badges: [{ text: "COMPLETED", tone: "muted" as const }],
    active: false,
    online: false,
  },
];

const messages = [
  { from: "them", text: "Hey! Glad we could agree on the swap. When works for you?" },
  { from: "them", text: "I'm free this afternoon around 3pm." },
  { from: "me", text: "Perfect, 3pm works great for me!" },
];

const badgeTone: Record<string, string> = {
  amber: "bg-[rgba(251,191,36,0.2)] text-[#D97706]",
  blue: "bg-[rgba(218,226,253,0.5)] text-ku-muted",
  periwinkle: "bg-ku-periwinkle text-ku-muted",
  muted: "bg-[#EAEDFF] text-ku-muted",
};

function TopAppBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[rgba(191,201,189,0.3)] bg-[rgba(250,248,255,0.8)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <Link href="/" className="font-kanit text-base font-bold text-ku-green">
          KU Marketplace
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-base ${
                link.active
                  ? "border-b-2 border-ku-green font-medium text-ku-green"
                  : "text-ku-muted hover:text-ku-green"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            aria-label="Search"
            className="grid size-9 place-items-center rounded-full hover:bg-ku-lilac"
          >
            <Search className="size-5 text-ku-green" />
          </button>
          <button
            aria-label="Cart"
            className="grid size-9 place-items-center rounded-full hover:bg-ku-lilac"
          >
            <ShoppingCart className="size-5 text-ku-green" />
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-[360px] shrink-0 flex-col border-r border-[rgba(191,201,189,0.2)] bg-ku-surface lg:flex">
      <div className="flex flex-col gap-4 border-b border-[rgba(191,201,189,0.1)] p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-kanit text-xl font-semibold text-ku-ink">Chats</h2>
          <button
            aria-label="New chat"
            className="grid size-8 place-items-center rounded-full bg-[rgba(0,102,51,0.15)] hover:bg-[rgba(0,102,51,0.25)]"
          >
            <Plus className="size-4 text-ku-green-accent" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ku-muted" />
          <input
            placeholder="Search conversations..."
            className="h-11 w-full rounded-full bg-ku-lilac pl-11 pr-4 font-prompt text-sm text-ku-ink outline-none placeholder:text-[#6B7280]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.label}
              className={`shrink-0 rounded-full px-4 py-1.5 font-prompt text-sm font-medium tracking-[0.14px] ${
                f.active
                  ? "bg-ku-ink text-ku-surface"
                  : "bg-ku-lilac text-ku-muted hover:text-ku-green"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {conversations.map((c) => (
          <div
            key={c.name}
            className={`flex gap-4 border-l-4 p-6 ${
              c.active
                ? "border-ku-green-accent bg-[rgba(0,102,51,0.08)]"
                : "border-transparent hover:bg-ku-lilac"
            } ${!c.active && c.badges[0].text === "COMPLETED" ? "opacity-80" : ""}`}
          >
            <div className="relative shrink-0">
              <div className="grid size-14 place-items-center overflow-hidden rounded-full border-2 border-ku-surface bg-ku-periwinkle">
                <span className="font-kanit text-sm font-semibold text-ku-green-dark">
                  {c.name.slice(0, 2)}
                </span>
              </div>
              {c.online && (
                <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-ku-surface bg-[#10B981]" />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate font-kanit text-base font-semibold text-ku-ink">
                  {c.name}
                </h3>
                <span className="shrink-0 font-prompt text-xs font-medium text-ku-muted">
                  {c.time}
                </span>
              </div>
              <p className="truncate font-prompt text-sm text-ku-muted">
                {c.preview}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {c.badges.map((b) => (
                  <span
                    key={b.text}
                    className={`rounded-md px-2 py-0.5 font-prompt text-[11px] font-medium uppercase tracking-[0.55px] ${badgeTone[b.tone]}`}
                  >
                    {b.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function ChatHeader() {
  return (
    <div className="flex h-18 items-center justify-between border-b border-[rgba(191,201,189,0.2)] bg-ku-surface px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="grid size-10 place-items-center overflow-hidden rounded-full bg-ku-periwinkle">
          <span className="font-kanit text-sm font-semibold text-ku-green-dark">SK</span>
        </div>
        <div className="flex flex-col">
          <h2 className="font-kanit text-lg text-ku-ink">Somsri K.</h2>
          <span className="font-prompt text-xs font-medium text-[#10B981]">Online</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button aria-label="Call" className="grid size-10 place-items-center rounded-full hover:bg-ku-lilac">
          <Phone className="size-[18px] text-ku-muted" />
        </button>
        <button aria-label="More" className="grid size-10 place-items-center rounded-full hover:bg-ku-lilac">
          <MoreVertical className="size-4 text-ku-muted" />
        </button>
      </div>
    </div>
  );
}

function TradeFlashcard() {
  return (
    <div className="border-b border-[rgba(191,201,189,0.1)] bg-ku-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col gap-4 rounded-2xl border border-[rgba(191,201,189,0.2)] bg-ku-surface p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-kanit text-[13px] font-bold uppercase tracking-[1.3px] text-ku-muted">
            Current Trade
          </h3>
          <span className="flex items-center gap-2 rounded-full bg-[#FEF3C7] px-3 py-1">
            <span className="size-2 rounded-full bg-[#F59E0B]" />
            <span className="font-prompt text-xs font-medium uppercase tracking-[0.6px] text-[#B45309]">
              Process
            </span>
          </span>
        </div>

        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-4 rounded-xl border border-[rgba(191,201,189,0.2)] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="grid size-14 place-items-center rounded-lg bg-ku-periwinkle">
              <ImageIcon className="size-6 text-[rgba(19,27,46,0.2)]" />
            </div>
            <div className="flex flex-col">
              <span className="font-prompt text-[11px] font-semibold uppercase tracking-[0.55px] text-ku-muted">
                Your Offer
              </span>
              <span className="font-kanit text-base text-ku-ink">Calculus Textbook</span>
            </div>
          </div>

          <div className="grid size-10 shrink-0 place-items-center self-center rounded-full border border-[rgba(191,201,189,0.2)] bg-ku-surface shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <ArrowLeftRight className="size-4 text-ku-muted" />
          </div>

          <div className="flex flex-1 items-center gap-4 rounded-xl border border-[rgba(191,201,189,0.2)] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="grid size-14 place-items-center rounded-lg bg-ku-periwinkle">
              <ImageIcon className="size-6 text-[rgba(19,27,46,0.2)]" />
            </div>
            <div className="flex flex-col">
              <span className="font-prompt text-[11px] font-semibold uppercase tracking-[0.55px] text-ku-muted">
                Their Offer
              </span>
              <span className="font-kanit text-base text-ku-ink">Casio Calculator</span>
            </div>
          </div>

          <Link
            href="/trade/qr"
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-ku-green-accent px-8 font-prompt text-[15px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:brightness-95"
          >
            <QrCode className="size-4" />
            Proceed to QRCODE
          </Link>
        </div>
      </div>
    </div>
  );
}

function ChatStream() {
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-8">
      {/* System notice */}
      <div className="flex justify-center">
        <span className="flex items-center gap-2 rounded-full border border-[rgba(191,201,189,0.2)] bg-ku-surface px-5 py-2 font-prompt text-[13px] text-ku-muted shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <CheckCheck className="size-3.5" />
          Trade request accepted
        </span>
      </div>

      {/* Date divider */}
      <div className="flex justify-center">
        <span className="font-prompt text-xs font-semibold uppercase tracking-[1.2px] text-ku-muted">
          Today
        </span>
      </div>

      {messages.map((m, i) =>
        m.from === "them" ? (
          <div key={i} className="flex items-end gap-4">
            <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-ku-periwinkle">
              <span className="font-kanit text-xs font-semibold text-ku-green-dark">SK</span>
            </div>
            <div className="max-w-[560px] rounded-2xl rounded-bl-sm border border-[rgba(191,201,189,0.2)] bg-ku-surface p-4 font-prompt text-base leading-[26px] text-ku-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              {m.text}
            </div>
          </div>
        ) : (
          <div key={i} className="flex justify-end">
            <div className="max-w-[560px] rounded-2xl rounded-br-sm bg-ku-green-accent p-4 font-prompt text-base leading-[26px] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              {m.text}
            </div>
          </div>
        )
      )}

      {/* Shared location pill (sent) */}
      <div className="flex justify-center">
        <span className="flex items-center gap-2 rounded-full border border-[rgba(0,75,36,0.2)] bg-[rgba(0,102,51,0.1)] px-5 py-2.5 font-prompt text-[13px] text-ku-green-accent shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <MapPin className="size-3.5" />
          Location shared: KU Main Library
        </span>
      </div>

      {/* Meetup image card */}
      <div className="flex justify-center">
        <div className="w-80 rounded-2xl bg-ku-green-accent p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="relative h-36 overflow-hidden rounded-xl bg-ku-periwinkle">
            <div className="grid h-full place-items-center">
              <MapPin className="size-8 text-[rgba(19,27,46,0.25)]" />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/60 to-transparent p-3">
              <span className="flex items-center gap-1.5 font-prompt text-[10px] font-bold uppercase tracking-[1px] text-white">
                <span className="size-2 rounded-full bg-[#BA1A1A]" />
                Meetup point
              </span>
              <span className="font-kanit text-base font-semibold text-white">Main Library</span>
            </div>
          </div>
          <p className="px-1 py-2 text-center font-prompt text-base text-white">
            See you there at 3pm
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageInput() {
  return (
    <div className="border-t border-[rgba(191,201,189,0.1)] bg-ku-surface p-6">
      <div className="flex items-center gap-2 rounded-full border border-[rgba(191,201,189,0.2)] bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <button aria-label="Attach" className="grid size-10 place-items-center rounded-full hover:bg-ku-lilac">
          <Paperclip className="size-[18px] text-ku-muted" />
        </button>
        <input
          placeholder="Type a message..."
          className="h-10 flex-1 bg-transparent px-2 font-prompt text-[15px] text-ku-ink outline-none placeholder:text-[rgba(63,73,64,0.7)]"
        />
        <button aria-label="Emoji" className="grid size-10 place-items-center rounded-full hover:bg-ku-lilac">
          <Smile className="size-[18px] text-ku-green-accent" />
        </button>
        <button
          aria-label="Send"
          className="grid size-10 place-items-center rounded-full bg-ku-green-accent shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:brightness-95"
        >
          <Send className="size-4 text-white" />
        </button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <div className="flex flex-1 flex-col bg-[#F8FAFC]">
      <TopAppBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <section className="flex flex-1 flex-col bg-[#F8FAFC]">
          <ChatHeader />
          <TradeFlashcard />
          <ChatStream />
          <MessageInput />
        </section>
      </div>
    </div>
  );
}
