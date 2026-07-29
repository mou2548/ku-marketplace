import Link from "next/link";
import {
  Search,
  ShoppingCart,
  Bookmark,
  BadgeCheck,
  ZoomIn,
  ImageIcon,
  ShoppingBag,
  Repeat,
} from "lucide-react";

const navLinks = [
  { label: "Home", href: "/", active: false },
  { label: "Give away", href: "#", active: false },
  { label: "Inventory", href: "#", active: true },
  { label: "Messages", href: "#", active: false },
  { label: "History", href: "#", active: false },
  { label: "Profile", href: "#", active: false },
];

const specs = [
  { label: "Brand", value: "Apple" },
  { label: "Model", value: "iPad Pro 11\"" },
  { label: "Storage", value: "256GB Wi-Fi" },
];

const thumbnails = [0, 1, 2, 3];

function TopAppBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[rgba(191,201,189,0.3)] bg-[rgba(250,248,255,0.8)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <Link href="/" className="font-prompt text-base font-bold text-ku-green">
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

function ImageCarouselCard() {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-ku-line bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-ku-lilac">
        <ImageIcon className="size-16 text-[rgba(19,27,46,0.2)]" />
        <div className="absolute bottom-4 right-4 grid size-9 place-items-center rounded-full bg-[rgba(250,248,255,0.8)] opacity-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-opacity hover:opacity-100">
          <ZoomIn className="size-[18px] text-ku-ink" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {thumbnails.map((i) => (
          <div
            key={i}
            className={`grid size-20 shrink-0 place-items-center rounded-lg ${
              i === 0
                ? "border-2 border-ku-green-dark"
                : "border border-[rgba(191,201,189,0.3)]"
            }`}
          >
            <ImageIcon className="size-6 text-[rgba(19,27,46,0.2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SellerScoreCard() {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-ku-line bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-4">
        <div className="relative grid size-12 place-items-center overflow-hidden rounded-full border border-[rgba(191,201,189,0.3)] bg-ku-periwinkle">
          <span className="font-prompt text-sm font-semibold text-ku-green-dark">
            KP
          </span>
          <span className="absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-white bg-ku-green-dark" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="font-prompt text-sm font-semibold tracking-[0.14px] text-ku-ink">
              Kaset P.
            </span>
            <BadgeCheck className="size-[15px] text-ku-green-dark" />
          </div>
          <span className="font-prompt text-xs font-medium text-ku-muted">
            Member since 2023 · Bangkhen
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-xl bg-ku-lilac px-4 py-2">
        <div className="flex flex-col items-center border-r border-[rgba(191,201,189,0.3)] pr-4">
          <span className="font-prompt text-xl font-bold text-ku-green-dark">
            4.9
          </span>
          <span className="font-prompt text-xs font-medium text-ku-muted">
            Rating
          </span>
        </div>
        <div className="flex flex-col items-center pl-0">
          <span className="font-prompt text-xl font-bold text-ku-ink">128</span>
          <span className="font-prompt text-xs font-medium text-ku-muted">
            Sales
          </span>
        </div>
      </div>
    </div>
  );
}

function SpecsCard() {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-ku-line bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      {/* Title & price */}
      <div className="flex flex-col gap-2 pb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-prompt text-2xl font-semibold text-ku-ink">
            iPad Pro 11&quot; M2 (2022)
          </h1>
          <button aria-label="Save" className="pt-1 text-ku-muted hover:text-ku-green">
            <Bookmark className="size-5" />
          </button>
        </div>

        <p className="font-prompt text-5xl font-bold tracking-[-0.96px] text-ku-green-accent">
          $650
        </p>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-xl border border-[rgba(217,158,48,0.3)] bg-[rgba(253,243,218,0.2)] px-2 py-1 font-prompt text-xs font-medium text-ku-gold">
            Like New
          </span>
          <span className="rounded-xl border border-[rgba(191,201,189,0.3)] bg-ku-periwinkle px-2 py-1 font-prompt text-xs font-medium text-ku-ink">
            Electronics
          </span>
        </div>
      </div>

      <div className="h-px w-full bg-[rgba(191,201,189,0.3)]" />

      {/* Item specifics */}
      <div className="flex flex-col gap-4 py-4">
        <h3 className="font-prompt text-sm font-medium tracking-[0.14px] text-ku-ink">
          Item Specifics
        </h3>
        <ul className="flex flex-col">
          {specs.map((spec) => (
            <li
              key={spec.label}
              className="flex items-center justify-between border-b border-[rgba(191,201,189,0.2)] py-2"
            >
              <span className="font-prompt text-xs font-medium text-ku-muted">
                {spec.label}
              </span>
              <span className="font-prompt text-base text-ku-ink">
                {spec.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Seller notes */}
      <div className="flex flex-col gap-2 pt-2">
        <h3 className="font-prompt text-sm font-medium tracking-[0.14px] text-ku-ink">
          Seller Notes
        </h3>
        <p className="font-prompt text-base leading-6 text-ku-muted">
          Used for one semester for digital art. Perfect condition, always kept
          in a case with a screen protector. Looking to sell or swap.
        </p>
      </div>

      {/* Dual CTA */}
      <div className="mt-auto flex flex-col gap-4 pt-12">
        <button className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-ku-green-accent font-prompt text-sm font-medium tracking-[0.14px] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:brightness-95">
          <ShoppingBag className="size-4" />
          Buy now
        </button>
        <Link
          href="/hoggy"
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-ku-green-accent bg-white font-prompt text-sm font-medium tracking-[0.14px] text-ku-green-accent hover:bg-ku-lilac"
        >
          <Repeat className="size-4" />
          Propose to swap
        </Link>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <div className="flex flex-1 flex-col bg-ku-surface">
      <TopAppBar />

      <main className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: media + seller (8 cols) */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            <ImageCarouselCard />
            <SellerScoreCard />
          </div>

          {/* Right: specs + CTAs (4 cols) */}
          <div className="lg:col-span-4">
            <SpecsCard />
          </div>
        </div>
      </main>
    </div>
  );
}
