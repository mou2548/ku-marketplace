import { apiFetch } from "./client";
import { authHeader } from "./session";
import type { Transaction } from "./types";

/**
 * `GET /transactions` / `GET /transactions/{id}` — `transaction.service.ts`
 * now serializes the full join (item, images, buyer, seller) rather than a
 * raw row, so this is close to a pass-through; kept as an explicit adapter
 * (not a bare re-export) to match every other `lib/api/*.ts` module's shape
 * and give the response a single place to adapt from if that ever changes.
 *
 * Scoped to the signed-in user server-side (buyer or seller) — there is no
 * `user_id` query param to pass.
 */

async function authedInit(): Promise<RequestInit> {
  return { headers: await authHeader() };
}

/** GET /transactions — every transaction the signed-in user is a party to. */
export async function getTransactions(): Promise<Transaction[]> {
  const init = await authedInit();
  return apiFetch<Transaction[]>("/transactions", init);
}

/** GET /transactions/{id} */
export async function getTransaction(transactionId: number): Promise<Transaction> {
  const init = await authedInit();
  return apiFetch<Transaction>(`/transactions/${transactionId}`, init);
}
