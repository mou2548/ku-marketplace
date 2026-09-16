"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Flag, Share2, UserPlus, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/kit/button";
import { ReportDialog } from "@/components/kit/report-dialog";
import { setFollowing } from "@/lib/actions/following";

export const sellerLinkClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 py-2 text-body-sm font-semibold text-ink-brand hover:bg-brand-subtle focus-visible:outline-2 focus-visible:outline-offset-2";

export function RefreshOnFocus() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);
  return null;
}

export function FollowButton({
  sellerId,
  following,
  signedIn = true,
  directory = false,
  appearance = "default",
}: {
  sellerId: number;
  following: boolean | null;
  signedIn?: boolean;
  directory?: boolean;
  appearance?: "default" | "profile";
}) {
  const t = useTranslations("seller");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const profileAppearance = appearance === "profile";
  const profileButtonClass =
    "w-full border border-on-brand-strong bg-on-brand-strong [color:var(--bg-brand-strong)] shadow-none hover:bg-on-brand-strong/90 data-[pressed]:bg-on-brand-strong/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-brand-strong";
  const loginHref = `/login?returnTo=${encodeURIComponent(`/sellers/${sellerId}`)}`;
  if (!signedIn)
    return (
      <Link
        href={loginHref}
        className={cn(sellerLinkClass, profileAppearance && profileButtonClass)}
      >
        <UserPlus aria-hidden className="size-4" />
        {t("follow")}
      </Link>
    );
  if (following === null)
    return (
      <div role="status">
        <p className="text-body-sm">{t("stateError")}</p>
        <Button
          variant="secondary"
          className={profileAppearance ? profileButtonClass : undefined}
          onPress={() => router.refresh()}
        >
          {t("retry")}
        </Button>
      </div>
    );
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={following ? "secondary" : "primary"}
        className={profileAppearance ? profileButtonClass : undefined}
        isLoading={pending}
        isDisabled={pending}
        aria-pressed={following}
        loadingLabel={t("loading")}
        onPress={async () => {
          setPending(true);
          setError(undefined);
          try {
            const result = await setFollowing(sellerId, !following);
            if (result.error === "login") {
              router.push(loginHref);
              return;
            }
            if (result.error)
              setError(
                t(
                  result.error === "unavailable"
                    ? "unavailable"
                    : "actionError",
                ),
              );
            else router.refresh();
          } catch {
            setError(t("actionError"));
          } finally {
            setPending(false);
          }
        }}
      >
        {following ? (
          <UserCheck aria-hidden className="size-4" />
        ) : (
          <UserPlus aria-hidden className="size-4" />
        )}
        {t(following ? (directory ? "unfollow" : "following") : "follow")}
      </Button>
      {error ? (
        <p
          role="alert"
          className={cn(
            "text-body-sm text-tone-danger-fg",
            profileAppearance && "w-full rounded-control bg-surface p-2",
          )}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SellerActions({
  sellerId,
  report,
}: {
  sellerId: number;
  report: boolean;
}) {
  const t = useTranslations("seller");
  const [feedback, setFeedback] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        onPress={async () => {
          const url = `${window.location.origin}/sellers/${sellerId}`;
          try {
            if (navigator.share) await navigator.share({ url });
            else {
              await navigator.clipboard.writeText(url);
              setFeedback(t("copied"));
            }
          } catch (error) {
            if (!(error instanceof Error && error.name === "AbortError"))
              setFeedback(t("shareError"));
          }
        }}
      >
        <Share2 aria-hidden className="size-4" />
        {t("share")}
      </Button>
      {report ? (
        <ReportDialog
          reportType="User"
          targetId={sellerId}
          reasons={["fraud", "harassment", "other"].map((id) => ({
            id,
            label: t(id),
          }))}
          trigger={
            <Button variant="ghost">
              <Flag aria-hidden className="size-4" />
              {t("report")}
            </Button>
          }
        />
      ) : null}
      <span role="status" className="text-body-sm text-ink-secondary">
        {feedback}
      </span>
    </div>
  );
}
