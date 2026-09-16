"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { pluralize } from "@/lib/utils";
import { ChevronRightIcon } from "@/components/icons";

/**
 * The primary call to action. Once the store has hydrated it also reports what
 * is waiting, so a returning visitor sees their own state rather than a pitch.
 */
export function OpenAppButton({ size = "lg" }: { size?: "lg" | "sm" }) {
  const { data, hydrated } = useStore();
  const open = hydrated ? data.tasks.filter((task) => task.status !== "done").length : 0;

  return (
    <div className="flex flex-col items-center gap-2 sm:items-start">
      <Link
        href="/today"
        className={
          size === "lg"
            ? "group inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-[15px] font-semibold text-accent-text shadow-raised transition-all duration-150 hover:bg-accent-hover active:scale-[0.98]"
            : "group inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[13.5px] font-medium text-accent-text transition-colors duration-150 hover:bg-accent-hover"
        }
      >
        {open > 0 ? "Back to your tasks" : "Open Proxima"}
        <ChevronRightIcon
          size={size === "lg" ? 17 : 15}
          className="transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </Link>
      {open > 0 ? (
        <p className="text-[12.5px] text-subtle">
          {pluralize(open, "task")} still open
        </p>
      ) : null}
    </div>
  );
}
