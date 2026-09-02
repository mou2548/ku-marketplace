import { Bell } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { getNotifications } from "@/lib/api/notifications";

import { NotificationsScreen } from "./notifications-screen";

/** Derived from the viewer's own transactions/offers/reports each load. */
export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications - KU Marketplace" };

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="size-6" />}
        title="Nothing has happened yet"
        description="Updates on your deals, offers, and giveaways land here as they happen."
      />
    );
  }

  return <NotificationsScreen notifications={notifications} />;
}
