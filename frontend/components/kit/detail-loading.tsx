import { cn } from "@/lib/utils";

const ghost = "animate-pulse rounded-control bg-surface-sunken motion-reduce:animate-none";

/**
 * Reserved layout for commerce detail routes while their server data streams.
 * It mirrors the gallery, information, and action-panel composition without
 * pretending to know which fields or actions the response will contain.
 */
export function DetailLoading({ label = "Loading details" }: { label?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className="flex flex-col gap-7 pb-6"
    >
      <span className={cn(ghost, "h-5 w-32")} />

      <div className="grid min-w-0 gap-7 md:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] xl:grid-cols-[minmax(0,1.08fr)_minmax(17rem,.78fr)_20rem] xl:gap-8">
        <span
          aria-hidden
          className={cn(ghost, "block aspect-square w-full rounded-card")}
        />

        <div aria-hidden className="flex min-w-0 flex-col gap-5 md:pt-2">
          <span className={cn(ghost, "h-3 w-24")} />
          <span className={cn(ghost, "h-7 w-32 rounded-pill")} />
          <div className="flex flex-col gap-2">
            <span className={cn(ghost, "h-10 w-4/5")} />
            <span className={cn(ghost, "h-10 w-3/5")} />
          </div>
          <div className="flex min-h-52 flex-col gap-4 rounded-panel bg-surface p-5 shadow-raised xl:hidden">
            <span className={cn(ghost, "h-5 w-2/5")} />
            <span className={cn(ghost, "h-px w-full rounded-none")} />
            <span className={cn(ghost, "h-12 w-full")} />
            <span className={cn(ghost, "h-12 w-full")} />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <span className={cn(ghost, "h-5 w-36")} />
            <span className={cn(ghost, "h-4 w-full")} />
            <span className={cn(ghost, "h-4 w-4/5")} />
          </div>
          <span className={cn(ghost, "h-32 w-full rounded-card")} />
        </div>

        <div
          aria-hidden
          className="hidden min-h-52 flex-col gap-4 rounded-panel bg-surface p-5 shadow-raised xl:flex"
        >
          <span className={cn(ghost, "h-5 w-2/5")} />
          <span className={cn(ghost, "h-px w-full rounded-none")} />
          <span className={cn(ghost, "h-12 w-full")} />
          <span className={cn(ghost, "h-12 w-full")} />
        </div>
      </div>
    </div>
  );
}
