import { getNotifications } from "@/lib/api/notifications";

import { NotificationsScreen } from "./notifications-screen";

/** Derived from the viewer's own transactions/offers/reports each load. */
export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications - KU Marketplace" };

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return <NotificationsScreen notifications={notifications} />;
}
