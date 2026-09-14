"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "danger" | "warn" | "success" | "custom";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-transparent",
  accent: "bg-accent-soft text-accent border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  success: "bg-success-soft text-success border-transparent",
  custom: "border-transparent",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  style,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
        "text-[11px] font-medium leading-4 whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ backgroundColor: color }}
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
    />
  );
}
