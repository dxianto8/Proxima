import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coursesInGroup,
  moveCourse,
  reconcile,
  reindex,
  removeGroup,
  reorderGroups,
  sortGroups,
} from "../lib/groups.ts";
import type { Course, Group } from "../lib/types.ts";

const ISO = "2026-09-15T00:00:00.000Z";

const group = (id: string, name: string, order: number): Group => ({
  id,
  name,
  order,
  createdAt: ISO,
});

const course = (id: string, groupId: string, order: number): Course => ({
  id,
  name: id.toUpperCase(),
  code: id.toUpperCase(),
  color: "indigo",
  canvasId: null,
  archived: false,
  createdAt: ISO,
  groupId,
  order,
});

/** Compact view of the result: ids per group, in order. */
const layout = (courses: Course[], groups: Group[]) =>
  Object.fromEntries(
    sortGroups(groups).map((g) => [g.id, coursesInGroup(courses, g.id).map((c) => c.id)]),
  );

const GROUPS = [group("g1", "Courses", 0), group("g2", "Clubs", 1)];
const COURSES = [
  course("a", "g1", 0),
  course("b", "g1", 1),
  course("c", "g1", 2),
  course("x", "g2", 0),
];

describe("reindex", () => {
  it("closes gaps left by a removal", () => {
    const sparse = [course("a", "g1", 0), course("c", "g1", 7)];
    assert.deepEqual(
      reindex(sparse, "g1").map((c) => [c.id, c.order]),
      [["a", 0], ["c", 1]],
    );
  });

  it("leaves other groups alone", () => {
    const result = reindex([course("a", "g1", 5), course("x", "g2", 9)], "g1");
    assert.equal(result.find((c) => c.id === "x")!.order, 9);
  });
});

describe("moveCourse within a group", () => {
  it("moves an item down", () => {
    const result = moveCourse(COURSES, GROUPS, "a", "g1", 2);
    assert.deepEqual(layout(result, GROUPS), { g1: ["b", "c", "a"], g2: ["x"] });
  });

  it("moves an item up", () => {
    const result = moveCourse(COURSES, GROUPS, "c", "g1", 0);
    assert.deepEqual(layout(result, GROUPS), { g1: ["c", "a", "b"], g2: ["x"] });
  });

  it("treats a drop on its own position as a no-op", () => {
    const result = moveCourse(COURSES, GROUPS, "b", "g1", 1);
    assert.deepEqual(layout(result, GROUPS), { g1: ["a", "b", "c"], g2: ["x"] });
  });

  it("clamps an index past the end instead of throwing", () => {
    const result = moveCourse(COURSES, GROUPS, "a", "g1", 99);
    assert.deepEqual(layout(result, GROUPS).g1, ["b", "c", "a"]);
  });

  it("clamps a negative index", () => {
    const result = moveCourse(COURSES, GROUPS, "c", "g1", -5);
    assert.deepEqual(layout(result, GROUPS).g1, ["c", "a", "b"]);
  });

  it("always leaves orders contiguous from zero", () => {
    const result = moveCourse(COURSES, GROUPS, "a", "g1", 2);
    assert.deepEqual(
      coursesInGroup(result, "g1").map((c) => c.order),
      [0, 1, 2],
    );
  });
});

describe("moveCourse across groups", () => {
  it("inserts into the destination and closes the gap behind it", () => {
    const result = moveCourse(COURSES, GROUPS, "b", "g2", 0);
    assert.deepEqual(layout(result, GROUPS), { g1: ["a", "c"], g2: ["b", "x"] });
    assert.deepEqual(coursesInGroup(result, "g1").map((c) => c.order), [0, 1]);
    assert.deepEqual(coursesInGroup(result, "g2").map((c) => c.order), [0, 1]);
  });

  it("appends when dropped at the end of the destination", () => {
    const result = moveCourse(COURSES, GROUPS, "a", "g2", 1);
    assert.deepEqual(layout(result, GROUPS).g2, ["x", "a"]);
  });

  it("can empty a group", () => {
    let result = moveCourse(COURSES, GROUPS, "x", "g1", 0);
    assert.deepEqual(layout(result, GROUPS), { g1: ["x", "a", "b", "c"], g2: [] });
    // …and fill it again.
    result = moveCourse(result, GROUPS, "c", "g2", 0);
    assert.deepEqual(layout(result, GROUPS).g2, ["c"]);
  });

  it("ignores an unknown course or group", () => {
    assert.deepEqual(moveCourse(COURSES, GROUPS, "nope", "g1", 0), COURSES);
    assert.deepEqual(moveCourse(COURSES, GROUPS, "a", "nope", 0), COURSES);
  });
});

describe("reorderGroups", () => {
  const three = [group("g1", "A", 0), group("g2", "B", 1), group("g3", "C", 2)];

  it("moves a group up and down", () => {
    assert.deepEqual(
      sortGroups(reorderGroups(three, "g3", -1)).map((g) => g.id),
      ["g1", "g3", "g2"],
    );
    assert.deepEqual(
      sortGroups(reorderGroups(three, "g1", 1)).map((g) => g.id),
      ["g2", "g1", "g3"],
    );
  });

  it("is a no-op at either end", () => {
    assert.deepEqual(reorderGroups(three, "g1", -1), three);
    assert.deepEqual(reorderGroups(three, "g3", 1), three);
  });

  it("renumbers so orders stay contiguous", () => {
    assert.deepEqual(
      sortGroups(reorderGroups(three, "g3", -1)).map((g) => g.order),
      [0, 1, 2],
    );
  });
});

describe("removeGroup", () => {
  it("adopts the removed group's courses into the first remaining one", () => {
    const { groups, courses } = removeGroup(GROUPS, COURSES, "g2");
    assert.deepEqual(groups.map((g) => g.id), ["g1"]);
    assert.deepEqual(layout(courses, groups), { g1: ["a", "b", "c", "x"] });
  });

  it("adopts into the new first group when the first is the one removed", () => {
    const { groups, courses } = removeGroup(GROUPS, COURSES, "g1");
    assert.deepEqual(groups.map((g) => g.id), ["g2"]);
    assert.deepEqual(layout(courses, groups).g2, ["x", "a", "b", "c"]);
  });

  it("refuses to remove the last group, so courses always have a home", () => {
    const one = [group("g1", "Courses", 0)];
    const result = removeGroup(one, COURSES.slice(0, 3), "g1");
    assert.deepEqual(result.groups, one);
    assert.equal(result.courses.length, 3);
  });

  it("ignores an unknown id", () => {
    assert.deepEqual(removeGroup(GROUPS, COURSES, "nope").groups, GROUPS);
  });
});

describe("reconcile", () => {
  const fallback = group("seed", "Courses", 0);

  it("seeds a group when there are none", () => {
    const { groups, courses } = reconcile([], [], fallback);
    assert.deepEqual(groups.map((g) => g.id), ["seed"]);
    assert.deepEqual(courses, []);
  });

  it("adopts courses saved before groups existed, keeping their listed order", () => {
    // The shape older data has: no groupId, no order.
    const legacy = [
      { ...course("a", "", 0), groupId: undefined, order: undefined },
      { ...course("b", "", 0), groupId: undefined, order: undefined },
      { ...course("c", "", 0), groupId: undefined, order: undefined },
    ] as unknown as Course[];

    const { groups, courses } = reconcile([], legacy, fallback);
    assert.deepEqual(layout(courses, groups), { seed: ["a", "b", "c"] });
    assert.deepEqual(courses.map((c) => c.order), [0, 1, 2]);
  });

  it("rehomes a course pointing at a group that no longer exists", () => {
    const orphan = [course("a", "g1", 0), course("ghost", "deleted", 0)];
    const { courses } = reconcile([group("g1", "Courses", 0)], orphan, fallback);
    assert.equal(courses.find((c) => c.id === "ghost")!.groupId, "g1");
  });

  it("renumbers groups and courses that were left with gaps", () => {
    const gappy = [group("g1", "A", 5), group("g2", "B", 40)];
    const spread = [course("a", "g1", 3), course("b", "g1", 99)];
    const { groups, courses } = reconcile(gappy, spread, fallback);
    assert.deepEqual(groups.map((g) => g.order), [0, 1]);
    assert.deepEqual(coursesInGroup(courses, "g1").map((c) => c.order), [0, 1]);
  });

  it("is idempotent", () => {
    const once = reconcile(GROUPS, COURSES, fallback);
    const twice = reconcile(once.groups, once.courses, fallback);
    assert.deepEqual(twice, once);
  });
});
