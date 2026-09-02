import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Crown, Scale, ShieldAlert } from "lucide-react";

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
  if (!viewer || !viewer.isAdmin) redirect("/");

  const [reports, appeals, memberships] = await Promise.all([
    adminListReports(),
    adminListAppeals(),
    listPendingPayments(),
  ]);

  const queues = [
    {
      href: "/admin/reports",
      label: "Reports",
      icon: ShieldAlert,
      count: reports.filter(
        (r) => r.status === "Pending" || r.status === "Under_Investigation",
      ).length,
    },
    {
      href: "/admin/appeals",
      label: "Appeals",
      icon: Scale,
      count: appeals.filter((a) => a.status === "Pending" || a.status === "Under_Review")
        .length,
    },
    {
      href: "/admin/memberships",
      label: "Memberships",
      icon: Crown,
      count: memberships.length,
    },
  ];

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-[50] border-b border-line bg-surface-inverse text-white">
          <div className="flex h-16 w-full items-center gap-3 px-4 lg:px-8">
            {/* Truncates rather than pushing the row wide: at 360 the title,
                three queue links and the back link together overflowed. */}
            <span className="min-w-0 truncate font-bold tracking-[-0.012em]">
              KU Marketplace · Admin
            </span>

            <nav
              aria-label="Moderation queues"
              className="flex shrink-0 items-center gap-1 sm:ml-4"
            >
              {queues.map(({ href, label, icon: Icon, count }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex min-h-11 items-center gap-2 rounded-control px-3 text-[0.9375rem] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Icon aria-hidden className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                  {count > 0 ? (
                    <span
                      data-numeric
                      className="grid min-w-5 place-items-center rounded-pill bg-tone-danger-solid px-1.5 text-[0.6875rem] font-semibold"
                    >
                      {count}
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>

            <Link
              href="/"
              className="ml-auto flex min-h-11 shrink-0 items-center gap-2 rounded-control px-3 text-[0.875rem] text-white/70 hover:text-white"
            >
              <ArrowLeft aria-hidden className="size-4" />
              <span className="hidden sm:inline">Back to the marketplace</span>
            </Link>
          </div>
        </header>

        <main
          id="main"
          className="w-full flex-1 px-4 py-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
