import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterTasks,
  isOverdue,
  openTaskCount,
  sortTasks,
  summarize,
  tasksByDay,
  todayBuckets,
  upcomingGroups,
} from "../lib/selectors.ts";
import { dateKey } from "../lib/date.ts";
import type { Priority, Task, TaskStatus } from "../lib/types.ts";

const NOW = new Date(2026, 8, 14, 10, 0, 0, 0); // Monday 14 Sep 2026

let sequence = 0;

function task(overrides: Partial<Task> & { title: string }): Task {
  sequence += 1;
  return {
    id: `t${sequence}`,
    notes: "",
    status: "todo" as TaskStatus,
    priority: "normal" as Priority,
    dueAt: null,
    hasDueTime: false,
    courseId: null,
    estimateMinutes: null,
    completedAt: null,
    createdAt: new Date(2026, 8, 1).toISOString(),
    updatedAt: new Date(2026, 8, 1).toISOString(),
    source: "manual",
    ...overrides,
  };
}

const at = (day: number, hour = 0, minute = 0) =>
  new Date(2026, 8, day, hour, minute).toISOString();

describe("sortTasks", () => {
  it("puts the soonest due date first and undated tasks last", () => {
    const sorted = sortTasks([
      task({ title: "undated" }),
      task({ title: "late", dueAt: at(20) }),
      task({ title: "soon", dueAt: at(15) }),
    ]);
    assert.deepEqual(sorted.map((t) => t.title), ["soon", "late", "undated"]);
  });

  it("breaks ties on the same due date by priority", () => {
    const sorted = sortTasks([
      task({ title: "normal", dueAt: at(15) }),
      task({ title: "high", dueAt: at(15), priority: "high" }),
      task({ title: "low", dueAt: at(15), priority: "low" }),
    ]);
    assert.deepEqual(sorted.map((t) => t.title), ["high", "normal", "low"]);
  });
});

describe("isOverdue", () => {
  it("treats a day-level deadline as late only once the day is over", () => {
    assert.equal(isOverdue(task({ title: "a", dueAt: at(14) }), NOW), false);
    assert.equal(isOverdue(task({ title: "b", dueAt: at(13) }), NOW), true);
  });

  it("respects the clock when the task has a time", () => {
    const earlier = task({ title: "a", dueAt: at(14, 9), hasDueTime: true });
    const later = task({ title: "b", dueAt: at(14, 11), hasDueTime: true });
    assert.equal(isOverdue(earlier, NOW), true);
    assert.equal(isOverdue(later, NOW), false);
  });

  it("never marks completed or undated work as overdue", () => {
    assert.equal(isOverdue(task({ title: "a", dueAt: at(1), status: "done" }), NOW), false);
    assert.equal(isOverdue(task({ title: "b" }), NOW), false);
  });
});

describe("todayBuckets", () => {
  const tasks = [
    task({ title: "overdue", dueAt: at(12) }),
    task({ title: "due today", dueAt: at(14, 17), hasDueTime: true }),
    task({ title: "later", dueAt: at(20) }),
    task({ title: "anytime" }),
    task({ title: "done today", status: "done", completedAt: at(14, 9) }),
    task({ title: "done last week", status: "done", completedAt: at(7, 9) }),
  ];

  it("splits open work into overdue, today and undated", () => {
    const buckets = todayBuckets(tasks, NOW);
    assert.deepEqual(buckets.overdue.map((t) => t.title), ["overdue"]);
    assert.deepEqual(buckets.today.map((t) => t.title), ["due today"]);
    assert.deepEqual(buckets.anytime.map((t) => t.title), ["anytime"]);
  });

  it("only counts things finished today as completed today", () => {
    const buckets = todayBuckets(tasks, NOW);
    assert.deepEqual(buckets.completedToday.map((t) => t.title), ["done today"]);
  });
});

describe("upcomingGroups", () => {
  it("groups open work by day within the horizon and skips empty days", () => {
    const groups = upcomingGroups(
      [
        task({ title: "today", dueAt: at(14) }),
        task({ title: "friday a", dueAt: at(18, 9), hasDueTime: true }),
        task({ title: "friday b", dueAt: at(18, 17), hasDueTime: true }),
        task({ title: "beyond", dueAt: at(30) }),
        task({ title: "past", dueAt: at(10) }),
        task({ title: "finished", dueAt: at(16), status: "done" }),
      ],
      NOW,
      7,
    );

    assert.deepEqual(groups.map((g) => g.key), ["2026-09-14", "2026-09-18"]);
    assert.deepEqual(groups[1].tasks.map((t) => t.title), ["friday a", "friday b"]);
  });
});

describe("tasksByDay", () => {
  it("buckets by local day and drops undated tasks", () => {
    const map = tasksByDay([
      task({ title: "a", dueAt: at(14, 23, 59), hasDueTime: true }),
      task({ title: "b", dueAt: at(14, 8), hasDueTime: true }),
      task({ title: "c" }),
    ]);
    assert.equal(map.size, 1);
    assert.deepEqual(map.get(dateKey(NOW))?.map((t) => t.title), ["b", "a"]);
  });
});

describe("filterTasks", () => {
  const tasks = [
    task({ title: "Essay draft", notes: "about Whitman", priority: "high" }),
    task({ title: "Problem set", status: "done", courseId: "c1" }),
    task({ title: "Lab report", courseId: "c1", source: "canvas" }),
  ];

  it("defaults 'open' to everything that isn't done", () => {
    const open = filterTasks(tasks, { status: "open" });
    assert.deepEqual(open.map((t) => t.title), ["Essay draft", "Lab report"]);
  });

  it("searches the title and the notes", () => {
    assert.deepEqual(
      filterTasks(tasks, { query: "whitman", status: "all" }).map((t) => t.title),
      ["Essay draft"],
    );
  });

  it("combines course, priority and source filters", () => {
    assert.equal(filterTasks(tasks, { courseId: "c1", status: "all" }).length, 2);
    assert.equal(filterTasks(tasks, { priority: "high", status: "all" }).length, 1);
    assert.equal(filterTasks(tasks, { source: "canvas", status: "all" }).length, 1);
  });
});

describe("summarize", () => {
  it("counts open, overdue, due-today and this-week work", () => {
    const summary = summarize(
      [
        task({ title: "overdue", dueAt: at(11) }),
        task({ title: "today", dueAt: at(14) }),
        task({ title: "this week", dueAt: at(19) }),
        task({ title: "next week", dueAt: at(25) }),
        task({ title: "done", status: "done" }),
      ],
      NOW,
    );

    assert.equal(summary.open, 4);
    assert.equal(summary.overdue, 1);
    assert.equal(summary.dueToday, 1);
    // Today and Friday: the overdue one is behind us, next week is beyond the window.
    assert.equal(summary.dueThisWeek, 2);
    assert.equal(summary.completed, 1);
    assert.equal(summary.completionRate, 20);
  });

  it("reports a zero completion rate for an empty list", () => {
    assert.equal(summarize([], NOW).completionRate, 0);
  });
});

describe("openTaskCount", () => {
  it("counts only unfinished tasks for one course", () => {
    const tasks = [
      task({ title: "a", courseId: "c1" }),
      task({ title: "b", courseId: "c1", status: "done" }),
      task({ title: "c", courseId: "c2" }),
    ];
    assert.equal(openTaskCount(tasks, "c1"), 1);
  });
});
