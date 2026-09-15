export type TaskStatus = "todo" | "doing" | "done";
export type Priority = "low" | "normal" | "high";
export type TaskSource = "manual" | "canvas";

/** Canvas metadata attached to an imported task, used for de-duplicating re-syncs. */
export interface CanvasMeta {
  /** Stable key: `${kind}:${id}` from Canvas. */
  key: string;
  kind: "assignment" | "quiz" | "discussion" | "event";
  courseId: number;
  htmlUrl: string;
  pointsPossible: number | null;
  submitted: boolean;
  /** ISO timestamp of the last sync that touched this task. */
  syncedAt: string;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: Priority;
  /** ISO string, or null when the task has no due date. */
  dueAt: string | null;
  /** False when the due date is a whole day with no meaningful time component. */
  hasDueTime: boolean;
  courseId: string | null;
  estimateMinutes: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  source: TaskSource;
  canvas?: CanvasMeta;
}

/**
 * A named sidebar section. Courses live in one; beyond coursework people use
 * them for clubs, jobs, personal projects — whatever they name it.
 */
export interface Group {
  id: string;
  name: string;
  /** Position in the sidebar, ascending. */
  order: number;
  createdAt: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  /** Key into the course palette (see lib/colors.ts). */
  color: string;
  canvasId: number | null;
  archived: boolean;
  createdAt: string;
  /** The group this sits in. Always valid after normalize(). */
  groupId: string;
  /** Position within its group, ascending and contiguous. */
  order: number;
}

export interface CanvasConnection {
  baseUrl: string;
  token: string;
  /** Canvas course ids the user opted into syncing. */
  selectedCourseIds: number[];
  /** Pull course calendar events alongside graded work. */
  includeEvents: boolean;
  lastSyncAt: string | null;
}

export type ThemePreference = "system" | "light" | "dark";

/**
 * A derived theme. The seed is kept so the picker can show what is selected;
 * the two variable maps are what actually get applied, precomputed so the
 * before-paint script can set them without doing colour maths.
 */
export interface CustomTheme {
  seed: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface Preferences {
  theme: ThemePreference;
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn: 0 | 1;
  showCompleted: boolean;
  /** null keeps the built-in indigo palette. */
  customTheme: CustomTheme | null;
  /** Scrim over the background image, 0–100. Higher is more readable. */
  backgroundDim: number;
  /** Colours pulled from the background image, offered in the picker. */
  extractedColors: string[];
}

export interface AppData {
  version: number;
  tasks: Task[];
  groups: Group[];
  courses: Course[];
  canvas: CanvasConnection;
  preferences: Preferences;
}

/* ---------- Canvas API payloads (normalized on the server) ---------- */

export interface CanvasCourse {
  id: number;
  name: string;
  courseCode: string;
  term: string | null;
}

export interface CanvasItem {
  key: string;
  kind: CanvasMeta["kind"];
  title: string;
  description: string;
  dueAt: string | null;
  courseId: number;
  courseName: string;
  htmlUrl: string;
  pointsPossible: number | null;
  submitted: boolean;
}
