"use server";

import {
  adminDecideAppeal as adminDecideAppealApi,
  createAppeal as createAppealApi,
  type CreateAppealInput,
  type DecideAppealInput,
} from "@/lib/api/appeals";
import { getAccessToken } from "@/lib/api/session";
import type { Appeal } from "@/lib/api/types";

async function requireSession() {
  if (!(await getAccessToken())) throw new Error("Not signed in");
}

export async function createAppeal(input: CreateAppealInput): Promise<Appeal> {
  await requireSession();
  return createAppealApi(input);
}

export async function adminDecideAppeal(
  appealId: number,
  input: DecideAppealInput,
): Promise<Appeal> {
  await requireSession();
  return adminDecideAppealApi(appealId, input);
}
