import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border",
        "bg-surface/40 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-subtle">
        {icon}
      </div>
      <p className="text-sm font-medium text-text">{title}</p>
      {body ? (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{body}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
