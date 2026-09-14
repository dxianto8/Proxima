"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { useTaskEditor } from "@/components/task-editor";
import { courseMap, tasksByDay as bucketByDay } from "@/lib/selectors";
import {
  addDays,
  addMonths,
  dateKey,
  formatMonthYear,
  startOfWeek,
} from "@/lib/date";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { DayPanel } from "@/components/calendar/day-panel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/field";
import { PageSkeleton } from "@/components/ui/skeleton";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

type ViewMode = "month" | "week";

export default function CalendarPage() {
  const { data, hydrated, updateTask } = useStore();
  const { openTask } = useTaskEditor();
  const now = useNow();

  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [courseFilter, setCourseFilter] = useState("");
  const [hideDone, setHideDone] = useState(false);

  const courses = useMemo(() => courseMap(data.courses), [data.courses]);

  const visibleTasks = useMemo(
    () =>
      data.tasks.filter((task) => {
        if (courseFilter && task.courseId !== courseFilter) return false;
        if (hideDone && task.status === "done") return false;
        return true;
      }),
    [data.tasks, courseFilter, hideDone],
  );

  const byDay = useMemo(() => bucketByDay(visibleTasks), [visibleTasks]);
  const selectedTasks = byDay.get(dateKey(selected)) ?? [];

  if (!hydrated) return <PageSkeleton />;

  const step = (direction: number) => {
    setCursor((prev) =>
      mode === "month" ? addMonths(prev, direction) : addDays(prev, direction * 7),
    );
  };

  const goToday = () => {
    const today = new Date();
    setCursor(today);
    setSelected(today);
  };

  /** Dropping a chip on a day keeps its time of day and just moves the date. */
  function reschedule(taskId: string, date: Date) {
    const task = data.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const next = new Date(date);
    if (task.dueAt && task.hasDueTime) {
      const previous = new Date(task.dueAt);
      next.setHours(previous.getHours(), previous.getMinutes(), 0, 0);
    } else {
      next.setHours(0, 0, 0, 0);
    }
    updateTask(taskId, { dueAt: next.toISOString(), hasDueTime: task.hasDueTime });
    setSelected(date);
  }

  const weekStart = startOfWeek(cursor, data.preferences.weekStartsOn);
  const rangeLabel =
    mode === "month"
      ? formatMonthYear(cursor)
      : `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(
          weekStart,
          6,
        ).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <PageContainer wide>
      <PageHeader
        title="Calendar"
        subtitle="Drag a task onto another day to reschedule it."
        actions={
          <Segmented<ViewMode>
            ariaLabel="Calendar view"
            value={mode}
            onChange={setMode}
            options={[
              { value: "month", label: "Month" },
              { value: "week", label: "Week" },
            ]}
          />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => step(-1)}
            aria-label={mode === "month" ? "Previous month" : "Previous week"}
          >
            <ChevronLeftIcon size={16} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => step(1)}
            aria-label={mode === "month" ? "Next month" : "Next week"}
          >
            <ChevronRightIcon size={16} />
          </Button>
        </div>

        <h2 className="min-w-[180px] text-[15px] font-semibold tracking-[-0.01em] text-text">
          {rangeLabel}
        </h2>

        <Button variant="ghost" size="sm" onClick={goToday}>
          Today
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Select
            aria-label="Filter calendar by course"
            className="w-auto min-w-[150px]"
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
          >
            <option value="">All courses</option>
            {data.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code || course.name}
              </option>
            ))}
          </Select>
          <Button
            variant={hideDone ? "primary" : "secondary"}
            size="sm"
            onClick={() => setHideDone((prev) => !prev)}
            aria-pressed={hideDone}
          >
            Hide done
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          {mode === "month" ? (
            <MonthView
              cursor={cursor}
              now={now}
              tasksByDay={byDay}
              courses={courses}
              weekStartsOn={data.preferences.weekStartsOn}
              selected={selected}
              onSelect={setSelected}
              onOpenTask={openTask}
              onReschedule={reschedule}
            />
          ) : (
            <WeekView
              cursor={cursor}
              now={now}
              tasksByDay={byDay}
              courses={courses}
              weekStartsOn={data.preferences.weekStartsOn}
              selected={selected}
              onSelect={setSelected}
              onOpenTask={openTask}
              onReschedule={reschedule}
            />
          )}
        </div>

        <DayPanel
          date={selected}
          now={now}
          tasks={selectedTasks}
          courses={courses}
          className="w-full shrink-0 xl:w-[320px]"
        />
      </div>
    </PageContainer>
  );
}
