import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-2", className)}
    />
  );
}

/** Placeholder shown while the browser store is still loading. */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-2 h-4 w-56" />
      <Skeleton className="mt-6 h-12 w-full rounded-xl" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-[132px] w-full rounded-xl" />
      </div>
    </div>
  );
}
