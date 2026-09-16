"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

/** Keep the mounted form intact; reauthenticate in another tab and resume. */
export function SessionNotice({ signedIn }: { signedIn: boolean }) {
  const [expired, setExpired] = useState(false);
  const locale = useLocale();
  useEffect(() => {
    if (!signedIn) return;
    let stopped = false;
    let pending = false;
    async function check() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        if (!stopped && (response.ok || response.status === 401))
          setExpired(response.status === 401);
      } catch {
        // A network outage is not an expired session.
      } finally {
        pending = false;
      }
    }
    const interval = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [signedIn]);
  if (!expired) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[150] bg-surface p-4 text-ink shadow-floating"
    >
      <p>
        {locale === "th"
          ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบในแท็บใหม่ แล้วกลับมาทำรายการต่อในหน้านี้"
          : "Your session expired. Sign in in a new tab, then return here to continue."}
      </p>
      <a
        href="/login"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center font-semibold underline"
      >
        {locale === "th" ? "เข้าสู่ระบบในแท็บใหม่" : "Sign in in a new tab"}
      </a>
    </div>
  );
}
