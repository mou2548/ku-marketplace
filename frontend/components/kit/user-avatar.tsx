import { cn } from "@/lib/utils";

/** Up to two initials from a display name: "Somchai Jaidee" -> "SJ". */
export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

const SIZE = {
  sm: "size-8 text-[0.72rem]",
  md: "size-10 text-meta",
  lg: "size-16 text-h2",
} as const;

/**
 * The one picture of a person used across the product: their photo when they
 * have uploaded one, otherwise their initials on the brand tint. The navbar,
 * the mobile menu, the admin top bar and the profile header all use it, so a
 * person looks the same wherever they appear.
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-subtle font-semibold text-ink-brand",
        SIZE[size],
        className,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user upload, arbitrary host
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
