"use client";

import type { Course, Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useTaskEditor } from "./task-editor";
import { formatDue, formatOverdue } from "@/lib/date";
import { isOverdue } from "@/lib/selectors";
import { accentVars, colorHex } from "@/lib/colors";
import { formatEstimate } from "@/lib/parse";
import { cn, truncate } from "@/lib/utils";
import { TaskCheckbox } from "./ui/checkbox";
import { Dot } from "./ui/badge";
import { ClockIcon, ExternalLinkIcon, FlagIcon } from "./icons";

export function TaskRow({
  task,
  course,
  now,
  showCourse = true,
  showDue = true,
}: {
  task: Task;
  course?: Course;
  now: Date;
  showCourse?: boolean;
  showDue?: boolean;
}) {
  const { toggleTask } = useStore();
  const { openTask } = useTaskEditor();
  const done = task.status === "done";
  const late = isOverdue(task, now);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openTask(task.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openTask(task.id);
        }
      }}
      style={accentVars(course?.color)}
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 px-3.5 py-2.5",
        "transition-colors duration-100 hover:bg-surface-2 focus-visible:bg-surface-2",
        "before:absolute before:inset-y-1 before:left-0 before:w-[2px] before:rounded-full",
        course ? "before:bg-[var(--accent)] before:opacity-70" : "before:bg-transparent",
      )}
    >
      <div className="pt-[3px]">
        <TaskCheckbox checked={done} onChange={() => toggleTask(task.id)} label={task.title} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 text-[14px] leading-[1.45] tracking-[-0.005em]",
              done ? "text-subtle line-through decoration-subtle/60" : "text-text",
              task.status === "doing" && "font-medium",
            )}
          >
            {task.title}
          </p>
          {task.priority === "high" && !done ? (
            <FlagIcon
              size={13}
              className="mt-[3px] shrink-0 text-danger"
              aria-label="High priority"
            />
          ) : null}
        </div>

        {task.notes && !done ? (
          <p className="mt-0.5 text-[12.5px] leading-snug text-subtle">
            {truncate(task.notes.split("\n")[0], 110)}
          </p>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          {showCourse && course ? (
            <span className="inline-flex items-center gap-1.5">
              <Dot color={colorHex(course.color)} />
              <span className="truncate">{course.code || course.name}</span>
            </span>
          ) : null}

          {showDue && task.dueAt ? (
            <span
              className={cn(
                "tabular inline-flex items-center gap-1",
                late && "font-medium text-danger",
              )}
              title={late ? formatOverdue(task.dueAt, now) : undefined}
            >
              {late ? <ClockIcon size={12} /> : null}
              {formatDue(task.dueAt, task.hasDueTime, now)}
            </span>
          ) : null}

          {task.estimateMinutes ? (
            <span className="tabular">{formatEstimate(task.estimateMinutes)}</span>
          ) : null}

          {task.status === "doing" && !done ? (
            <span className="font-medium text-accent">In progress</span>
          ) : null}

          {task.canvas?.pointsPossible ? (
            <span className="tabular text-subtle">{task.canvas.pointsPossible} pts</span>
          ) : null}
        </div>
      </div>

      {task.canvas ? (
        <a
          href={task.canvas.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          aria-label={`Open "${task.title}" in Canvas`}
          className={cn(
            "mt-0.5 rounded-md p-1.5 text-subtle opacity-0 transition-opacity",
            "hover:bg-surface-3 hover:text-text focus-visible:opacity-100 group-hover:opacity-100",
          )}
        >
          <ExternalLinkIcon size={14} />
        </a>
      ) : null}
    </div>
  );
}
