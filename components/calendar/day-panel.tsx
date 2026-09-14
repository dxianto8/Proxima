"use client";

import type { Course, Task } from "@/lib/types";
import { formatDayLong, isSameDay } from "@/lib/date";
import { cn, pluralize } from "@/lib/utils";
import { TaskRow } from "@/components/task-row";
import { QuickAdd } from "@/components/quick-add";

/** The detail rail beside the grid: what is due on the selected day. */
export function DayPanel({
  date,
  now,
  tasks,
  courses,
  className,
}: {
  date: Date;
  now: Date;
  tasks: Task[];
  courses: Map<string, Course>;
  className?: string;
}) {
  const open = tasks.filter((task) => task.status !== "done");
  const today = isSameDay(date, now);
  const dueAt = new Date(date);
  dueAt.setHours(0, 0, 0, 0);

  return (
    <aside className={cn("flex flex-col gap-3", className)}>
      <div>
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-text">
          {today ? "Today" : formatDayLong(date)}
        </h2>
        <p className="text-[12.5px] text-muted">
          {tasks.length === 0
            ? "Nothing scheduled"
            : `${pluralize(open.length, "task")} open${
                tasks.length > open.length ? ` · ${tasks.length - open.length} done` : ""
              }`}
        </p>
      </div>

      <QuickAdd
        placeholder="Add to this day…"
        defaultDueAt={dueAt.toISOString()}
        className="[&_input]:h-9"
      />

      {tasks.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                course={task.courseId ? courses.get(task.courseId) : undefined}
                now={now}
                showDue={task.hasDueTime}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-[12.5px] text-subtle">
          Drag a task here from another day, or add one above.
        </p>
      )}
    </aside>
  );
}
