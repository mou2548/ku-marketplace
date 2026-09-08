import { cn } from "@/lib/utils";

/**
 * Shared mobile action surface for forms and consequential decisions. It
 * floats above the bottom navigation, then becomes a plain row on desktop.
 */
export function ActionBar({
  children,
  layout = "stack",
  className,
}: {
  children: React.ReactNode;
  layout?: "stack" | "summary";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky action-bar-bottom z-[20] gap-2 rounded-card bg-surface/95 p-2 shadow-floating backdrop-blur-sm",
        "lg:static lg:mx-0 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none",
        layout === "stack"
          ? "flex flex-col lg:flex-row lg:items-center lg:justify-end"
          : "flex items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}
