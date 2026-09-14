"use client";

import type { Course, Task } from "@/lib/types";
import { accentVars, colorHex } from "@/lib/colors";
import { formatTime } from "@/lib/date";
import { isOverdue } from "@/lib/selectors";
import { cn } from "@/lib/utils";

/** 11:59pm is Canvas's "end of day" — showing it every row is pure noise. */
function meaningfulTime(task: Task): string | null {
  if (!task.dueAt || !task.hasDueTime) return null;
  const due = new Date(task.dueAt);
  if (due.getHours() === 23 && due.getMinutes() >= 59) return null;
  return formatTime(due);
}

/** One task as it appears inside a calendar cell. Draggable onto another day. */
export function TaskChip({
  task,
  course,
  now,
  onOpen,
  onDragStart,
  layout = "inline",
  className,
}: {
  task: Task;
  course?: Course;
  now: Date;
  onOpen: () => void;
  onDragStart: (taskId: string) => void;
  /** "stacked" puts the time on its own line and lets the title wrap. */
  layout?: "inline" | "stacked";
  className?: string;
}) {
  const done = task.status === "done";
  const late = isOverdue(task, now);
  const time = meaningfulTime(task);

  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart(task.id);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      title={time ? `${time} — ${task.title}` : task.title}
      style={accentVars(course?.color)}
      className={cn(
        "group/chip flex w-full gap-1.5 rounded-[5px] py-[3px] pl-1 pr-1.5 text-left",
        "text-[11.5px] leading-[15px] transition-[filter,background-color] duration-100",
        "cursor-grab active:cursor-grabbing",
        done
          ? "text-subtle line-through hover:bg-surface-2"
          : "bg-[var(--accent-soft)] text-text hover:brightness-[0.97] dark:hover:brightness-125",
        late && !done && "bg-danger-soft text-danger",
        className,
      )}
    >
      <span
        aria-hidden
        style={{ backgroundColor: late && !done ? "currentColor" : colorHex(course?.color) }}
        className={cn(
          "w-[2.5px] shrink-0 rounded-full",
          layout === "stacked" ? "self-stretch" : "my-[2px]",
          done && "opacity-40",
        )}
      />
      {layout === "stacked" ? (
        <span className="min-w-0 flex-1">
          {time ? (
            <span className="tabular block font-medium opacity-70">{time}</span>
          ) : null}
          <span className="line-clamp-2 break-words">{task.title}</span>
        </span>
      ) : (
        <>
          {time ? (
            <span className="tabular shrink-0 font-medium opacity-70">{time}</span>
          ) : null}
          <span className="truncate">{task.title}</span>
        </>
      )}
    </button>
  );
}
