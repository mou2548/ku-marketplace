"use server";

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

export async function createAppeal(input: CreateAppealInput): Promise<Appeal> {
  await requireSession();
  return createAppealApi(input);
}

export async function adminOpenAppeal(appealId: number): Promise<AdminAppeal> {
  await requireSession();
  return adminOpenAppealApi(appealId);
}

export async function adminDecideAppeal(
  appealId: number,
  input: DecideAppealInput,
): Promise<Appeal> {
  await requireSession();
  return adminDecideAppealApi(appealId, input);
}
