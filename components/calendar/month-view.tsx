"use client";

import { useState } from "react";
import type { Course, Task } from "@/lib/types";
import { dateKey, isSameDay, monthGrid, weekdayLabels } from "@/lib/date";
import { cn } from "@/lib/utils";
import { TaskChip } from "./chip";

const MAX_CHIPS = 3;

export function MonthView({
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
  const [expanded, setExpanded] = useState<string | null>(null);

  const month = cursor.getMonth();
  const weeks = toWeeks(monthGrid(cursor.getFullYear(), month, weekStartsOn), month);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="grid grid-cols-7 border-b border-border bg-surface-2/50">
        {weekdayLabels(weekStartsOn).map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle"
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label[0]}</span>
          </div>
        ))}
      </div>

      {weeks.map((week, weekIndex) => (
        <div key={dateKey(week[0])} className="grid grid-cols-7">
          {week.map((day, dayIndex) => {
            const key = dateKey(day);
            const dayTasks = tasksByDay.get(key) ?? [];
            const outside = day.getMonth() !== month;
            const today = isSameDay(day, now);
            const isSelected = isSameDay(day, selected);
            const open = dayTasks.filter((t) => t.status !== "done").length;
            const showAll = expanded === key;
            const chips = showAll ? dayTasks : dayTasks.slice(0, MAX_CHIPS);

            return (
              <div
                key={key}
                role="gridcell"
                tabIndex={0}
                aria-label={`${day.toDateString()}, ${open} open tasks`}
                aria-selected={isSelected}
                onClick={() => onSelect(day)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(day);
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
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
                  "group/day relative flex min-h-[106px] cursor-pointer flex-col gap-1 p-1.5",
                  "border-border transition-colors duration-100",
                  dayIndex < 6 && "border-r",
                  weekIndex < weeks.length - 1 && "border-b",
                  outside ? "bg-surface-2/35" : "bg-surface",
                  isSelected && "bg-accent-soft/30",
                  dragOver === key && "bg-accent-soft ring-1 ring-inset ring-accent",
                )}
              >
                <div className="flex items-center justify-between px-0.5">
                  <span
                    className={cn(
                      "tabular grid h-[22px] min-w-[22px] place-items-center rounded-full px-1",
                      "text-[12px] transition-colors duration-100",
                      // Three steps, darkest first: today, the selected day,
                      // then whichever day the cursor is over.
                      today
                        ? "bg-accent font-semibold text-accent-text"
                        : isSelected
                          ? "bg-day-selected font-semibold text-accent"
                          : cn(
                              "group-hover/day:bg-day-hover",
                              outside ? "text-subtle/70" : "font-medium text-muted",
                            ),
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {open > 0 && !today ? (
                    <span className="tabular text-[10px] font-medium text-subtle">{open}</span>
                  ) : null}
                </div>

                <div className="flex flex-col gap-[3px]">
                  {chips.map((task) => (
                    <TaskChip
                      key={task.id}
                      task={task}
                      course={task.courseId ? courses.get(task.courseId) : undefined}
                      now={now}
                      onOpen={() => onOpenTask(task.id)}
                      onDragStart={setDragging}
                    />
                  ))}
                  {dayTasks.length > MAX_CHIPS ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpanded(showAll ? null : key);
                        onSelect(day);
                      }}
                      className="px-1.5 text-left text-[11px] font-medium text-subtle hover:text-accent"
                    >
                      {showAll ? "Show less" : `+${dayTasks.length - MAX_CHIPS} more`}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * Splits the 42-day grid into weeks and drops any trailing week that belongs
 * entirely to the next month, so the grid doesn't end on a blank row.
 */
function toWeeks(days: Date[], month: number): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  while (weeks.length > 4 && weeks[weeks.length - 1].every((d) => d.getMonth() !== month)) {
    weeks.pop();
  }
  return weeks;
}
