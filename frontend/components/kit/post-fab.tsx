import { useTranslations } from "next-intl";
import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * Posting is the one thing a student comes to do that is not browsing, and on a
 * phone it was two taps behind a hamburger.
 *
 * There is a tab bar now, so this sits above it rather than in its place: the
 * bar is where you go, this is what you do. Mobile only — on desktop the Post
 * button already sits in the navbar.
 */
export function PostFab() {
  const t = useTranslations();
  return (
    <Link
      href="/post"
      aria-label={t("nav.postAnItem")}
      className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[50] grid size-14 md:bottom-[max(1rem,env(safe-area-inset-bottom))] place-items-center rounded-pill bg-brand text-on-brand shadow-floating transition-transform duration-[--dur-fast] ease-[--ease-spring] active:scale-95 lg:hidden"
    >
      <Plus className="size-6" strokeWidth={2.5} />
    </Link>
  );
}
