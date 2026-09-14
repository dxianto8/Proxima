"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-text hover:bg-accent-hover shadow-card disabled:hover:bg-accent",
  secondary:
    "bg-surface text-text border border-border hover:bg-surface-2 hover:border-border-strong shadow-card",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  subtle: "bg-surface-2 text-text hover:bg-surface-3",
  danger: "bg-danger-soft text-danger hover:brightness-95 dark:hover:brightness-125",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[13px] gap-1.5 rounded-lg",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  icon: "h-8 w-8 rounded-lg justify-center",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center font-medium whitespace-nowrap select-none",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
        "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
