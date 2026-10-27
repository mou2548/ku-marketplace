import { cn } from "@/lib/utils";

/**
 * Placeholder shapes shown by a route's `loading.tsx` while its server render
 * runs. Navigation swaps to this at once, so a tap always answers immediately
 * instead of leaving the old page frozen until the data arrives.
 * The pulse respects reduced motion.
 */
export function Bone({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block rounded-control bg-surface-sunken motion-safe:animate-pulse",
        className,
      )}
    />
  );
}

function Wrapper({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("flex min-w-0 flex-col gap-6 motion-safe:animate-[ku-fade-in_200ms_ease-out]", className)}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** A heading and a list of rows: history, offers, chat, notifications. */
export function ListSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <Wrapper label={label}>
      <div className="flex flex-col gap-2">
        <Bone className="h-3 w-24" />
        <Bone className="h-8 w-52" />
      </div>
      <Bone className="h-10 w-64 max-w-full rounded-pill" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-flat"
          >
            <Bone className="size-14 shrink-0 rounded-[10px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bone className="h-4 w-3/5" />
              <Bone className="h-3 w-2/5" />
            </div>
            <Bone className="h-6 w-20 shrink-0 rounded-pill" />
          </div>
        ))}
      </div>
    </Wrapper>
  );
}

/** A heading and a grid of cards: the feed and other browse screens. */
export function GridSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <Wrapper label={label}>
      <div className="flex flex-wrap items-center gap-3">
        <Bone className="h-11 w-full max-w-md rounded-pill" />
        <Bone className="h-11 w-28 rounded-pill" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-9 w-20 rounded-pill" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="aspect-square w-full rounded-card" />
            <Bone className="h-4 w-4/5" />
            <Bone className="h-3 w-2/5" />
          </div>
        ))}
      </div>
    </Wrapper>
  );
}
