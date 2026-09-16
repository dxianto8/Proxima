"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { ChevronRightIcon } from "@/components/icons";

/**
 * The primary call to action. Its label softens once the store has hydrated and
 * there is something to come back to.
 */
export function OpenAppButton({ size = "lg" }: { size?: "lg" | "sm" }) {
  const { data, hydrated } = useStore();
  const open = hydrated ? data.tasks.filter((task) => task.status !== "done").length : 0;

  return (
    <Link
      href="/today"
      className={
        size === "lg"
          ? "group inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-[15px] font-semibold text-accent-text shadow-raised transition-all duration-200 hover:bg-accent-hover hover:shadow-overlay active:scale-[0.98]"
          : "group inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[13.5px] font-medium text-accent-text transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]"
      }
    >
      {open > 0 ? "Back to your tasks" : "Open Proxima"}
      <ChevronRightIcon
        size={size === "lg" ? 17 : 15}
        className="transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  );
}
