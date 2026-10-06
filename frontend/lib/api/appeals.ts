import { apiFetch } from "./client";
import { authHeader } from "./session";
import type { AdminAppeal, Appeal, Sanction } from "./types";

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

/** GET /admin/appeals — every appeal, each with the verdict it contests. */
export async function adminListAppeals(): Promise<AdminAppeal[]> {
  const init = await authedInit();
  return apiFetch<AdminAppeal[]>("/admin/appeals", init);
}

/**
 * POST /admin/appeals/{id}/open. Opening is taking it on: opening a Pending
 * appeal moves it to Under_Review under this admin. Returns the appeal either
 * way.
 */
export async function adminOpenAppeal(appealId: number): Promise<AdminAppeal> {
  const init = await authedInit();
  return apiFetch<AdminAppeal>(`/admin/appeals/${appealId}/open`, {
    ...init,
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** POST /admin/appeals/{id}/decide — the one admin decides the appeal,
 * including against a report they resolved themselves. */
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

export interface EligibleAppeal {
  report_id: number;
  reason_category: string;
  resolution_note: string | null;
  sanction: Sanction | null;
  /** When a temporary suspension ends; null for any other sanction. */
  suspended_until: string | null;
  deadline: string;
}

export async function getEligibleAppeals(): Promise<EligibleAppeal[]> {
  return apiFetch("/appeals/eligible", await authedInit());
}
