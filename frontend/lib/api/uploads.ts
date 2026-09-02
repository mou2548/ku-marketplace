import { apiFetch } from "./client";
import { authHeader } from "./session";

/**
 * `POST /uploads/image` — Cloudinary, multipart field name `file` (see
 * `cloudinary.controller.ts`). 5MB cap, JPEG/PNG/WEBP only, enforced
 * server-side; not duplicated here so the one limit lives in one place.
 */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.set("file", file);

  const { url } = await apiFetch<{ url: string }>("/uploads/image", {
    method: "POST",
    body: form,
    headers: await authHeader(),
  });
  return url;
}
