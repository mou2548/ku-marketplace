import { cookies } from "next/headers";

import { getNotifications } from "@/lib/api/notifications";
import { getCurrentUserId } from "@/lib/api/session";
import {
  attentionKeys,
  notificationsReadCookie,
  notificationsSeenCookie,
  toFeed,
} from "@/lib/notification-seen";

import { MarkNotificationsSeen } from "./mark-notifications-seen";
import { NotificationsScreen } from "./notifications-screen";

/** Derived from the viewer's own transactions/offers/reports each load. */
export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications - KU Marketplace" };

export default async function NotificationsPage() {
  const [notifications, viewerId] = await Promise.all([
    getNotifications(),
    getCurrentUserId(),
  ]);

  return (
    <>
      {viewerId ? (
        <MarkNotificationsSeen
          cookie={notificationsSeenCookie(viewerId)}
          keys={attentionKeys(toFeed(notifications))}
        />
      ) : null}
      <NotificationsScreen
        notifications={notifications}
        readCookie={viewerId ? notificationsReadCookie(viewerId) : undefined}
        initialRead={
          viewerId
            ? ((await cookies()).get(notificationsReadCookie(viewerId))?.value ?? "")
            : ""
        }
      />
    </>
  );
}
