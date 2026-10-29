"use server";

import { runAction } from "@/lib/action-result";
import { getAccessToken } from "@/lib/api/session";
import {
  listAdminTransactions,
  reinstateUser as reinstateUserApi,
  suspendUser as suspendUserApi,
  type AdminSanction,
} from "@/lib/api/admin";

async function requireSession() {
  if (!(await getAccessToken())) throw new Error("Not signed in");
}

/** The live transactions table polls through this; the API enforces admin. */
export async function pollAdminTransactions(query: string) {
  return runAction(async () => {
    await requireSession();
    return listAdminTransactions(new URLSearchParams(query));
  });
}

export async function suspendUser(
  userId: number,
  sanction: AdminSanction,
  reason: string,
) {
  return runAction(async () => {
    await requireSession();
    return suspendUserApi(userId, sanction, reason);
  });
}

export async function reinstateUser(userId: number, note?: string) {
  return runAction(async () => {
    await requireSession();
    return reinstateUserApi(userId, note);
  });
}
