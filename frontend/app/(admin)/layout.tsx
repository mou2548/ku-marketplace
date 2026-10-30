import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { AdminSidebar, AdminTabBar } from "@/components/admin/admin-navigation";
import { ModeSwitch } from "@/components/kit/mode-switch";
import { ThemeSwitch } from "@/components/patterns/theme-switch";
import { ToastProvider } from "@/components/kit/toast";
import { UserAvatar } from "@/components/kit/user-avatar";
import { loadAdminQueues, queueCounts } from "@/lib/admin";
import { requireViewer } from "@/lib/viewer";

/**
 * Moderation is a different job from using the marketplace, so it gets its own
 * shell: a left rail of seven sections (queues with their waiting counts) on desktop, a
 * bottom tab bar on phones, and a thin top bar with notifications and a way
 * back out.
 *
 * Signed-out visitors go to login and signed-in non-admins to the feed; the
 * API enforces the same rule on every `/admin/*` endpoint.
 *
 * Only an answer from the API decides between those two (audit N01). A 401 is
 * a session that has ended; anything else (the API unreachable, a 5xx) is
 * thrown to the error boundary, because an outage says nothing about who the
 * viewer is and must not bounce an admin to the feed or to login.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) redirect("/feed");

  const counts = queueCounts(await loadAdminQueues());
  const name = `${viewer.firstNameEn} ${viewer.lastNameEn}`.trim();

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-page lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <AdminSidebar counts={counts} />

        <div className="flex min-w-0 flex-col">
          {/* Same height as the marketplace navbar (app-shell.tsx), so switching
              between User mode and admin does not shift the page. */}
          <header className="sticky top-0 z-[50] flex h-[4.25rem] items-center gap-2 border-b border-line bg-page px-4 lg:px-8">
            {/* Hidden on phones, where the mode switch already says "Admin" and
                the bar has no room for both. */}
            <p className="hidden items-baseline gap-2 font-semibold tracking-[-0.01em] sm:flex lg:hidden">
              KU Marketplace{" "}
              <span className="text-caption font-normal text-ink-muted">
                Admin
              </span>
            </p>
            <div className="ml-auto flex items-center gap-1">
              <ModeSwitch current="admin" className="mr-1" />
              <ThemeSwitch />
              <Link
                href="/notifications"
                aria-label="Notifications"
                title="Notifications"
                className="grid size-11 place-items-center rounded-[10px] text-ink-secondary hover:bg-surface-sunken"
              >
                <Bell aria-hidden className="size-5" />
              </Link>
              <Link
                href="/account"
                title={name}
                className="touch-target ml-1 grid size-10 place-items-center rounded-full hover:ring-2 hover:ring-[var(--brand-subtle-hover)]"
              >
                <UserAvatar name={name} avatarUrl={viewer.avatarUrl} />
                <span className="sr-only">Your account, signed in as {name}</span>
              </Link>
            </div>
          </header>

          <main
            id="main"
            className="w-full flex-1 px-4 pb-28 pt-6 wrap-anywhere lg:px-8 lg:pb-10 lg:pt-8"
          >
            {children}
          </main>
        </div>
      </div>
      <AdminTabBar counts={counts} />
    </ToastProvider>
  );
}
