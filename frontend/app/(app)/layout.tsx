import { AppShell } from "@/components/kit/app-shell";
import { ToastProvider } from "@/components/kit/toast";
import { getCurrentUserId } from "@/lib/api/session";
import { getTransactions } from "@/lib/api/transactions";
import { getEligibleAppeals } from "@/lib/api/appeals";
import { getMe } from "@/lib/api/users";
import type { Restriction } from "@/components/kit/restricted-shell";
import { actionCount, buildInbox } from "@/lib/inbox";

/**
 * The app shell (docs/design/ia.md §4). A Server Component: the badge counts
 * are derived on the server from data the page needs anyway, so the nav does
 * not cost a client round trip.
 *
 * The previous build had a sticky top navbar but no route group, so the header
 * was pasted into pages individually and drifted. The navbar shape is kept —
 * the team preferred it — but it now lives in exactly one place.
 *
 * Runs for every `(app)` route, including before a page's own auth guard
 * redirects a signed-out visitor, so every backend read here is guarded: no
 * token means the plain shell, and a failed fetch degrades the badges to zero
 * rather than taking the whole app down.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewerId = await getCurrentUserId();

  let user:
    | { name: string; avatarUrl: string | null; isAdmin: boolean }
    | undefined;
  let restricted = false;
  let restriction: Restriction | null = null;
  let badges = { actions: 0, offers: 0, deals: 0 };

  if (viewerId) {
    const [transactions, me] = await Promise.all([
      getTransactions().catch(() => []),
      getMe().catch(() => undefined),
    ]);

    if (me) {
      restricted = me.status === "Suspended" || me.status === "Banned";
      user = {
        name: [me.firstNameEn, me.lastNameEn].filter(Boolean).join(" ") || me.email,
        avatarUrl: me.avatarUrl,
        isAdmin: me.isAdmin === true && !restricted,
      };
    }

    if (restricted && me) {
      // The latest suspension end among the decisions still open to appeal.
      const eligible = await getEligibleAppeals().catch(() => []);
      const until =
        eligible
          .map((report) => report.suspended_until)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? null;
      restriction = {
        status: me.status === "Banned" ? "Banned" : "Suspended",
        until: me.status === "Banned" ? null : until,
      };
    }

    try {
      // No endpoint lists a user's offers across posts (docs/design/api-gaps.md),
      // so the inbox and its badges are built from transactions alone. The
      // offers badge stays at zero until such an endpoint exists.
      const inbox = buildInbox(transactions, [], viewerId);
      badges = { actions: actionCount(inbox), offers: 0, deals: inbox.yours.length };
    } catch {
      badges = { actions: 0, offers: 0, deals: 0 };
    }
  }

  return (
    <ToastProvider>
      <AppShell user={user} badges={badges} restriction={restriction}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}
