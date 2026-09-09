import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { ThemeSwitch } from "@/components/patterns/theme-switch";
import { ToastProvider } from "@/components/kit/toast";
import { adminListAppeals } from "@/lib/api/appeals";
import { listPendingPayments } from "@/lib/api/membership";
import { adminListReports } from "@/lib/api/reports";
import { getAccessToken } from "@/lib/api/session";
import { getMe } from "@/lib/api/users";

/**
 * Moderation is a different job from using the marketplace, so it gets its own
 * shell rather than a hidden branch of the student navigation. Three queues,
 * each with its pending count, and a way back out.
 *
 * This used to have no authentication check at all — anyone could browse
 * `/admin/*`. Reports and appeals are real now, so the gate has to be too:
 * same `redirect("/login")` pattern as `account/page.tsx`, plus a redirect
 * for a signed-in non-admin.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getAccessToken())) redirect("/login");
  const viewer = await getMe().catch(() => undefined);
  if (!viewer || !viewer.isAdmin) redirect("/feed");

  const [reports, appeals, memberships] = await Promise.all([
    adminListReports(),
    adminListAppeals(),
    listPendingPayments(),
  ]);

  const counts = {
    reports: reports.filter(
      (report) =>
        report.status === "Pending" || report.status === "Under_Investigation",
    ).length,
    appeals: appeals.filter(
      (appeal) => appeal.status === "Pending" || appeal.status === "Under_Review",
    ).length,
    memberships: memberships.length,
  };

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-[50] border-b border-line bg-immersive text-white">
          <div className="flex h-16 w-full items-center gap-5 px-4 lg:px-8">
            <span className="flex shrink-0 items-center gap-2 font-semibold tracking-[-0.012em]">
              <ShieldCheck aria-hidden className="size-5 text-white" />
              Admin workspace
            </span>

            <AdminNavigation counts={counts} />

            <div className="ml-auto flex shrink-0 items-center gap-1">
              <ThemeSwitch className="text-white hover:bg-white/10 hover:text-white" />
              <Link
                href="/feed"
                className="flex min-h-11 items-center gap-2 rounded-control px-2 text-body-sm text-white/80 hover:bg-white/10 hover:text-white sm:px-3"
              >
                <ArrowLeft aria-hidden className="size-4" />
                <span className="hidden sm:inline">Marketplace</span>
              </Link>
            </div>
          </div>
        </header>

        <main
          id="main"
          className="w-full flex-1 px-4 py-6 pb-24 lg:pb-8 lg:px-8"
        >
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
