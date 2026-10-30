"use server";

import { runAction, type ActionResult } from "@/lib/action-result";
import { getNotifications } from "@/lib/api/notifications";
import { toFeed, type FeedItem } from "@/lib/notification-seen";

/**
 * The viewer's notifications in the small shape the shell polls for the bell's
 * dot and the giveaway pop-up. A server action because the list is assembled
 * from the session cookie, which only the server can read.
 */
export async function fetchNotificationFeed(): Promise<ActionResult<FeedItem[]>> {
  return runAction(async () => toFeed(await getNotifications()));
}
