import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  addMonths,
  dateKey,
  daysBetween,
  formatDue,
  formatOverdue,
  fromDateInput,
  fromDateKey,
  isSameDay,
  monthGrid,
  startOfWeek,
  toDateInput,
  toDateTimeInput,
  weekdayLabels,
} from "../lib/date.ts";

const NOW = new Date(2026, 8, 14, 10, 0, 0, 0); // Monday 14 Sep 2026

describe("arithmetic", () => {
  it("adds days across a month boundary", () => {
    assert.equal(dateKey(addDays(new Date(2026, 8, 30), 2)), "2026-10-02");
  });

  it("clamps to the last day when a month is shorter", () => {
    assert.equal(dateKey(addMonths(new Date(2026, 0, 31), 1)), "2026-02-28");
    assert.equal(dateKey(addMonths(new Date(2024, 0, 31), 1)), "2024-02-29");
    assert.equal(dateKey(addMonths(new Date(2026, 2, 31), -1)), "2026-02-28");
  });

  it("counts whole days regardless of the time of day", () => {
    assert.equal(daysBetween(NOW, new Date(2026, 8, 14, 23, 59)), 0);
    assert.equal(daysBetween(NOW, new Date(2026, 8, 15, 0, 1)), 1);
    assert.equal(daysBetween(NOW, new Date(2026, 8, 13, 23, 59)), -1);
  });

  it("finds the start of the week for either convention", () => {
    assert.equal(dateKey(startOfWeek(NOW, 0)), "2026-09-13");
    assert.equal(dateKey(startOfWeek(NOW, 1)), "2026-09-14");
  });
});

describe("month grid", () => {
  it("always covers six weeks starting on the chosen weekday", () => {
    const grid = monthGrid(2026, 8, 0);
    assert.equal(grid.length, 42);
    assert.equal(grid[0].getDay(), 0);
    assert.equal(dateKey(grid[0]), "2026-08-30");
    assert.ok(grid.some((day) => isSameDay(day, new Date(2026, 8, 1))));
    assert.ok(grid.some((day) => isSameDay(day, new Date(2026, 8, 30))));
  });

  it("shifts by one day when the week starts on Monday", () => {
    assert.equal(dateKey(monthGrid(2026, 8, 1)[0]), "2026-08-31");
  });

  it("labels weekdays in the matching order", () => {
    assert.equal(weekdayLabels(0)[0], "Sun");
    assert.equal(weekdayLabels(1)[0], "Mon");
    assert.equal(weekdayLabels(1)[6], "Sun");
  });
});

describe("date keys", () => {
  it("round-trips through the local-day key", () => {
    const key = dateKey(new Date(2026, 8, 14, 23, 30));
    assert.equal(key, "2026-09-14");
    assert.ok(isSameDay(fromDateKey(key), new Date(2026, 8, 14)));
  });
});

describe("formatting", () => {
  const iso = (...args: [number, number, number, number?, number?]) =>
    new Date(...(args as [number, number, number])).toISOString();

  it("prefers relative day names near today", () => {
    assert.match(formatDue(iso(2026, 8, 14), false, NOW), /^Today$/);
    assert.match(formatDue(iso(2026, 8, 15), false, NOW), /^Tomorrow$/);
    assert.match(formatDue(iso(2026, 8, 13), false, NOW), /^Yesterday$/);
  });

  it("uses the weekday inside the coming week", () => {
    assert.equal(formatDue(iso(2026, 8, 18), false, NOW), "Friday");
  });

  it("falls back to a date, adding the year only when it differs", () => {
    assert.ok(!formatDue(iso(2026, 10, 3), false, NOW).includes("2026"));
    assert.ok(formatDue(iso(2027, 1, 3), false, NOW).includes("2027"));
  });

  it("appends the time when the task has one", () => {
    assert.match(formatDue(iso(2026, 8, 14, 17, 0), true, NOW), /^Today · 5:00pm$/);
  });

  it("describes how late something is", () => {
    assert.equal(formatOverdue(iso(2026, 8, 13), NOW), "1 day overdue");
    assert.equal(formatOverdue(iso(2026, 8, 9), NOW), "5 days overdue");
    assert.equal(formatOverdue(iso(2026, 7, 14), NOW), "4 weeks overdue");
  });
});

describe("<input> interop", () => {
  it("round-trips a date input value in local time", () => {
    const source = new Date(2026, 8, 14, 17, 30);
    assert.equal(toDateInput(source.toISOString()), "2026-09-14");
    assert.equal(toDateTimeInput(source.toISOString()), "2026-09-14T17:30");

    const parsed = new Date(fromDateInput("2026-09-14", "17:30") as string);
    assert.equal(parsed.getTime(), source.getTime());
  });

  it("treats a date with no time as local midnight", () => {
    const parsed = new Date(fromDateInput("2026-09-14") as string);
    assert.deepEqual([parsed.getHours(), parsed.getMinutes()], [0, 0]);
  });

  it("returns null for an empty or malformed value", () => {
    assert.equal(fromDateInput(""), null);
    assert.equal(fromDateInput("not-a-date"), null);
  });
});
