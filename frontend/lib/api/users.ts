import { cache } from "react";

import { apiFetch } from "./client";
import { authHeader } from "./session";
import type { User } from "./types";

/**
 * Raw shape of `GET`/`PATCH /users/me` (`users.service.ts`'s `PROFILE_SELECT`)
 * — camelCase, straight off Prisma. Deliberately not merged into
 * `lib/api/types.ts`'s `User` (snake_case, mirrors the PDF).
 */
export interface Profile {
  userId: number;
  email: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameTh: string;
  lastNameTh: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  status: "Active" | "Suspended" | "Banned" | "Deleted";
  emailVerifiedAt: string | null;
  isAdmin: boolean;
  createdAt: string;
}

/** Body for `PATCH /users/me` — snake_case, per `UpdateProfileDto`. All optional. */
export interface UpdateProfilePayload {
  first_name_en?: string;
  last_name_en?: string;
  first_name_th?: string;
  last_name_th?: string;
  phone_number?: string;
  avatar_url?: string;
}

async function authedInit(): Promise<RequestInit> {
  return { headers: await authHeader() };
}

/** Deduplicated per request: the (app) layout and the page often both need it. */
export const getMe = cache(async (): Promise<Profile> => {
  return apiFetch<Profile>("/users/me", await authedInit());
});

export async function updateMe(patch: UpdateProfilePayload): Promise<Profile> {
  const init = await authedInit();
  return apiFetch<Profile>("/users/me", {
    ...init,
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteMe(): Promise<{ userId: number; status: string }> {
  const init = await authedInit();
  return apiFetch("/users/me", { ...init, method: "DELETE" });
}

/**
 * Adapts the real `/users/me` shape to `lib/api/types.ts`'s `User` (mirrors
 * the PDF, snake_case) — the shape every existing profile screen already
 * consumes. Field-for-field identical data, just the naming convention.
 */
export function toUser(profile: Profile): User {
  return {
    user_id: profile.userId,
    email: profile.email,
    first_name_en: profile.firstNameEn,
    last_name_en: profile.lastNameEn,
    first_name_th: profile.firstNameTh,
    last_name_th: profile.lastNameTh,
    phone_number: profile.phoneNumber,
    avatar_url: profile.avatarUrl,
    status: profile.status,
    email_verified_at: profile.emailVerifiedAt,
    isAdmin: profile.isAdmin,
    created_at: profile.createdAt,
  };
}
