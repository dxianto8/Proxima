"use client";

import { COURSE_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { CheckIcon } from "./icons";

export function ColorPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (colorId: string) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Course colour" className={cn("flex flex-wrap gap-1.5", className)}>
      {COURSE_COLORS.map((color) => {
        const active = color.id === value;
        return (
          <button
            key={color.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={color.label}
            title={color.label}
            onClick={() => onChange(color.id)}
            style={{ backgroundColor: color.hex }}
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full text-white transition-transform duration-100",
              "hover:scale-110",
              active && "ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface)]",
            )}
          >
            <CheckIcon
              size={12}
              strokeWidth={3}
              className={cn("transition-opacity", active ? "opacity-100" : "opacity-0")}
            />
          </button>
        );
      })}
    </div>
  );
}
