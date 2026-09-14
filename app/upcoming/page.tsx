"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { courseMap, sortTasks, upcomingGroups } from "@/lib/selectors";
import { daysBetween, formatDayShort, isSameDay } from "@/lib/date";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { QuickAdd } from "@/components/quick-add";
import { TaskGroup } from "@/components/task-list";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/segmented";
import { CalendarIcon } from "@/components/icons";

type Horizon = "7" | "14" | "30";

export default function UpcomingPage() {
  const { data, hydrated } = useStore();
  const now = useNow();
  const [horizon, setHorizon] = useState<Horizon>("14");

  const days = Number(horizon);
  const groups = useMemo(
    () => upcomingGroups(data.tasks, now, days),
    [data.tasks, now, days],
  );
  const courses = useMemo(() => courseMap(data.courses), [data.courses]);

  const later = useMemo(
    () =>
      sortTasks(
        data.tasks.filter(
          (task) =>
            task.status !== "done" &&
            task.dueAt &&
            daysBetween(now, new Date(task.dueAt)) > days,
        ),
      ),
    [data.tasks, now, days],
  );

  const undated = useMemo(
    () => sortTasks(data.tasks.filter((task) => task.status !== "done" && !task.dueAt)),
    [data.tasks],
  );

  if (!hydrated) return <PageSkeleton />;

  const scheduled = groups.reduce((total, group) => total + group.tasks.length, 0);

  return (
    <PageContainer>
      <PageHeader
        title="Upcoming"
        subtitle={
          scheduled > 0
            ? `${scheduled} scheduled over the next ${days} days`
            : `Nothing scheduled in the next ${days} days`
        }
        actions={
          <Segmented<Horizon>
            ariaLabel="Time horizon"
            value={horizon}
            onChange={setHorizon}
            options={[
              { value: "7", label: "7 days" },
              { value: "14", label: "14 days" },
              { value: "30", label: "30 days" },
            ]}
          />
        }
      />

      <QuickAdd className="mb-6" />

      <div className="space-y-6">
        {groups.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon size={18} />}
            title="The next few weeks are open"
            body="Tasks with a due date show up here, grouped by day."
          />
        ) : (
          groups.map((group) => (
            <TaskGroup
              key={group.key}
              title={dayHeading(group.date, now)}
              subtitle={
                isSameDay(group.date, now) || daysBetween(now, group.date) === 1
                  ? formatDayShort(group.date)
                  : undefined
              }
              tasks={group.tasks}
              courses={courses}
              now={now}
              showDue={false}
            />
          ))
        )}

        <TaskGroup
          title={`Later`}
          tasks={later}
          courses={courses}
          now={now}
        />

        <TaskGroup
          title="No due date"
          tasks={undated}
          courses={courses}
          now={now}
        />
      </div>
    </PageContainer>
  );
}

function dayHeading(date: Date, now: Date): string {
  const offset = daysBetween(now, date);
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
