"use client";

import { useState } from "react";
import type { Course, Task } from "@/lib/types";
import { addDays, dateKey, isSameDay, startOfWeek } from "@/lib/date";
import { cn } from "@/lib/utils";
import { TaskChip } from "./chip";

/**
 * Seven stacked columns. No hour grid on purpose — coursework clusters at
 * 11:59pm, so an hour axis would be almost entirely empty.
 */
export function WeekView({
  cursor,
  now,
  tasksByDay,
  courses,
  weekStartsOn,
  selected,
  onSelect,
  onOpenTask,
  onReschedule,
}: {
  cursor: Date;
  now: Date;
  tasksByDay: Map<string, Task[]>;
  courses: Map<string, Course>;
  weekStartsOn: 0 | 1;
  selected: Date;
  onSelect: (date: Date) => void;
  onOpenTask: (taskId: string) => void;
  onReschedule: (taskId: string, date: Date) => void;
}) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const start = startOfWeek(cursor, weekStartsOn);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="grid grid-cols-1 sm:grid-cols-7">
        {days.map((day, index) => {
          const key = dateKey(day);
          const dayTasks = tasksByDay.get(key) ?? [];
          const today = isSameDay(day, now);
          const isSelected = isSameDay(day, selected);

          return (
            <div
              key={key}
              onClick={() => onSelect(day)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(key);
              }}
              onDragLeave={() => setDragOver((prev) => (prev === key ? null : prev))}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData("text/plain") || dragging;
                setDragOver(null);
                setDragging(null);
                if (taskId) onReschedule(taskId, day);
              }}
              className={cn(
                "group/day flex min-h-[120px] cursor-pointer flex-col gap-1.5 border-b border-border p-2",
                "sm:min-h-[420px] sm:border-b-0 sm:border-r",
                index === 6 && "border-b-0 sm:border-r-0",
                isSelected && "bg-accent-soft/30",
                dragOver === key && "bg-accent-soft ring-1 ring-inset ring-accent",
              )}
            >
              <div className="flex items-baseline gap-1.5 px-0.5 sm:flex-col sm:gap-0">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span
                  className={cn(
                    "tabular grid h-[24px] min-w-[24px] place-items-center rounded-full",
                    "text-[13px] transition-colors duration-100",
                    today
                      ? "bg-accent font-semibold text-accent-text"
                      : isSelected
                        ? "bg-day-selected font-semibold text-accent"
                        : "font-medium text-text group-hover/day:bg-day-hover",
                  )}
                >
                  {day.getDate()}
                </span>
              </div>

              <div className="flex flex-col gap-[3px]">
                {dayTasks.map((task) => (
                  <TaskChip
                    key={task.id}
                    task={task}
                    course={task.courseId ? courses.get(task.courseId) : undefined}
                    now={now}
                    onOpen={() => onOpenTask(task.id)}
                    onDragStart={setDragging}
                    layout="stacked"
                  />
                ))}
                {dayTasks.length === 0 ? (
                  <span className="px-1 text-[11.5px] text-subtle/70">—</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
