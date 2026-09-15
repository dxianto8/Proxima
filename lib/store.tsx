"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AppData,
  CanvasConnection,
  CanvasItem,
  Course,
  Group,
  Preferences,
  Task,
} from "./types";
import { colorForIndex } from "./colors";
import {
  coursesInGroup,
  moveCourse as moveCourseIn,
  reconcile,
  reindex,
  removeGroup,
  reorderGroups,
} from "./groups";
import { htmlToText, uid } from "./utils";

const STORAGE_KEY = "proxima.data.v1";
const SCHEMA_VERSION = 1;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  weekStartsOn: 0,
  showCompleted: false,
  customTheme: null,
  backgroundDim: 72,
  extractedColors: [],
};

const DEFAULT_CANVAS: CanvasConnection = {
  baseUrl: "",
  token: "",
  selectedCourseIds: [],
  includeEvents: false,
  lastSyncAt: null,
};

/** The section every course lands in until the user makes others. */
export const DEFAULT_GROUP_NAME = "Courses";

function defaultGroup(): Group {
  return {
    id: uid("group"),
    name: DEFAULT_GROUP_NAME,
    order: 0,
    createdAt: new Date().toISOString(),
  };
}

function emptyData(): AppData {
  return {
    version: SCHEMA_VERSION,
    tasks: [],
    groups: [defaultGroup()],
    courses: [],
    canvas: { ...DEFAULT_CANVAS },
    preferences: { ...DEFAULT_PREFERENCES },
  };
}

/** Tolerant of hand-edited or older payloads — anything missing falls back. */
function normalize(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  const input = raw as Partial<AppData>;

  const { groups, courses } = reconcile(
    Array.isArray(input.groups) ? input.groups.filter(isGroup) : [],
    Array.isArray(input.courses) ? input.courses.filter(isCourse) : [],
    base.groups[0],
  );

  return {
    version: SCHEMA_VERSION,
    tasks: Array.isArray(input.tasks) ? input.tasks.filter(isTask) : [],
    groups,
    courses,
    canvas: { ...base.canvas, ...(input.canvas ?? {}) },
    preferences: { ...base.preferences, ...(input.preferences ?? {}) },
  };
}

function isTask(value: unknown): value is Task {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Task).id === "string" &&
    typeof (value as Task).title === "string"
  );
}

function isGroup(value: unknown): value is Group {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Group).id === "string" &&
    typeof (value as Group).name === "string"
  );
}

function isCourse(value: unknown): value is Course {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Course).id === "string" &&
    typeof (value as Course).name === "string"
  );
}

export type NewTask = Partial<Omit<Task, "id" | "createdAt" | "updatedAt">> &
  Pick<Task, "title">;

export interface ImportOptions {
  /** Canvas keys the user ticked in the preview. */
  keys: string[];
  /** Mark already-submitted Canvas items as done instead of leaving them open. */
  markSubmittedDone: boolean;
}

export interface ImportResult {
  created: number;
  updated: number;
  coursesCreated: number;
}

interface StoreValue {
  data: AppData;
  hydrated: boolean;
  /* tasks */
  addTask: (task: NewTask) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  clearCompleted: () => void;
  /* courses */
  addCourse: (course: Partial<Course> & Pick<Course, "name">) => Course;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  /* groups */
  addGroup: (name: string) => void;
  updateGroup: (id: string, patch: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  moveGroup: (id: string, direction: -1 | 1) => void;
  moveCourse: (courseId: string, groupId: string, index: number) => void;
  /* canvas + prefs */
  setCanvas: (patch: Partial<CanvasConnection>) => void;
  setPreferences: (patch: Partial<Preferences>) => void;
  importCanvasItems: (items: CanvasItem[], options: ImportOptions) => ImportResult;
  /* whole-store */
  replaceAll: (data: AppData) => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  // Read once on mount. Rendering starts from `emptyData()` on both server and
  // client so the first paint matches; `hydrated` gates the real UI.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setData(normalize(JSON.parse(stored)));
    } catch {
      // Corrupt or blocked storage: start clean rather than crash the app.
    }
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  // Persist every change, but never the pre-hydration placeholder.
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Quota or private mode — the session keeps working in memory.
    }
  }, [data]);

  // Keep other tabs of the same app in sync.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        setData(normalize(JSON.parse(event.newValue)));
      } catch {
        /* ignore malformed cross-tab writes */
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addTask = useCallback((input: NewTask): Task => {
    const now = new Date().toISOString();
    const task: Task = {
      id: uid("task"),
      title: input.title.trim(),
      notes: input.notes ?? "",
      status: input.status ?? "todo",
      priority: input.priority ?? "normal",
      dueAt: input.dueAt ?? null,
      hasDueTime: input.hasDueTime ?? false,
      courseId: input.courseId ?? null,
      estimateMinutes: input.estimateMinutes ?? null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      source: input.source ?? "manual",
      ...(input.canvas ? { canvas: input.canvas } : {}),
    };
    setData((prev) => ({ ...prev, tasks: [task, ...prev.tasks] }));
    return task;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === id
          ? { ...task, ...patch, updatedAt: new Date().toISOString() }
          : task,
      ),
    }));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        if (task.id !== id) return task;
        const done = task.status === "done";
        return {
          ...task,
          status: done ? "todo" : "done",
          completedAt: done ? null : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setData((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
  }, []);

  const clearCompleted = useCallback(() => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.status !== "done"),
    }));
  }, []);

  const addCourse = useCallback(
    (input: Partial<Course> & Pick<Course, "name">): Course => {
      const course: Course = {
        id: uid("course"),
        name: input.name.trim(),
        code: input.code ?? "",
        color: input.color ?? colorForIndex(0),
        canvasId: input.canvasId ?? null,
        archived: false,
        createdAt: new Date().toISOString(),
        groupId: input.groupId ?? "",
        order: 0,
      };
      setData((prev) => {
        const groupId =
          input.groupId && prev.groups.some((g) => g.id === input.groupId)
            ? input.groupId
            : prev.groups[0].id;
        const order = coursesInGroup(prev.courses, groupId).length;
        return {
          ...prev,
          courses: [
            ...prev.courses,
            {
              ...course,
              groupId,
              order,
              color: input.color ?? colorForIndex(prev.courses.length),
            },
          ],
        };
      });
      return course;
    },
    [],
  );

  const updateCourse = useCallback((id: string, patch: Partial<Course>) => {
    setData((prev) => ({
      ...prev,
      courses: prev.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  /** Deleting a course leaves its tasks in place, just uncategorised. */
  const deleteCourse = useCallback((id: string) => {
    setData((prev) => {
      const removed = prev.courses.find((c) => c.id === id);
      const courses = prev.courses.filter((c) => c.id !== id);
      return {
        ...prev,
        courses: removed ? reindex(courses, removed.groupId) : courses,
        tasks: prev.tasks.map((t) => (t.courseId === id ? { ...t, courseId: null } : t)),
      };
    });
  }, []);

  /* ---------------------------------------------------------------- groups */

  const addGroup = useCallback((name: string): void => {
    setData((prev) => ({
      ...prev,
      groups: [
        ...prev.groups,
        {
          id: uid("group"),
          name: name.trim() || "Untitled",
          order: prev.groups.length,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }, []);

  const updateGroup = useCallback((id: string, patch: Partial<Group>) => {
    setData((prev) => ({
      ...prev,
      groups: prev.groups.map((group) => (group.id === id ? { ...group, ...patch } : group)),
    }));
  }, []);

  /**
   * Removing a group keeps everything in it — the courses move to the first
   * remaining group rather than disappearing with the heading. The last group
   * cannot be removed, since courses need somewhere to live.
   */
  const deleteGroup = useCallback((id: string) => {
    setData((prev) => ({ ...prev, ...removeGroup(prev.groups, prev.courses, id) }));
  }, []);

  /** Nudges a group one slot up (-1) or down (+1) in the sidebar. */
  const moveGroup = useCallback((id: string, direction: -1 | 1) => {
    setData((prev) => ({ ...prev, groups: reorderGroups(prev.groups, id, direction) }));
  }, []);

  /**
   * Drops a course at `index` within `groupId`, whether it came from that group
   * or another one. Both the source and destination are renumbered so orders
   * stay contiguous.
   */
  const moveCourse = useCallback(
    (courseId: string, groupId: string, index: number) => {
      setData((prev) => ({
        ...prev,
        courses: moveCourseIn(prev.courses, prev.groups, courseId, groupId, index),
      }));
    },
    [],
  );

  const setCanvas = useCallback((patch: Partial<CanvasConnection>) => {
    setData((prev) => ({ ...prev, canvas: { ...prev.canvas, ...patch } }));
  }, []);

  const setPreferences = useCallback((patch: Partial<Preferences>) => {
    setData((prev) => ({ ...prev, preferences: { ...prev.preferences, ...patch } }));
  }, []);

  const importCanvasItems = useCallback(
    (items: CanvasItem[], options: ImportOptions): ImportResult => {
      const wanted = new Set(options.keys);
      const selected = items.filter((item) => wanted.has(item.key));
      const result: ImportResult = { created: 0, updated: 0, coursesCreated: 0 };

      setData((prev) => {
        const courses = [...prev.courses];
        const byCanvasId = new Map(
          courses.filter((c) => c.canvasId !== null).map((c) => [c.canvasId as number, c]),
        );

        // Imported courses join the first group, which is "Courses" unless the
        // user has reordered their sidebar.
        const importGroupId = prev.groups[0].id;

        function courseFor(canvasCourseId: number, name: string): string {
          const existing = byCanvasId.get(canvasCourseId);
          if (existing) return existing.id;
          const created: Course = {
            id: uid("course"),
            name,
            code: "",
            color: colorForIndex(courses.length),
            canvasId: canvasCourseId,
            archived: false,
            createdAt: new Date().toISOString(),
            groupId: importGroupId,
            order: coursesInGroup(courses, importGroupId).length,
          };
          courses.push(created);
          byCanvasId.set(canvasCourseId, created);
          result.coursesCreated += 1;
          return created.id;
        }

        const byKey = new Map(
          prev.tasks
            .filter((t) => t.canvas?.key)
            .map((t) => [t.canvas!.key, t] as const),
        );
        const now = new Date().toISOString();
        const tasks = [...prev.tasks];

        for (const item of selected) {
          const courseId = courseFor(item.courseId, item.courseName);
          const meta = {
            key: item.key,
            kind: item.kind,
            courseId: item.courseId,
            htmlUrl: item.htmlUrl,
            pointsPossible: item.pointsPossible,
            submitted: item.submitted,
            syncedAt: now,
          };
          const existing = byKey.get(item.key);

          if (existing) {
            // Re-sync: refresh what Canvas owns, keep what the user owns
            // (notes, priority, estimate, and a status they set by hand).
            const index = tasks.findIndex((t) => t.id === existing.id);
            const shouldComplete =
              options.markSubmittedDone && item.submitted && existing.status !== "done";
            tasks[index] = {
              ...existing,
              title: item.title,
              dueAt: item.dueAt,
              hasDueTime: item.dueAt ? hasMeaningfulTime(item.dueAt) : false,
              courseId,
              canvas: meta,
              status: shouldComplete ? "done" : existing.status,
              completedAt: shouldComplete ? now : existing.completedAt,
              updatedAt: now,
            };
            result.updated += 1;
            continue;
          }

          const done = options.markSubmittedDone && item.submitted;
          tasks.unshift({
            id: uid("task"),
            title: item.title,
            notes: htmlToText(item.description).slice(0, 2000),
            status: done ? "done" : "todo",
            priority: "normal",
            dueAt: item.dueAt,
            hasDueTime: item.dueAt ? hasMeaningfulTime(item.dueAt) : false,
            courseId,
            estimateMinutes: null,
            completedAt: done ? now : null,
            createdAt: now,
            updatedAt: now,
            source: "canvas",
            canvas: meta,
          });
          result.created += 1;
        }

        return {
          ...prev,
          courses,
          tasks,
          canvas: { ...prev.canvas, lastSyncAt: now },
        };
      });

      return result;
    },
    [],
  );

  const replaceAll = useCallback((next: AppData) => setData(normalize(next)), []);
  const resetAll = useCallback(() => setData(emptyData()), []);

  const value = useMemo<StoreValue>(
    () => ({
      data,
      hydrated,
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      clearCompleted,
      addCourse,
      updateCourse,
      deleteCourse,
      addGroup,
      updateGroup,
      deleteGroup,
      moveGroup,
      moveCourse,
      setCanvas,
      setPreferences,
      importCanvasItems,
      replaceAll,
      resetAll,
    }),
    [
      data,
      hydrated,
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      clearCompleted,
      addCourse,
      updateCourse,
      deleteCourse,
      addGroup,
      updateGroup,
      deleteGroup,
      moveGroup,
      moveCourse,
      setCanvas,
      setPreferences,
      importCanvasItems,
      replaceAll,
      resetAll,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Canvas uses 23:59 for "end of day"; anything else is a real deadline time. */
function hasMeaningfulTime(iso: string): boolean {
  const d = new Date(iso);
  return !(d.getHours() === 0 && d.getMinutes() === 0);
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export { STORAGE_KEY, SCHEMA_VERSION, emptyData };
