import type { Course, Priority, Task, TaskStatus } from "./types";
import { addDays, dateKey, daysBetween, startOfDay } from "./date";

const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

/** Due soonest first; undated tasks sink to the bottom, high priority breaks ties. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.dueAt && b.dueAt) {
      const diff = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      if (diff !== 0) return diff;
    } else if (a.dueAt !== b.dueAt) {
      return a.dueAt ? -1 : 1;
    }
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byPriority !== 0) return byPriority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function isOverdue(task: Task, now: Date = new Date()): boolean {
  if (!task.dueAt || task.status === "done") return false;
  const due = new Date(task.dueAt);
  // A day-level deadline isn't late until the day is over.
  return task.hasDueTime ? due < now : startOfDay(due) < startOfDay(now);
}

export function isDueOn(task: Task, day: Date): boolean {
  return !!task.dueAt && dateKey(new Date(task.dueAt)) === dateKey(day);
}

export interface TaskFilter {
  query?: string;
  courseId?: string | null;
  status?: TaskStatus | "open" | "all";
  priority?: Priority | "all";
  source?: Task["source"] | "all";
}

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  return tasks.filter((task) => {
    if (filter.status && filter.status !== "all") {
      if (filter.status === "open" ? task.status === "done" : task.status !== filter.status) {
        return false;
      }
    }
    if (filter.courseId !== undefined && filter.courseId !== null) {
      if (task.courseId !== filter.courseId) return false;
    }
    if (filter.priority && filter.priority !== "all" && task.priority !== filter.priority) {
      return false;
    }
    if (filter.source && filter.source !== "all" && task.source !== filter.source) {
      return false;
    }
    if (query) {
      const haystack = `${task.title}\n${task.notes}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export interface TodayBuckets {
  overdue: Task[];
  today: Task[];
  anytime: Task[];
  completedToday: Task[];
}

export function todayBuckets(tasks: Task[], now: Date = new Date()): TodayBuckets {
  const overdue: Task[] = [];
  const today: Task[] = [];
  const anytime: Task[] = [];
  const completedToday: Task[] = [];

  for (const task of tasks) {
    if (task.status === "done") {
      if (task.completedAt && daysBetween(new Date(task.completedAt), now) === 0) {
        completedToday.push(task);
      }
      continue;
    }
    if (isOverdue(task, now)) overdue.push(task);
    else if (task.dueAt && isDueOn(task, now)) today.push(task);
    else if (!task.dueAt) anytime.push(task);
  }

  return {
    overdue: sortTasks(overdue),
    today: sortTasks(today),
    anytime: sortTasks(anytime),
    completedToday: sortTasks(completedToday),
  };
}

export interface DayGroup {
  key: string;
  date: Date;
  tasks: Task[];
}

/** Upcoming tasks grouped into consecutive days, skipping empty ones. */
export function upcomingGroups(
  tasks: Task[],
  now: Date = new Date(),
  horizonDays = 21,
): DayGroup[] {
  const open = tasks.filter((t) => t.status !== "done" && t.dueAt);
  const groups = new Map<string, Task[]>();

  for (const task of open) {
    const offset = daysBetween(now, new Date(task.dueAt as string));
    if (offset < 0 || offset > horizonDays) continue;
    const key = dateKey(addDays(now, offset));
    const bucket = groups.get(key);
    if (bucket) bucket.push(task);
    else groups.set(key, [task]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      date: new Date(`${key}T00:00:00`),
      tasks: sortTasks(items),
    }));
}

/** Tasks bucketed by local day — the calendar's lookup table. */
export function tasksByDay(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.dueAt) continue;
    const key = dateKey(new Date(task.dueAt));
    const bucket = map.get(key);
    if (bucket) bucket.push(task);
    else map.set(key, [task]);
  }
  for (const [key, items] of map) map.set(key, sortTasks(items));
  return map;
}

export interface Summary {
  open: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  completed: number;
  completionRate: number;
}

export function summarize(tasks: Task[], now: Date = new Date()): Summary {
  let open = 0;
  let overdue = 0;
  let dueToday = 0;
  let dueThisWeek = 0;
  let completed = 0;

  for (const task of tasks) {
    if (task.status === "done") {
      completed += 1;
      continue;
    }
    open += 1;
    if (isOverdue(task, now)) overdue += 1;
    if (task.dueAt) {
      const offset = daysBetween(now, new Date(task.dueAt));
      if (offset === 0) dueToday += 1;
      if (offset >= 0 && offset < 7) dueThisWeek += 1;
    }
  }

  const total = open + completed;
  return {
    open,
    overdue,
    dueToday,
    dueThisWeek,
    completed,
    completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function courseMap(courses: Course[]): Map<string, Course> {
  return new Map(courses.map((c) => [c.id, c]));
}

export function openTaskCount(tasks: Task[], courseId: string): number {
  return tasks.filter((t) => t.courseId === courseId && t.status !== "done").length;
}
