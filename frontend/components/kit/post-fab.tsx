import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * Posting is the one thing a student comes to do that is not browsing, and on a
 * phone it was two taps behind a hamburger. A floating button puts it back in
 * the thumb zone without reintroducing a whole tab bar — the drawer is still
 * the navigation, this is just the action.
 *
 * Mobile only: on desktop the Post button already sits in the navbar.
 */
export function PostFab() {
  return (
    <Link
      href="/post"
      aria-label="Post an item"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[50] grid size-14 place-items-center rounded-pill bg-brand text-on-brand shadow-floating transition-transform duration-[--dur-fast] ease-[--ease-spring] active:scale-95 lg:hidden"
    >
      <Plus className="size-6" strokeWidth={2.5} />
    </Link>
  );
}
