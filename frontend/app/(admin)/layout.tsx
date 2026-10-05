import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { AdminInitials } from "@/components/admin/admin-ui";
import { AdminSidebar, AdminTabBar } from "@/components/admin/admin-navigation";
import { ThemeSwitch } from "@/components/patterns/theme-switch";
import { ToastProvider } from "@/components/kit/toast";
import { loadAdminQueues, queueCounts } from "@/lib/admin";
import { getAccessToken } from "@/lib/api/session";
import { getMe } from "@/lib/api/users";

/**
 * Moderation is a different job from using the marketplace, so it gets its own
 * shell: a left rail of four sections with their waiting counts on desktop, a
 * bottom tab bar on phones, and a thin top bar with notifications and a way
 * back out.
 *
 * Signed-out visitors go to login and signed-in non-admins to the feed; the
 * API enforces the same rule on every `/admin/*` endpoint.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getAccessToken())) redirect("/login");
  const viewer = await getMe().catch(() => undefined);
  if (!viewer || !viewer.isAdmin) redirect("/feed");

  const counts = queueCounts(await loadAdminQueues());
  const name = `${viewer.firstNameEn} ${viewer.lastNameEn}`.trim();

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-page lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <AdminSidebar counts={counts} />

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-[50] flex h-15 items-center gap-2 border-b border-line bg-page px-4 lg:px-8">
            <p className="flex items-baseline gap-2 font-semibold tracking-[-0.01em] lg:hidden">
              KU Marketplace{" "}
              <span className="text-caption font-normal text-ink-muted">
                Admin
              </span>
            </p>
            <div className="ml-auto flex items-center gap-1">
              <Link
                href="/feed"
                className="hidden min-h-9 items-center rounded-[10px] border border-line-default px-3 text-body-sm text-ink-secondary hover:bg-surface-sunken sm:flex"
              >
                User mode
              </Link>
              <ThemeSwitch />
              <Link
                href="/notifications"
                aria-label="Notifications"
                title="Notifications"
                className="grid size-11 place-items-center rounded-[10px] text-ink-secondary hover:bg-surface-sunken"
              >
                <Bell aria-hidden className="size-5" />
              </Link>
              <span title={name} className="ml-1">
                <AdminInitials name={name} />
                <span className="sr-only">Signed in as {name}</span>
              </span>
            </div>
          </header>

          <main
            id="main"
            className="w-full flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-10 lg:pt-8"
          >
            {children}
          </main>
        </div>
      </div>
      <AdminTabBar counts={counts} />
    </ToastProvider>
  );
}
