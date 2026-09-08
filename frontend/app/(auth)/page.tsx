import { redirect } from "next/navigation";

import { getAccessToken } from "@/lib/api/session";

import { AuthPanel } from "./auth-panel";

export const metadata = { title: "Sign in - KU Marketplace" };

/** The public landing page; an existing session continues to the feed. */
export default async function HomePage() {
  if (await getAccessToken()) redirect("/feed");

  return <AuthPanel />;
}
