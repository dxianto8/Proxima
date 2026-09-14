"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { courseMap, sortTasks, summarize } from "@/lib/selectors";
import { colorHex } from "@/lib/colors";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { QuickAdd } from "@/components/quick-add";
import { TaskGroup } from "@/components/task-list";
import { StatRow } from "@/components/stat-row";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookIcon, ChevronLeftIcon } from "@/components/icons";

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const { data, hydrated } = useStore();
  const now = useNow();

  const course = data.courses.find((c) => c.id === params.courseId);
  const courses = useMemo(() => courseMap(data.courses), [data.courses]);

  const tasks = useMemo(
    () => data.tasks.filter((task) => task.courseId === params.courseId),
    [data.tasks, params.courseId],
  );
  const summary = useMemo(() => summarize(tasks, now), [tasks, now]);
  const open = useMemo(() => sortTasks(tasks.filter((t) => t.status !== "done")), [tasks]);
  const done = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "done")
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [tasks],
  );

  if (!hydrated) return <PageSkeleton />;

  if (!course) {
    return (
      <PageContainer>
        <EmptyState
          icon={<BookIcon size={18} />}
          title="That course no longer exists"
          body="It may have been deleted from the Courses page."
          action={
            <Link href="/courses">
              <Button variant="secondary" size="sm">
                Back to courses
              </Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link
        href="/courses"
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-muted transition-colors hover:text-text"
      >
        <ChevronLeftIcon size={14} />
        Courses
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <Dot color={colorHex(course.color)} className="h-2.5 w-2.5" />
            {course.name}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            {course.code ? <Badge>{course.code}</Badge> : null}
            {course.canvasId !== null ? <Badge tone="accent">Synced from Canvas</Badge> : null}
            {course.archived ? <Badge>Archived</Badge> : null}
          </span>
        }
      />

      <StatRow
        className="mb-5"
        stats={[
          { label: "Open", value: summary.open },
          {
            label: "Overdue",
            value: summary.overdue,
            tone: summary.overdue > 0 ? "danger" : "default",
          },
          { label: "Due this week", value: summary.dueThisWeek, tone: "accent" },
          {
            label: "Completed",
            value: `${summary.completionRate}%`,
            tone: "success",
            hint: `${summary.completed} of ${summary.open + summary.completed}`,
          },
        ]}
      />

      <QuickAdd
        className="mb-6"
        defaultCourseId={course.id}
        placeholder={`Add a task to ${course.code || course.name}…`}
      />

      <div className="space-y-6">
        <TaskGroup
          title="Open"
          tasks={open}
          courses={courses}
          now={now}
          showCourse={false}
          emptyState={
            <EmptyState
              icon={<BookIcon size={18} />}
              title="Nothing open for this course"
              body="Add a task above, or sync the course from Canvas in Settings."
            />
          }
        />
        <TaskGroup
          title="Completed"
          tasks={done}
          courses={courses}
          now={now}
          showCourse={false}
        />
      </div>
    </PageContainer>
  );
}
