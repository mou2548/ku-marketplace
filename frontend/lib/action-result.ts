import { unstable_rethrow } from "next/navigation";

import { ApiError } from "@/lib/api/client";
import { errorText } from "@/lib/api-errors";

/**
 * What a Server Action hands back instead of throwing.
 *
 * In a production build Next.js replaces the message of any error thrown out of
 * a Server Action with a generic sentence, so the client can never show why the
 * API refused ("An error occurred in the Server Components render..."). Actions
 * therefore catch on the server and return the reason as data.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Runs an action body and converts failures into `{ ok: false, error }`.
 * Next.js control flow (`redirect()`, `notFound()`) is rethrown untouched.
 */
export async function runAction<T>(body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body() };
  } catch (err) {
    unstable_rethrow(err);
    // Expected refusals are the API's own 4xx answers; anything else is a bug
    // or an outage and still belongs in the server log.
    const signedOut = err instanceof Error && err.message === "Not signed in";
    if (!signedOut && (!(err instanceof ApiError) || err.status >= 500)) {
      console.error(err);
    }
    return { ok: false, error: errorText(err) };
  }
}

/**
 * For components handed an action as an opaque callback (a Server Component
 * can pass `action.bind(...)` but cannot unwrap its result): true when the
 * value it resolved to is a failed `ActionResult`.
 */
export function isActionFailure(value: unknown): value is { ok: false; error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === false &&
    typeof (value as { error?: unknown }).error === "string"
  );
}

/**
 * Client side: resolves to the action's data, or throws an `Error` whose
 * message is the user-facing reason. Thrown here, in the browser, the message
 * survives, so existing `try/catch` blocks that show `err.message` keep working.
 */
export async function unwrapAction<T>(result: Promise<ActionResult<T>>): Promise<T> {
  const settled = await result;
  if (!settled.ok) throw new Error(settled.error);
  return settled.data;
}
