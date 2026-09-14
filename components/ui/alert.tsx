import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertIcon, CheckIcon } from "@/components/icons";

type Tone = "error" | "success" | "info";

const TONES: Record<Tone, string> = {
  error: "border-danger/30 bg-danger-soft text-danger",
  success: "border-success/30 bg-success-soft text-success",
  info: "border-border bg-surface-2 text-muted",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed",
        TONES[tone],
        className,
      )}
    >
      {tone === "error" ? (
        <AlertIcon size={15} className="mt-[1px] shrink-0" />
      ) : tone === "success" ? (
        <CheckIcon size={15} className="mt-[1px] shrink-0" />
      ) : null}
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title ? "mt-0.5 opacity-90" : undefined)}>{children}</div> : null}
      </div>
    </div>
  );
}
