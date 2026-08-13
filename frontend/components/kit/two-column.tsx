import { cn } from "@/lib/utils";

/**
 * A main column with a fixed rail beside it.
 *
 * Measured on the built product at 1440px: `/chat`, `/notifications` and
 * `/account` were using 47% of the window and `/post` and `/account/membership`
 * 53%, because each was a single centred `max-w-2xl` column with roughly 380px
 * of dead gutter on either side. The rail is the fix, and it carries content
 * those screens already had rather than anything invented to fill space.
 *
 * Mobile first (CLAUDE.md §5): one column below `lg`, the grid above it. The
 * rail is written after the main content, so on a phone it stacks underneath —
 * `railFirst` flips that for the one screen where the rail is the page's own
 * header rather than a companion to it.
 */
export function TwoColumn({
  children,
  rail,
  railSide = "right",
  railFirst = false,
  className,
}: {
  children: React.ReactNode;
  rail: React.ReactNode;
  railSide?: "left" | "right";
  /** Stack the rail above the main column on small screens. */
  railFirst?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 lg:grid lg:items-start lg:gap-8",
        railSide === "left"
          ? "lg:grid-cols-[20rem_minmax(0,1fr)]"
          : "lg:grid-cols-[minmax(0,1fr)_20rem]",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-5",
          // Source order stays main-then-rail for the keyboard and the screen
          // reader; only the painted position moves.
          railSide === "left" && "lg:col-start-2 lg:row-start-1",
          railFirst && "order-2 lg:order-none",
        )}
      >
        {children}
      </div>

      <aside
        className={cn(
          "flex min-w-0 flex-col gap-4",
          "lg:sticky lg:top-20 lg:self-start",
          railSide === "left" && "lg:col-start-1 lg:row-start-1",
          railFirst && "order-1 lg:order-none",
        )}
      >
        {rail}
      </aside>
    </div>
  );
}
