"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { courseMap, summarize, todayBuckets } from "@/lib/selectors";
import { formatDayLong } from "@/lib/date";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { QuickAdd } from "@/components/quick-add";
import { TaskGroup } from "@/components/task-list";
import { StatRow } from "@/components/stat-row";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertIcon, CheckIcon, SparkIcon } from "@/components/icons";

export default function TodayPage() {
  const { data, hydrated, updateTask } = useStore();
  const now = useNow();

  const buckets = useMemo(() => todayBuckets(data.tasks, now), [data.tasks, now]);
  const summary = useMemo(() => summarize(data.tasks, now), [data.tasks, now]);
  const courses = useMemo(() => courseMap(data.courses), [data.courses]);

  if (!hydrated) return <PageSkeleton />;

  const nothingLeft =
    buckets.overdue.length === 0 && buckets.today.length === 0 && buckets.anytime.length === 0;

  /** Pushes every overdue task to today so the list stops nagging about the past. */
  function rescheduleOverdue() {
    const target = new Date(now);
    for (const task of buckets.overdue) {
      const previous = task.dueAt ? new Date(task.dueAt) : target;
      const next = new Date(now);
      if (task.hasDueTime) next.setHours(previous.getHours(), previous.getMinutes(), 0, 0);
      else next.setHours(0, 0, 0, 0);
      updateTask(task.id, { dueAt: next.toISOString() });
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Today"
        subtitle={formatDayLong(now)}
      />

      <StatRow
        className="mb-5"
        stats={[
          { label: "Due today", value: summary.dueToday, tone: "accent" },
          {
            label: "Overdue",
            value: summary.overdue,
            tone: summary.overdue > 0 ? "danger" : "default",
          },
          { label: "Open", value: summary.open },
          {
            label: "Done today",
            value: buckets.completedToday.length,
            tone: buckets.completedToday.length > 0 ? "success" : "default",
          },
        ]}
      />

      <QuickAdd className="mb-6" />

      <div className="space-y-6">
        <TaskGroup
          title="Overdue"
          tone="danger"
          tasks={buckets.overdue}
          courses={courses}
          now={now}
          action={
            buckets.overdue.length > 1 ? (
              <Button variant="ghost" size="sm" onClick={rescheduleOverdue}>
                Move all to today
              </Button>
            ) : null
          }
        />

        <TaskGroup
          title="Due today"
          tasks={buckets.today}
          courses={courses}
          now={now}
          emptyState={
            buckets.overdue.length > 0 ? undefined : (
              <EmptyState
                icon={nothingLeft ? <SparkIcon size={18} /> : <CheckIcon size={18} />}
                title={nothingLeft ? "Nothing on the books today" : "Today is clear"}
                body={
                  nothingLeft
                    ? "Add something above, or pull your coursework in from Canvas."
                    : "Everything left has a later due date."
                }
                action={
                  nothingLeft && data.courses.length === 0 ? (
                    <Link href="/settings">
                      <Button variant="secondary" size="sm">
                        Connect Canvas
                      </Button>
                    </Link>
                  ) : null
                }
              />
            )
          }
        />

        <TaskGroup
          title="No due date"
          tasks={buckets.anytime.slice(0, 8)}
          courses={courses}
          now={now}
          action={
            buckets.anytime.length > 8 ? (
              <Link
                href="/tasks"
                className="text-[12px] font-medium text-muted hover:text-accent"
              >
                See all {buckets.anytime.length}
              </Link>
            ) : null
          }
        />

        <TaskGroup
          title="Completed today"
          tasks={buckets.completedToday}
          courses={courses}
          now={now}
        />
      </div>

      {summary.overdue > 3 ? (
        <p className="mt-6 flex items-center gap-2 rounded-lg bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
          <AlertIcon size={14} />
          {summary.overdue} tasks are past due. Reschedule what still matters and close the rest.
        </p>
      ) : null}
    </PageContainer>
  );
}
