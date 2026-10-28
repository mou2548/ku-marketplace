export default function InventoryLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading inventory" className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="h-8 w-40 animate-pulse rounded-control bg-surface-sunken" />
          <span className="h-4 w-24 animate-pulse rounded-control bg-surface-sunken" />
        </div>
        <span className="h-10 w-32 animate-pulse rounded-control bg-surface-sunken" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div
            key={index}
            aria-hidden
            className="overflow-hidden rounded-card bg-surface shadow-raised"
          >
            <span className="block aspect-[4/3] w-full animate-pulse bg-surface-sunken" />
            <div className="flex flex-col gap-2 p-3">
              <span className="h-4 w-4/5 animate-pulse rounded-control bg-surface-sunken" />
              <span className="h-3 w-2/5 animate-pulse rounded-control bg-surface-sunken" />
              <span className="h-10 w-full animate-pulse rounded-control bg-surface-sunken" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
