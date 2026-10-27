import { Bone } from "@/components/kit/page-skeleton";

/** Same shape as the account page: header and settings rail, shortcut cards. */
export default function AccountLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6"
    >
      <span className="sr-only">Loading your account</span>
      <div className="flex flex-col gap-5">
        <Bone className="h-60 w-full rounded-panel" />
        <Bone className="hidden h-80 w-full rounded-card lg:block" />
      </div>
      <div className="flex flex-col gap-5">
        <Bone className="h-36 w-full rounded-card" />
        <Bone className="h-36 w-full rounded-card" />
        <Bone className="h-20 w-full rounded-card" />
      </div>
    </div>
  );
}
