import { ListPageSkeleton } from "@/components/ui/Skeleton";

// Shown while any staff page loads, so a tap always gets an immediate response.
export default function AppLoading() {
  return <ListPageSkeleton />;
}
