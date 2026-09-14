"use client";

import { cn } from "@/lib/utils";

export interface Stat {
  label: string;
  value: string | number;
  tone?: "default" | "danger" | "accent" | "success";
  hint?: string;
}

const TONES = {
  default: "text-text",
  danger: "text-danger",
  accent: "text-accent",
  success: "text-success",
} as const;

/** The compact metric strip above a list. Reads as one card, not four boxes. */
export function StatRow({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border",
        "bg-border shadow-card sm:grid-cols-4",
        className,
      )}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="bg-surface px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-subtle">
            {stat.label}
          </p>
          <p
            className={cn(
              "tabular mt-0.5 text-[20px] font-semibold leading-tight tracking-[-0.02em]",
              TONES[stat.tone ?? "default"],
            )}
          >
            {stat.value}
          </p>
          {stat.hint ? <p className="text-[11.5px] text-subtle">{stat.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
