import Link from "next/link";
import {
  Search,
  ShoppingCart,
  Clock,
  RefreshCw,
  CheckCircle2,
  ArrowLeftRight,
  Eye,
  ImageIcon,
} from "lucide-react";

const navLinks = [
  { label: "Home", href: "/", active: false },
  { label: "Inventory", href: "#", active: true },
  { label: "Messages", href: "#", active: false },
  { label: "History", href: "#", active: false },
  { label: "Profile", href: "#", active: false },
];

const tabs = [
  { label: "Active Offers", active: true },
  { label: "Completed", active: false },
  { label: "Cancelled", active: false },
];

type OfferStatus = "pending" | "processing" | "complete";

const offers: {
  status: OfferStatus;
  time: string;
  yours: string;
  theirs: string;
}[] = [
  {
    status: "pending",
    time: "Sent 2 hours ago",
    yours: "Calculus 1 Textbook",
    theirs: "Scientific Calculator",
  },
  {
    status: "processing",
    time: "Sent 1 day ago",
    yours: "Lab Coat (Size M)",
    theirs: "Drafting Tools Set",
  },
  {
    status: "complete",
    time: "Completed 3 days ago",
    yours: "Physics Textbook",
    theirs: "Casio FX-991EX",
  },
];

function TopAppBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[rgba(191,201,189,0.3)] bg-[rgba(250,248,255,0.8)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <Link href="/" className="font-kanit text-base font-bold text-ku-green">
          KU Marketplace
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-base ${
                link.active
                  ? "border-b-2 border-ku-green font-medium text-ku-green"
                  : "text-ku-muted hover:text-ku-green"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            aria-label="Search"
            className="grid size-9 place-items-center rounded-full hover:bg-ku-lilac"
          >
            <Search className="size-5 text-ku-green-accent" />
          </button>
          <button
            aria-label="Cart"
            className="grid size-9 place-items-center rounded-full hover:bg-ku-lilac"
          >
            <ShoppingCart className="size-5 text-ku-green-accent" />
          </button>
        </div>
      </div>
    </header>
  );
}

function StatusBadge({ status }: { status: OfferStatus }) {
  if (status === "complete") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-ku-green-accent px-2 py-1 font-prompt text-xs font-medium text-white">
        <CheckCircle2 className="size-3.5" />
        Complete
      </span>
    );
  }
  const label = status === "pending" ? "Pending" : "Processing";
  const Icon = status === "pending" ? Clock : RefreshCw;
  return (
    <span className="flex items-center gap-1 rounded-full bg-[rgba(255,190,59,0.2)] px-2 py-1 font-prompt text-xs font-medium text-[#1A221E]">
      <Icon className="size-3.5 text-ku-gold" />
      {label}
    </span>
  );
}

function ItemBox({ label, name }: { label: string; name: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-ku-lilac p-2">
      <div className="grid size-20 place-items-center overflow-hidden rounded-lg border border-[rgba(191,201,189,0.3)]">
        <ImageIcon className="size-8 text-[rgba(19,27,46,0.2)]" />
      </div>
      <span className="font-prompt text-xs font-medium text-ku-muted">{label}</span>
      <span className="text-center font-prompt text-sm font-semibold tracking-[0.14px] text-ku-ink">
        {name}
      </span>
    </div>
  );
}

function OfferCard({
  status,
  time,
  yours,
  theirs,
}: {
  status: OfferStatus;
  time: string;
  yours: string;
  theirs: string;
}) {
  const complete = status === "complete";
  return (
    <div
      className={`flex flex-col gap-4 rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] ${
        complete ? "opacity-80" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <StatusBadge status={status} />
        <span className="font-prompt text-xs font-medium text-ku-muted">
          {time}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <ItemBox label="Your item" name={yours} />
        <ArrowLeftRight
          className={`size-6 shrink-0 ${
            complete ? "text-ku-green-accent" : "text-[#BFC9BD]"
          }`}
        />
        <ItemBox label="Their item" name={theirs} />
      </div>

      <div className="flex justify-end border-t border-[rgba(191,201,189,0.2)] pt-4">
        {complete ? (
          <Link
            href="/chat"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2D7791] px-6 font-prompt text-sm font-medium tracking-[0.14px] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:brightness-95"
          >
            <Eye className="size-4" />
            Go to chat
          </Link>
        ) : (
          <button className="flex h-12 items-center justify-center rounded-2xl border border-[#BFC9BD] px-4 font-prompt text-sm font-medium tracking-[0.14px] text-ku-ink hover:bg-ku-lilac">
            Cancel Offer
          </button>
        )}
      </div>
    </div>
  );
}

export default function SentOffersPage() {
  return (
    <div className="flex flex-1 flex-col bg-ku-surface">
      <TopAppBar />

      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-6 py-6">
        {/* Page header & tabs */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-kanit text-3xl font-semibold tracking-[-0.32px] text-ku-ink">
              My Sent Offers
            </h1>
            <p className="font-prompt text-base text-ku-muted">
              Track the status of your outgoing trade requests.
            </p>
          </div>

          <div className="flex gap-2 border-b border-[#BFC9BD]">
            {tabs.map((tab) => (
              <button
                key={tab.label}
                className={`rounded-t-lg px-4 py-2 font-prompt text-sm font-medium tracking-[0.14px] ${
                  tab.active
                    ? "border-b-2 border-ku-green bg-ku-lilac text-ku-green"
                    : "text-ku-muted hover:text-ku-green"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trade cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {offers.map((offer) => (
            <OfferCard key={offer.yours} {...offer} />
          ))}
        </div>
      </main>
    </div>
  );
}
