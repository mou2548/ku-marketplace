"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Scale, ShieldAlert } from "lucide-react";

import { logout } from "@/lib/actions/auth";
import { formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";

import { UserAvatar } from "./user-avatar";

export interface Restriction {
  status: "Suspended" | "Banned";
  /** When a temporary suspension ends, if known. */
  until: string | null;
}

/** The only screens a suspended or banned account can use (the API allows
 * just these). Anything else would fail to load. */
const ALLOWED = ["/account/appeals", "/notifications"];
const allowed = (pathname: string) =>
  ALLOWED.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/**
 * The shell for a suspended or banned account. The marketplace is closed to
 * it, so there is no marketplace navigation: only its appeals, its
 * notifications and a way to sign out, which every screen keeps in view.
 * Any other address sends it back to its appeals instead of an error page.
 */
export function RestrictedShell({
  restriction,
  user,
  children,
}: {
  restriction: Restriction;
  user?: { name: string; avatarUrl?: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const ok = allowed(pathname);

  useEffect(() => {
    if (!ok) router.replace("/account/appeals");
  }, [ok, router]);

  // The restriction is read when the layout renders, and a layout is not
  // rendered again on client navigation. Re-check on returning to the tab and
  // once a minute, so a lifted or expired suspension frees the account without
  // a manual reload.
  useEffect(() => {
    const refresh = () => router.refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [router]);

  const linkClass = (href: string) =>
    cn(
      "flex min-h-10 items-center gap-1.5 rounded-control px-3 text-body-sm transition-colors",
      pathname.startsWith(href)
        ? "bg-brand-subtle font-semibold text-ink-brand"
        : "text-ink-secondary hover:bg-surface-sunken hover:text-ink",
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-[50] w-full border-b border-line bg-surface">
        <div className="flex h-[4.25rem] w-full items-center gap-3 px-3 sm:px-4 lg:px-8">
          <span className="flex shrink-0 items-center gap-2.5">
            <span className="grid size-10 place-items-center overflow-hidden rounded-control bg-white shadow-flat">
              <Image
                src="/images/ku-logo.png"
                alt="KU Marketplace"
                width={32}
                height={32}
                className="size-8 object-contain"
              />
            </span>
            <span className="hidden text-body-lg font-bold tracking-[-0.018em] text-ink-brand sm:block">
              Marketplace
            </span>
          </span>
          <nav aria-label="Account" className="ml-auto flex items-center gap-1">
            <Link href="/account/appeals" className={linkClass("/account/appeals")}>
              <Scale aria-hidden className="size-4" />
              <span className="hidden sm:inline">My appeals</span>
            </Link>
            <Link
              href="/notifications"
              aria-label="Notifications"
              className={linkClass("/notifications")}
            >
              <Bell aria-hidden className="size-4" />
            </Link>
            {user ? (
              <span title={user.name} className="mx-1 hidden sm:inline-grid">
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
              </span>
            ) : null}
            <form action={logout}>
              <button
                type="submit"
                className="flex min-h-10 items-center gap-1.5 rounded-control px-3 text-body-sm font-medium text-tone-danger-fg transition-colors hover:bg-tone-danger-bg"
              >
                <LogOut aria-hidden className="size-4" />
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div
        role="status"
        className="flex items-start gap-3 border-b border-tone-danger-border bg-tone-danger-bg px-4 py-3 text-body-sm text-tone-danger-fg lg:px-8"
      >
        <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
        <p>
          {restriction.status === "Banned" ? (
            <>
              <strong>Your account is banned.</strong> It stays closed until
              an appeal is upheld.
            </>
          ) : (
            <>
              <strong>Your account is suspended</strong>
              {restriction.until
                ? ` until ${formatDateTime(new Date(restriction.until))}. Access returns automatically then.`
                : "."}
            </>
          )}{" "}
          The marketplace is unavailable meanwhile; you can read the decision
          and appeal it from My appeals.
        </p>
      </div>

      <main id="main" className="w-full flex-1 px-3 py-4 pb-12 sm:px-4 lg:px-8 lg:py-6">
        {ok ? (
          children
        ) : (
          <p role="status" className="py-10 text-center text-body-sm text-ink-muted">
            Taking you to your appeals...
          </p>
        )}
      </main>
    </div>
  );
}
