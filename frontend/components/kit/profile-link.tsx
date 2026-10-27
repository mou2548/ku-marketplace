import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Makes a person's name and photo open their profile. Wrap a `TrustBadge`
 * (or any picture of a person) with it wherever people appear, such as chat.
 */
export function ProfileLink({
  userId,
  name,
  className,
  children,
}: {
  userId: number;
  name: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/sellers/${userId}`}
      aria-label={`Open ${name}'s profile`}
      title={`Open ${name}'s profile`}
      className={cn(
        "min-w-0 rounded-control outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand",
        className,
      )}
    >
      {children}
    </Link>
  );
}
