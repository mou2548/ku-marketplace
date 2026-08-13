import { AppShell } from "@/components/kit/app-shell";
import { ToastProvider } from "@/components/kit/toast";
import { getOffers, getTransactions, getViewer, VIEWER_ID } from "@/lib/api/fixtures";
import { actionCount, buildInbox, offersNeedingAnswer } from "@/lib/inbox";

/**
 * The app shell (docs/design/ia.md §4). A Server Component: the badge counts
 * are derived on the server from data the page needs anyway, so the nav does
 * not cost a client round trip.
 *
 * The previous build had a sticky top navbar but no route group, so the header
 * was pasted into pages individually and drifted. The navbar shape is kept —
 * the team preferred it — but it now lives in exactly one place.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transactions, offers, viewer] = await Promise.all([
    getTransactions(),
    getOffers(),
    getViewer(),
  ]);

  const inbox = buildInbox(transactions, offers, VIEWER_ID);

  return (
    <ToastProvider>
      <AppShell
        user={{ name: viewer.name }}
        badges={{
          actions: actionCount(inbox),
          offers: offersNeedingAnswer(offers, VIEWER_ID),
          deals: inbox.yours.length,
        }}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
