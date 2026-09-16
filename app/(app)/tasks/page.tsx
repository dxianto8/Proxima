"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { courseMap, filterTasks, sortTasks, type TaskFilter } from "@/lib/selectors";
import type { Priority, Task } from "@/lib/types";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { QuickAdd } from "@/components/quick-add";
import { TaskGroup } from "@/components/task-list";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { InboxIcon, SearchIcon, XIcon } from "@/components/icons";
import { cn, pluralize } from "@/lib/utils";

type StatusFilter = "open" | "done" | "all";
type SortKey = "due" | "priority" | "created" | "title";

export default function TasksPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TasksView />
    </Suspense>
  );
}

function TasksView() {
  const { data, hydrated, clearCompleted } = useStore();
  const now = useNow();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [courseId, setCourseId] = useState<string>("");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [confirmClear, setConfirmClear] = useState(false);

  // The top-bar search pushes `?q=`; adopt it whenever it changes.
  const urlQuery = searchParams.get("q") ?? "";
  useEffect(() => {
    if (urlQuery) setQuery(urlQuery);
  }, [urlQuery]);

  const courses = useMemo(() => courseMap(data.courses), [data.courses]);

  const visible = useMemo(() => {
    const filter: TaskFilter = {
      query,
      status,
      priority,
      courseId: courseId || undefined,
    };
    return applySort(filterTasks(data.tasks, filter), sortKey);
  }, [data.tasks, query, status, priority, courseId, sortKey]);

  if (!hydrated) return <PageSkeleton />;

  const doneCount = data.tasks.filter((t) => t.status === "done").length;
  const filtersActive = Boolean(query || courseId || priority !== "all" || status !== "open");

  return (
    <PageContainer wide>
      <PageHeader
        title="All tasks"
        subtitle={
          filtersActive
            ? `${pluralize(visible.length, "match", "matches")} of ${data.tasks.length}`
            : `${pluralize(data.tasks.length, "task")} in total`
        }
        actions={
          doneCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
              Clear {doneCount} completed
            </Button>
          ) : null
        }
      />

      <QuickAdd className="mb-4" defaultCourseId={courseId || null} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by keyword"
            aria-label="Filter tasks by keyword"
            className={cn(
              "h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-8 text-[13.5px]",
              "outline-none transition-colors placeholder:text-subtle",
              "hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent/20",
            )}
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-subtle hover:text-text"
            >
              <XIcon size={13} />
            </button>
          ) : null}
        </div>

        <Segmented<StatusFilter>
          ariaLabel="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "open", label: "Open" },
            { value: "done", label: "Done" },
            { value: "all", label: "All" },
          ]}
        />

        <Select
          aria-label="Filter by course"
          className="w-auto min-w-[140px]"
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
        >
          <option value="">All courses</option>
          {data.courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code || course.name}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filter by priority"
          className="w-auto min-w-[120px]"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority | "all")}
        >
          <option value="all">Any priority</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </Select>

        <Select
          aria-label="Sort tasks"
          className="w-auto min-w-[130px]"
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
        >
          <option value="due">Sort: due date</option>
          <option value="priority">Sort: priority</option>
          <option value="created">Sort: newest</option>
          <option value="title">Sort: A–Z</option>
        </Select>
      </div>

      <TaskGroup
        tasks={visible}
        courses={courses}
        now={now}
        emptyState={
          <EmptyState
            icon={filtersActive ? <SearchIcon size={18} /> : <InboxIcon size={18} />}
            title={filtersActive ? "No tasks match those filters" : "No tasks yet"}
            body={
              filtersActive
                ? "Try widening the status or clearing the keyword."
                : "Add one above, or import your coursework from Canvas in Settings."
            }
            action={
              filtersActive ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setCourseId("");
                    setPriority("all");
                    setStatus("open");
                  }}
                >
                  Reset filters
                </Button>
              ) : null
            }
          />
        }
      />

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearCompleted}
        title="Clear completed tasks?"
        confirmLabel={`Clear ${doneCount}`}
        body={`${pluralize(doneCount, "completed task")} will be deleted. Canvas items will reappear the next time you sync.`}
      />
    </PageContainer>
  );
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

function applySort(tasks: Task[], key: SortKey): Task[] {
  switch (key) {
    case "priority":
      return [...tasks].sort(
        (a, b) =>
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9"),
      );
    case "created":
      return [...tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "title":
      return [...tasks].sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sortTasks(tasks);
  }
}
