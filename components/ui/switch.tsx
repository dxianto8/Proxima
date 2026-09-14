"use client";

import { cn } from "@/lib/utils";

/**
 * The knob is positioned with an explicit `left`. Without one, an absolutely
 * positioned child takes its static position from the button's centred inline
 * context, which put the knob at the track's midpoint and sent it outside the
 * track entirely when toggled on.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200",
        "disabled:pointer-events-none disabled:opacity-50",
        // A white knob on the lighter surface tint was nearly invisible when off.
        checked ? "bg-accent" : "bg-border-strong",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white",
          "shadow-card ring-1 ring-black/[0.06] transition-transform duration-200",
          // 38 − 16 − 3 − 3 = 16: the knob lands 3px from the far edge.
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}
