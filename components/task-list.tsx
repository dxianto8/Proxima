"use client";

import type { ReactNode } from "react";
import type { Course, Task } from "@/lib/types";
import { TaskRow } from "./task-row";
import { cn } from "@/lib/utils";

/** A titled card of task rows. Renders nothing when empty unless told otherwise. */
export function TaskGroup({
  title,
  subtitle,
  tone = "default",
  tasks,
  courses,
  now,
  action,
  showCourse = true,
  showDue = true,
  emptyState,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  tone?: "default" | "danger" | "accent";
  tasks: Task[];
  courses: Map<string, Course>;
  now: Date;
  action?: ReactNode;
  showCourse?: boolean;
  showDue?: boolean;
  emptyState?: ReactNode;
  className?: string;
}) {
  if (tasks.length === 0 && !emptyState) return null;

  return (
    <section className={cn("space-y-2", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 px-0.5">
          <div className="flex items-baseline gap-2">
            <h2
              className={cn(
                "text-[13px] font-semibold tracking-[-0.005em]",
                tone === "danger" ? "text-danger" : "text-text",
              )}
            >
              {title}
            </h2>
            {tasks.length > 0 ? (
              <span className="tabular text-[12px] text-subtle">{tasks.length}</span>
            ) : null}
            {subtitle ? <span className="text-[12px] text-subtle">{subtitle}</span> : null}
          </div>
          {action}
        </header>
      ) : null}

      {tasks.length === 0 ? (
        emptyState
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-xl border bg-surface shadow-card",
            tone === "danger" ? "border-danger/30" : "border-border",
          )}
        >
          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                course={task.courseId ? courses.get(task.courseId) : undefined}
                now={now}
                showCourse={showCourse}
                showDue={showDue}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
