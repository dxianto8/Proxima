"use client";

import { cn } from "@/lib/utils";
import { CheckIcon } from "@/components/icons";

/**
 * The circular task toggle. A real button so it is keyboard reachable and
 * announces its state; the ring colour follows the task's course accent.
 */
export function TaskCheckbox({
  checked,
  onChange,
  label,
  size = "md",
  className,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const dimension = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? `Mark "${label}" as not done` : `Mark "${label}" as done`}
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border transition-all duration-150",
        "hover:scale-110 active:scale-95",
        dimension,
        checked
          ? "border-transparent bg-[var(--accent,var(--color-accent))] text-white"
          : "border-border-strong bg-surface hover:border-[var(--accent,var(--color-accent))]",
        className,
      )}
    >
      <CheckIcon
        size={size === "sm" ? 10 : 12}
        strokeWidth={3}
        className={cn("transition-opacity duration-150", checked ? "opacity-100" : "opacity-0")}
      />
    </button>
  );
}
