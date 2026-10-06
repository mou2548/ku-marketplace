import { ListSkeleton } from "@/components/kit/page-skeleton";

/** Fallback for every app route without its own loading screen. */
export default function AppLoading() {
  return <ListSkeleton />;
}
