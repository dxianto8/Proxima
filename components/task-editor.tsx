"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useStore, type NewTask } from "@/lib/store";
import type { Priority, Task, TaskStatus } from "@/lib/types";
import { fromDateInput, toDateInput } from "@/lib/date";
import { accentVars, colorHex } from "@/lib/colors";
import { formatEstimate } from "@/lib/parse";
import { cn } from "@/lib/utils";
import { Drawer, ConfirmDialog } from "./ui/overlay";
import { Button } from "./ui/button";
import { Field, Input, Select, Textarea } from "./ui/field";
import { Badge, Dot } from "./ui/badge";
import { ExternalLinkIcon, TrashIcon } from "./icons";

type EditorTarget =
  | { mode: "closed" }
  | { mode: "new"; defaults: Partial<NewTask> }
  | { mode: "edit"; taskId: string };

interface TaskEditorApi {
  openNew: (defaults?: Partial<NewTask>) => void;
  openTask: (taskId: string) => void;
  close: () => void;
}

const TaskEditorContext = createContext<TaskEditorApi | null>(null);

export function useTaskEditor(): TaskEditorApi {
  const ctx = useContext(TaskEditorContext);
  if (!ctx) throw new Error("useTaskEditor must be used inside <TaskEditorProvider>");
  return ctx;
}

export function TaskEditorProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<EditorTarget>({ mode: "closed" });

  const api = useMemo<TaskEditorApi>(
    () => ({
      openNew: (defaults = {}) => setTarget({ mode: "new", defaults }),
      openTask: (taskId) => setTarget({ mode: "edit", taskId }),
      close: () => setTarget({ mode: "closed" }),
    }),
    [],
  );

  return (
    <TaskEditorContext.Provider value={api}>
      {children}
      <TaskEditorDrawer target={target} onClose={api.close} />
    </TaskEditorContext.Provider>
  );
}

interface FormState {
  title: string;
  notes: string;
  status: TaskStatus;
  priority: Priority;
  date: string;
  time: string;
  courseId: string;
  estimate: string;
}

function blankForm(defaults: Partial<NewTask>): FormState {
  return {
    title: defaults.title ?? "",
    notes: defaults.notes ?? "",
    status: defaults.status ?? "todo",
    priority: defaults.priority ?? "normal",
    date: defaults.dueAt ? toDateInput(defaults.dueAt) : "",
    time:
      defaults.dueAt && defaults.hasDueTime
        ? new Date(defaults.dueAt).toTimeString().slice(0, 5)
        : "",
    courseId: defaults.courseId ?? "",
    estimate: defaults.estimateMinutes ? String(defaults.estimateMinutes) : "",
  };
}

function formFromTask(task: Task): FormState {
  return {
    title: task.title,
    notes: task.notes,
    status: task.status,
    priority: task.priority,
    date: task.dueAt ? toDateInput(task.dueAt) : "",
    time: task.dueAt && task.hasDueTime ? new Date(task.dueAt).toTimeString().slice(0, 5) : "",
    courseId: task.courseId ?? "",
    estimate: task.estimateMinutes ? String(task.estimateMinutes) : "",
  };
}

function TaskEditorDrawer({
  target,
  onClose,
}: {
  target: EditorTarget;
  onClose: () => void;
}) {
  const { data, addTask, updateTask, deleteTask } = useStore();
  const [form, setForm] = useState<FormState>(() => blankForm({}));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const task =
    target.mode === "edit" ? data.tasks.find((t) => t.id === target.taskId) : undefined;
  const open = target.mode !== "closed" && (target.mode === "new" || Boolean(task));

  // Reload the form whenever a different task (or a fresh blank) is opened.
  useEffect(() => {
    if (target.mode === "new") setForm(blankForm(target.defaults));
    else if (target.mode === "edit" && task) setForm(formFromTask(task));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.mode, target.mode === "edit" ? target.taskId : null]);

  const course = data.courses.find((c) => c.id === form.courseId);
  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  function save() {
    const title = form.title.trim();
    if (!title) return;

    const dueAt = form.date ? fromDateInput(form.date, form.time || undefined) : null;
    const estimateMinutes = form.estimate ? Math.max(0, Number(form.estimate)) || null : null;
    const patch = {
      title,
      notes: form.notes,
      status: form.status,
      priority: form.priority,
      dueAt,
      hasDueTime: Boolean(form.date && form.time),
      courseId: form.courseId || null,
      estimateMinutes,
    };

    if (target.mode === "edit" && task) {
      updateTask(task.id, {
        ...patch,
        completedAt:
          patch.status === "done" ? (task.completedAt ?? new Date().toISOString()) : null,
      });
    } else {
      addTask({
        ...patch,
        completedAt: patch.status === "done" ? new Date().toISOString() : null,
      });
    }
    onClose();
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={target.mode === "edit" ? "Task details" : "New task"}
        description={
          task?.source === "canvas" ? "Imported from Canvas" : "Everything is optional except the title"
        }
        footer={
          <>
            {target.mode === "edit" && task ? (
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="mr-auto text-danger hover:bg-danger-soft hover:text-danger"
              >
                <TrashIcon size={15} />
                Delete
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={!form.title.trim()}>
              {target.mode === "edit" ? "Save changes" : "Add task"}
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <Field label="Title" htmlFor="task-title">
            <Input
              id="task-title"
              data-autofocus
              value={form.title}
              placeholder="What needs doing?"
              onChange={(event) => set("title", event.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Due date" htmlFor="task-date">
              <Input
                id="task-date"
                type="date"
                value={form.date}
                onChange={(event) => set("date", event.target.value)}
              />
            </Field>
            <Field label="Time" htmlFor="task-time">
              <Input
                id="task-time"
                type="time"
                value={form.time}
                disabled={!form.date}
                onChange={(event) => set("time", event.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Course" htmlFor="task-course">
              <Select
                id="task-course"
                value={form.courseId}
                onChange={(event) => set("courseId", event.target.value)}
              >
                <option value="">No course</option>
                {data.courses
                  .filter((c) => !c.archived || c.id === form.courseId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `${c.code} — ${c.name}` : c.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Priority" htmlFor="task-priority">
              <Select
                id="task-priority"
                value={form.priority}
                onChange={(event) => set("priority", event.target.value as Priority)}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status" htmlFor="task-status">
              <Select
                id="task-status"
                value={form.status}
                onChange={(event) => set("status", event.target.value as TaskStatus)}
              >
                <option value="todo">To do</option>
                <option value="doing">In progress</option>
                <option value="done">Done</option>
              </Select>
            </Field>
            <Field
              label="Estimate"
              htmlFor="task-estimate"
              hint={form.estimate ? formatEstimate(Number(form.estimate) || 0) : undefined}
            >
              <Input
                id="task-estimate"
                type="number"
                min={0}
                step={5}
                inputMode="numeric"
                placeholder="minutes"
                value={form.estimate}
                onChange={(event) => set("estimate", event.target.value)}
              />
            </Field>
          </div>

          <Field label="Notes" htmlFor="task-notes">
            <Textarea
              id="task-notes"
              rows={5}
              value={form.notes}
              placeholder="Context, links, a checklist…"
              onChange={(event) => set("notes", event.target.value)}
            />
          </Field>

          {course ? (
            <div
              style={accentVars(course.color)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px]",
                "border-[var(--accent-line)] bg-[var(--accent-soft)]",
              )}
            >
              <Dot color={colorHex(course.color)} />
              <span className="font-medium text-text">{course.name}</span>
            </div>
          ) : null}

          {task?.canvas ? <CanvasFacts task={task} /> : null}

          {/* Lets Enter submit from any single-line input. */}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (task) deleteTask(task.id);
          onClose();
        }}
        title="Delete this task?"
        body={
          <>
            <strong className="font-medium text-text">{task?.title}</strong> will be removed.
            {task?.source === "canvas"
              ? " It will come back the next time you sync this course from Canvas."
              : " This cannot be undone."}
          </>
        }
      />
    </>
  );
}

function CanvasFacts({ task }: { task: Task }) {
  const meta = task.canvas!;
  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-2/60 px-3 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="accent" className="capitalize">
          {meta.kind}
        </Badge>
        {meta.pointsPossible !== null ? (
          <Badge>{meta.pointsPossible} pts</Badge>
        ) : null}
        {meta.submitted ? <Badge tone="success">Submitted</Badge> : null}
      </div>
      <a
        href={meta.htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
      >
        Open in Canvas
        <ExternalLinkIcon size={13} />
      </a>
      <p className="text-[11px] text-subtle">
        Last synced {new Date(meta.syncedAt).toLocaleString()}
      </p>
    </div>
  );
}
