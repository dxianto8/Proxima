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

  // Which chips the meta line would carry. An undated task with no course has
  // none, and the row must not reserve space for a line that isn't there —
  // otherwise its title sits above centre.
  const metaCourse = showCourse && course ? course : null;
  const metaDue = showDue && task.dueAt ? task.dueAt : null;
  const inProgress = task.status === "doing" && !done;
  const points = task.canvas?.pointsPossible ?? null;
  const hasMeta = Boolean(
    metaCourse || metaDue || task.estimateMinutes || inProgress || points,
  );

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

        {hasMeta ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
            {metaCourse ? (
              <span className="inline-flex items-center gap-1.5">
                <Dot color={colorHex(metaCourse.color)} />
                <span className="truncate">{metaCourse.code || metaCourse.name}</span>
              </span>
            ) : null}

            {metaDue ? (
              <span
                className={cn(
                  "tabular inline-flex items-center gap-1",
                  late && "font-medium text-danger",
                )}
                title={late ? formatOverdue(metaDue, now) : undefined}
              >
                {late ? <ClockIcon size={12} /> : null}
                {formatDue(metaDue, task.hasDueTime, now)}
              </span>
            ) : null}

            {task.estimateMinutes ? (
              <span className="tabular">{formatEstimate(task.estimateMinutes)}</span>
            ) : null}

            {inProgress ? (
              <span className="font-medium text-accent">In progress</span>
            ) : null}

            {points ? <span className="tabular text-subtle">{points} pts</span> : null}
          </div>
        ) : null}
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
