import Link from "next/link";
import { ArrowLeft, Crown, Scale, ShieldAlert } from "lucide-react";

import { ToastProvider } from "@/components/kit/toast";
import { getAdminAppeals, getAdminReports, getMembershipRequests } from "@/lib/api/fixtures";

/**
 * Moderation is a different job from using the marketplace, so it gets its own
 * shell rather than a hidden branch of the student navigation. Three queues,
 * each with its pending count, and a way back out.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reports, appeals, memberships] = await Promise.all([
    getAdminReports(),
    getAdminAppeals(),
    getMembershipRequests(),
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
      count: appeals.filter((a) => a.status !== "Appeal_Upheld").length,
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
          <div className="mx-auto flex h-16 w-full max-w-[80rem] items-center gap-3 px-4 lg:px-8">
            <span className="font-bold tracking-[-0.012em]">
              KU Marketplace · Admin
            </span>

            <nav aria-label="Moderation queues" className="ml-4 flex items-center gap-1">
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
              className="ml-auto flex min-h-11 items-center gap-2 rounded-control px-3 text-[0.875rem] text-white/70 hover:text-white"
            >
              <ArrowLeft aria-hidden className="size-4" />
              <span className="hidden sm:inline">Back to the marketplace</span>
            </Link>
          </div>
        </header>

        <main
          id="main"
          className="mx-auto w-full max-w-[80rem] flex-1 px-4 py-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
