"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { openTaskCount } from "@/lib/selectors";
import { colorHex } from "@/lib/colors";
import { cn, pluralize } from "@/lib/utils";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { CourseModal } from "@/components/course-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Badge, Dot } from "@/components/ui/badge";
import { BookIcon, ChevronRightIcon, PlusIcon, TrashIcon } from "@/components/icons";

export default function CoursesPage() {
  const { data, hydrated, addCourse, updateCourse, deleteCourse } = useStore();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      data.courses.map((course) => {
        const all = data.tasks.filter((task) => task.courseId === course.id);
        const open = openTaskCount(data.tasks, course.id);
        return {
          course,
          open,
          total: all.length,
          done: all.length - open,
          progress: all.length === 0 ? 0 : Math.round(((all.length - open) / all.length) * 100),
        };
      }),
    [data.courses, data.tasks],
  );

  if (!hydrated) return <PageSkeleton />;

  const editing = data.courses.find((c) => c.id === editingId) ?? null;
  const deleting = data.courses.find((c) => c.id === deletingId) ?? null;

  return (
    <PageContainer>
      <PageHeader
        title="Courses"
        subtitle="Group tasks by class. Canvas courses appear here automatically after a sync."
        actions={
          <Button variant="primary" size="md" onClick={() => setCreating(true)}>
            <PlusIcon size={15} />
            New course
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<BookIcon size={18} />}
          title="No courses yet"
          body="Add one by hand, or connect Canvas in Settings to bring your classes and assignments across."
          action={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
                Add manually
              </Button>
              <Link href="/settings">
                <Button variant="primary" size="sm">
                  Connect Canvas
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-2">
          {rows.map(({ course, open, total, done, progress }) => (
            <div
              key={course.id}
              className={cn(
                "group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3",
                "shadow-card transition-colors hover:border-border-strong",
                course.archived && "opacity-60",
              )}
            >
              <Dot color={colorHex(course.color)} className="h-2.5 w-2.5" />

              <Link href={`/courses/${course.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[14px] font-medium text-text">{course.name}</p>
                  {course.code ? <Badge>{course.code}</Badge> : null}
                  {course.canvasId !== null ? <Badge tone="accent">Canvas</Badge> : null}
                  {course.archived ? <Badge>Archived</Badge> : null}
                </div>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${progress}%`, backgroundColor: colorHex(course.color) }}
                    />
                  </div>
                  <span className="text-[12px] text-muted">
                    {total === 0
                      ? "No tasks"
                      : `${pluralize(open, "open task")}${done > 0 ? ` · ${done} done` : ""}`}
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="sm" onClick={() => setEditingId(course.id)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${course.name}`}
                  onClick={() => setDeletingId(course.id)}
                  className="text-subtle hover:text-danger"
                >
                  <TrashIcon size={15} />
                </Button>
              </div>

              <Link
                href={`/courses/${course.id}`}
                aria-label={`Open ${course.name}`}
                className="text-subtle transition-colors hover:text-text"
              >
                <ChevronRightIcon size={16} />
              </Link>
            </div>
          ))}
        </div>
      )}

      <CourseModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(values) => addCourse(values)}
      />

      <CourseModal
        key={editing?.id ?? "none"}
        open={Boolean(editing)}
        course={editing}
        onClose={() => setEditingId(null)}
        onSubmit={(values) => editing && updateCourse(editing.id, values)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleting && deleteCourse(deleting.id)}
        title={`Delete ${deleting?.name ?? "course"}?`}
        body="Its tasks stay, but they lose their course tag. If it came from Canvas, syncing again will recreate it."
      />
    </PageContainer>
  );
}
