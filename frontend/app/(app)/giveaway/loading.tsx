export default function GiveawayLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading giveaways"
      className="flex flex-col gap-6"
    >
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="h-3 w-28 animate-pulse rounded-control bg-surface-sunken" />
          <span className="h-8 w-44 animate-pulse rounded-control bg-surface-sunken" />
          <span className="h-4 w-72 max-w-full animate-pulse rounded-control bg-surface-sunken" />
        </div>
        <span className="h-10 w-36 animate-pulse rounded-control bg-surface-sunken" />
      </div>
      <span className="h-10 w-56 animate-pulse rounded-pill bg-surface-sunken" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} aria-hidden className="break-inside-avoid">
            <span className="block aspect-[9/10] w-full animate-pulse rounded-card bg-surface-sunken" />
            <div className="flex flex-col gap-2 px-1 pt-3">
              <span className="h-4 w-4/5 animate-pulse rounded-control bg-surface-sunken" />
              <span className="h-3 w-full animate-pulse rounded-control bg-surface-sunken" />
              <span className="h-3 w-3/5 animate-pulse rounded-control bg-surface-sunken" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
