import Link from "next/link";
import {
  Search,
  ShoppingCart,
  ArrowLeft,
  BookOpen,
  BadgeCheck,
  MessageCircle,
  ShieldCheck,
  ArrowLeftRight,
  Check,
  Send,
  ImageIcon,
} from "lucide-react";

const navLinks = [
  { label: "Home", href: "/", active: false },
  { label: "Inventory", href: "#", active: true },
  { label: "Messages", href: "#", active: false },
  { label: "History", href: "#", active: false },
  { label: "Profile", href: "#", active: false },
];

const tags = ["Engineering", "Textbook", "1st Year Course"];

const tradeWants = ["Scientific Calculator", "Lab Equipment", "Other Textbooks"];

const inventory = [
  { title: "Lab Coat (Size M)", note: "Excellent condition, washed", selected: true },
  { title: "Scientific Calculator", note: "Casio FX-991EX", selected: true },
  { title: "Drafting Tools Set", note: "Missing one ruler", selected: false },
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

function ContextualHeader() {
  return (
    <div className="flex h-12 items-center gap-4 border-b border-[rgba(191,201,189,0.3)] bg-[rgba(250,248,255,0.8)] px-6 backdrop-blur-md">
      <button
        aria-label="Back"
        className="grid size-10 place-items-center rounded-full hover:bg-ku-lilac"
      >
        <ArrowLeft className="size-4 text-ku-ink" />
      </button>
      <h1 className="font-kanit text-xl font-semibold text-ku-ink">Offer trade</h1>
    </div>
  );
}

function HeroImage() {
  return (
    <div className="relative flex h-80 w-full items-center justify-center overflow-hidden rounded-3xl border border-[#BFC9BD] bg-ku-lilac shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <ImageIcon className="size-16 text-[rgba(19,27,46,0.2)]" />
      <div className="absolute left-6 top-6 flex gap-2">
        <span className="flex items-center gap-1 rounded-lg bg-white/90 px-3 py-1.5 font-prompt text-xs font-medium text-ku-green-dark shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-sm">
          <ShieldCheck className="size-3.5" />
          Verified
        </span>
        <span className="flex items-center gap-1 rounded-lg bg-[rgba(255,190,59,0.9)] px-3 py-1.5 font-prompt text-xs font-medium text-[#6F4E00] shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-sm">
          <BadgeCheck className="size-3.5" />
          Like New
        </span>
      </div>
    </div>
  );
}

function TitleModule() {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-kanit text-2xl font-semibold text-ku-ink">
        Calculus 1: Early Transcendentals (8th Edition)
      </h2>
      <div className="flex items-center gap-2 font-prompt text-base text-ku-muted">
        <BookOpen className="size-4" />
        <span>Textbook • posted 2 days ago</span>
      </div>
    </div>
  );
}

function OwnerModule() {
  return (
    <div className="flex items-center gap-4">
      <div className="grid size-[60px] shrink-0 place-items-center overflow-hidden rounded-full border-2 border-ku-periwinkle bg-ku-lilac">
        <span className="font-kanit text-lg font-semibold text-ku-green-dark">NP</span>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-1">
          <h3 className="font-kanit text-xl font-semibold text-ku-ink">Nong Ploy</h3>
          <BadgeCheck className="size-[18px] text-ku-green-accent" />
        </div>
        <span className="font-prompt text-xs font-medium text-ku-muted">
          Engineering Student • 4.9 Rating
        </span>
      </div>
      <button
        aria-label="Message"
        className="grid size-10 place-items-center rounded-full bg-[#EAEDFF] hover:brightness-95"
      >
        <MessageCircle className="size-4 text-ku-green-dark" />
      </button>
    </div>
  );
}

function ConditionTagsModule() {
  return (
    <div className="flex flex-col justify-center gap-4">
      <div className="flex items-center justify-between">
        <span className="font-prompt text-sm font-medium tracking-[0.14px] text-ku-muted">
          Condition
        </span>
        <span className="rounded-md bg-[#E0EDE4] px-2 py-0.5 font-prompt text-sm font-medium tracking-[0.14px] text-ku-green-accent">
          Like New
        </span>
      </div>

      <div className="h-px w-full bg-[rgba(191,201,189,0.3)]" />

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-lg border border-[#BFC9BD] px-3 py-1 font-prompt text-xs font-medium text-ku-ink"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function DescriptionModule() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-kanit text-xl font-semibold text-ku-ink">Description</h3>
      <p className="font-prompt text-base leading-[26px] text-ku-muted">
        Used this for Dr. Panya&apos;s Cal 1 class last semester. Kept in pristine
        condition inside a protective sleeve. No pages folded, completely free of
        any pen or highlight marks. Essential text for first-year engineering
        students. Open to swapping for specific items below or equivalent value.
      </p>
    </div>
  );
}

function TradePreferencesModule() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-[#BFC9BD] bg-ku-lilac p-6">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="size-5 text-[#7C5800]" />
        <h3 className="font-kanit text-xl font-semibold text-ku-ink">
          Trade Preferences
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {tradeWants.map((item) => (
          <span
            key={item}
            className="rounded-xl border border-ku-line bg-white px-4 py-2 font-prompt text-sm font-medium tracking-[0.14px] text-ku-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function InventoryItem({
  title,
  note,
  selected,
}: {
  title: string;
  note: string;
  selected: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-3xl p-4 ${
        selected
          ? "border-2 border-ku-green-accent bg-[rgba(46,143,90,0.05)]"
          : "border border-[#BFC9BD] bg-white"
      }`}
    >
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-ku-lilac shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <ImageIcon className="size-8 text-[rgba(19,27,46,0.2)]" />
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        <h4
          className={`font-prompt text-sm tracking-[0.14px] text-ku-ink ${
            selected ? "font-bold" : "font-medium"
          }`}
        >
          {title}
        </h4>
        <span className="font-prompt text-xs font-medium text-ku-muted">{note}</span>
      </div>

      {selected ? (
        <div className="grid size-6 shrink-0 place-items-center rounded-full bg-ku-green-accent shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <Check className="size-3.5 text-white" strokeWidth={3} />
        </div>
      ) : (
        <div className="size-6 shrink-0 rounded-full border-2 border-[#BFC9BD]" />
      )}
    </div>
  );
}

function TradeDrawer() {
  const selectedCount = inventory.filter((i) => i.selected).length;

  return (
    <aside className="flex w-full flex-col border-l border-[rgba(191,201,189,0.3)] bg-white shadow-[-10px_0_30px_rgba(15,23,42,0.08)] lg:w-[420px]">
      <div className="flex items-center border-b border-[rgba(191,201,189,0.3)] px-6 py-5">
        <h2 className="font-kanit text-xl font-semibold text-ku-ink">
          Select items to trade
        </h2>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[rgba(250,248,255,0.5)] p-6">
        {inventory.map((item) => (
          <InventoryItem key={item.title} {...item} />
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t border-[rgba(191,201,189,0.3)] bg-white p-6 shadow-[0_-4px_20px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between px-2">
          <span className="font-prompt text-base text-ku-muted">
            {selectedCount} items selected
          </span>
        </div>
        <Link
          href="/offers"
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-ku-green-accent font-kanit text-lg font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:brightness-95"
        >
          Send Trade Offer
          <Send className="size-4" />
        </Link>
      </div>
    </aside>
  );
}

export default function OfferTradePage() {
  return (
    <div className="flex flex-1 flex-col bg-ku-surface lg:flex-row">
      {/* Main contextual canvas */}
      <div className="flex flex-1 flex-col">
        <TopAppBar />
        <ContextualHeader />
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
          <HeroImage />
          <TitleModule />
          <OwnerModule />
          <ConditionTagsModule />
          <DescriptionModule />
          <TradePreferencesModule />
        </main>
      </div>

      {/* Trade offer drawer */}
      <TradeDrawer />
    </div>
  );
}
