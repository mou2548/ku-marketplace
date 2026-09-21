import { apiFetch } from "./client";
import { authHeader } from "./session";
import type { Appeal } from "./types";

/**
 * Wires §7.4's appeal flow to `appeal.service.ts`'s real shapes. Same
 * thin-pass-through shape as `lib/api/reports.ts` — the backend already
 * matches `types.ts`'s `Appeal` field-for-field.
 */

export interface CreateAppealInput {
  report_id: number;
  reason: string;
  evidence_urls?: string[];
}

export interface DecideAppealInput {
  status: "Approved" | "Rejected";
  resolution_note?: string;
}

async function authedInit(): Promise<RequestInit> {
  return { headers: await authHeader() };
}

/** POST /appeals — the appellant must be the party the report was actually
 * filed against, and the 7-day window from the report's resolution must
 * still be open; both enforced server-side. */
export async function createAppeal(input: CreateAppealInput): Promise<Appeal> {
  const init = await authedInit();
  return apiFetch<Appeal>("/appeals", {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** GET /appeals — the signed-in user's own appeals. */
export async function getMyAppeals(): Promise<Appeal[]> {
  const init = await authedInit();
  return apiFetch<Appeal[]>("/appeals", init);
}

/** GET /admin/appeals — every appeal. */
export async function adminListAppeals(): Promise<Appeal[]> {
  const init = await authedInit();
  return apiFetch<Appeal[]>("/admin/appeals", init);
}

/** POST /admin/appeals/{id}/decide — the backend rejects this if the caller
 * is the same admin who resolved the original report (§7.4). */
export async function adminDecideAppeal(
  appealId: number,
  input: DecideAppealInput,
): Promise<Appeal> {
  const init = await authedInit();
  return apiFetch<Appeal>(`/admin/appeals/${appealId}/decide`, {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getEligibleAppeals(): Promise<Array<{ report_id: number; reason_category: string; resolution_note: string | null; deadline: string }>> {
  return apiFetch("/appeals/eligible", await authedInit());
}
