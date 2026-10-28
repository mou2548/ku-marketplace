"use server";

import { runAction, type ActionResult } from "@/lib/action-result";
import {
  adminDecideAppeal as adminDecideAppealApi,
  adminOpenAppeal as adminOpenAppealApi,
  createAppeal as createAppealApi,
  type CreateAppealInput,
  type DecideAppealInput,
} from "@/lib/api/appeals";
import { getAccessToken } from "@/lib/api/session";
import type { AdminAppeal, Appeal } from "@/lib/api/types";

async function requireSession() {
  if (!(await getAccessToken())) throw new Error("Not signed in");
}

export async function createAppeal(input: CreateAppealInput): Promise<ActionResult<Appeal>> {
  return runAction(async () => {
    await requireSession();
    return createAppealApi(input);
  });
}

export async function adminOpenAppeal(appealId: number): Promise<ActionResult<AdminAppeal>> {
  return runAction(async () => {
    await requireSession();
    return adminOpenAppealApi(appealId);
  });
}

export async function adminDecideAppeal(
  appealId: number,
  input: DecideAppealInput,
): Promise<ActionResult<Appeal>> {
  return runAction(async () => {
    await requireSession();
    return adminDecideAppealApi(appealId, input);
  });
}
