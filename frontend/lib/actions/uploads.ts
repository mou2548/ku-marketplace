"use server";

import { runAction, type ActionResult } from "@/lib/action-result";
import { getAccessToken } from "@/lib/api/session";
import { uploadImage } from "@/lib/api/uploads";

/**
 * Server Action wrapper — `lib/api/uploads.ts`'s `uploadImage` reads the
 * session cookie (`next/headers`), which can only run in a server context.
 * Every caller so far is a client component (`item-form.tsx`, the membership
 * slip uploader), so this is the one place that boundary gets crossed;
 * calling `uploadImage` directly from client code fails the Next.js build
 * (`next/headers` bundled into a Client Component) rather than just erroring
 * at runtime.
 */
export async function uploadFile(file: File): Promise<ActionResult<string>> {
  return runAction(async () => {
    if (!(await getAccessToken())) {
      throw new Error("Not signed in");
    }
    return uploadImage(file);
  });
}
