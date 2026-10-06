import { Bone } from "@/components/kit/page-skeleton";

/** Admin screens load as a header and a bordered box of rows. */
export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6"
    >
      <span className="sr-only">Loading</span>
      <div className="flex flex-col gap-2">
        <Bone className="h-3 w-40" />
        <Bone className="h-8 w-64 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-[12px] border border-line">
        <div className="px-4 py-3">
          <Bone className="h-5 w-32" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-line px-4 py-3"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bone className="h-4 w-2/5" />
              <Bone className="h-3 w-3/5" />
            </div>
            <Bone className="h-6 w-24 rounded-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}
