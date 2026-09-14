import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEstimate, parseQuickAdd } from "../lib/parse.ts";
import type { Course } from "../lib/types.ts";

// Monday, 14 September 2026, 10:00 local.
const NOW = new Date(2026, 8, 14, 10, 0, 0, 0);

const COURSES: Course[] = [
  {
    id: "c1",
    name: "Introduction to Astrophysics",
    code: "ASTR 201",
    color: "indigo",
    canvasId: 1,
    archived: false,
    createdAt: NOW.toISOString(),
  },
  {
    id: "c2",
    name: "Linear Algebra",
    code: "MATH 254",
    color: "teal",
    canvasId: null,
    archived: false,
    createdAt: NOW.toISOString(),
  },
  {
    id: "c3",
    name: "Retired Seminar",
    code: "OLD 100",
    color: "slate",
    canvasId: null,
    archived: true,
    createdAt: NOW.toISOString(),
  },
];

const parse = (input: string) => parseQuickAdd(input, COURSES, NOW);
const due = (input: string) => {
  const result = parse(input);
  assert.ok(result.dueAt, `expected "${input}" to produce a due date`);
  return new Date(result.dueAt);
};

describe("parseQuickAdd", () => {
  it("leaves an ordinary sentence completely alone", () => {
    const result = parse("Read chapter 5 and take notes");
    assert.equal(result.title, "Read chapter 5 and take notes");
    assert.equal(result.dueAt, null);
    assert.equal(result.priority, "normal");
    assert.equal(result.courseId, null);
    assert.equal(result.estimateMinutes, null);
  });

  it("handles today, tomorrow and yesterday", () => {
    assert.equal(due("submit today").getDate(), 14);
    assert.equal(due("submit tomorrow").getDate(), 15);
    assert.equal(due("submit yesterday").getDate(), 13);
  });

  it("resolves the coming weekday, and next week's for 'next'", () => {
    assert.equal(due("essay friday").getDate(), 18);
    assert.equal(due("essay next friday").getDate(), 25);
    // Today is Monday: bare "monday" means today, "next monday" is a week out.
    assert.equal(due("standup monday").getDate(), 14);
    assert.equal(due("standup next monday").getDate(), 21);
  });

  it("handles relative offsets and explicit dates", () => {
    assert.equal(due("review in 3 days").getDate(), 17);
    assert.equal(due("review in 2 weeks").getDate(), 28);

    const slash = due("review 9/20");
    assert.deepEqual([slash.getMonth(), slash.getDate()], [8, 20]);

    const named = due("review sep 20");
    assert.deepEqual([named.getMonth(), named.getDate()], [8, 20]);

    const iso = due("review 2026-12-01");
    assert.deepEqual([iso.getFullYear(), iso.getMonth(), iso.getDate()], [2026, 11, 1]);
  });

  it("rolls a bare past date into next year", () => {
    const date = due("taxes april 1");
    assert.equal(date.getFullYear(), 2027);
  });

  it("parses times and marks the task as timed", () => {
    const result = parse("lab tomorrow 5pm");
    assert.equal(result.hasDueTime, true);
    const at = new Date(result.dueAt as string);
    assert.deepEqual([at.getDate(), at.getHours(), at.getMinutes()], [15, 17, 0]);

    assert.equal(due("lab tomorrow 5:30pm").getMinutes(), 30);
    assert.equal(due("lab tomorrow noon").getHours(), 12);
    assert.equal(due("lab tomorrow midnight").getHours(), 0);
    assert.equal(due("lab tomorrow at 14:45").getHours(), 14);
    assert.equal(due("lab tomorrow 12am").getHours(), 0);
    assert.equal(due("lab tomorrow 12pm").getHours(), 12);
  });

  it("assumes tomorrow for a bare time that has already passed", () => {
    assert.equal(due("standup 8am").getDate(), 15);
    assert.equal(due("standup 5pm").getDate(), 14);
  });

  it("reads priority and estimate flags", () => {
    assert.equal(parse("essay !high").priority, "high");
    assert.equal(parse("essay !!").priority, "high");
    assert.equal(parse("essay !low").priority, "low");
    assert.equal(parse("essay ~90m").estimateMinutes, 90);
    assert.equal(parse("essay ~2h").estimateMinutes, 120);
    assert.equal(parse("essay ~1.5h").estimateMinutes, 90);
  });

  it("matches courses by code or name, and ignores archived ones", () => {
    assert.equal(parse("lab #astr").courseId, "c1");
    assert.equal(parse("lab #ASTR201").courseId, "c1");
    assert.equal(parse("lab @math").courseId, "c2");
    assert.equal(parse("lab #linearalgebra").courseId, "c2");
    assert.equal(parse("lab #old").courseId, null);
  });

  it("keeps an unrecognised tag in the title rather than swallowing it", () => {
    const result = parse("post about #finals");
    assert.equal(result.courseId, null);
    assert.equal(result.title, "post about #finals");
  });

  it("strips every recognised token out of the title", () => {
    const result = parse("Essay draft #astr friday 5pm !high ~2h");
    assert.equal(result.title, "Essay draft");
    assert.equal(result.courseId, "c1");
    assert.equal(result.priority, "high");
    assert.equal(result.estimateMinutes, 120);
    const at = new Date(result.dueAt as string);
    assert.deepEqual([at.getDate(), at.getHours()], [18, 17]);
  });

  it("describes what it understood", () => {
    const result = parse("Essay draft #astr friday 5pm !high ~2h");
    assert.equal(result.hints.length, 4);
    assert.ok(result.hints.includes("ASTR 201"));
    assert.ok(result.hints.includes("High priority"));
    assert.ok(result.hints.includes("2h"));
  });

  it("survives an empty or whitespace-only line", () => {
    assert.equal(parse("").title, "");
    assert.equal(parse("    ").title, "");
  });
});

describe("formatEstimate", () => {
  it("renders minutes, hours and mixed durations", () => {
    assert.equal(formatEstimate(45), "45m");
    assert.equal(formatEstimate(60), "1h");
    assert.equal(formatEstimate(150), "2h 30m");
  });
});
