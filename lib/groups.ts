/**
 * Ordering and grouping logic for the sidebar, kept free of React so the test
 * suite can exercise it directly.
 *
 * Every function is pure and returns new arrays; `order` is always renumbered
 * to be contiguous from 0 within each group, so nothing drifts after repeated
 * moves and the stored data never accumulates gaps.
 */

import type { Course, Group } from "./types";

/** Courses of one group, in order. */
export function coursesInGroup(courses: Course[], groupId: string): Course[] {
  return courses
    .filter((course) => course.groupId === groupId)
    .sort((a, b) => a.order - b.order);
}

/** Renumbers one group's courses to 0..n-1 in their current sorted order. */
export function reindex(courses: Course[], groupId: string): Course[] {
  const position = new Map(
    coursesInGroup(courses, groupId).map((course, index) => [course.id, index]),
  );
  return courses.map((course) =>
    position.has(course.id) ? { ...course, order: position.get(course.id)! } : course,
  );
}

export function sortGroups(groups: Group[]): Group[] {
  return [...groups].sort((a, b) => a.order - b.order);
}

/**
 * Drops `courseId` at `index` within `groupId`, whether it came from that group
 * or another. Both source and destination end up contiguous. Out-of-range
 * indices clamp rather than throw, because drop targets are computed from
 * cursor position and can overshoot by one.
 */
export function moveCourse(
  courses: Course[],
  groups: Group[],
  courseId: string,
  groupId: string,
  index: number,
): Course[] {
  const course = courses.find((c) => c.id === courseId);
  if (!course || !groups.some((group) => group.id === groupId)) return courses;

  const from = course.groupId;
  const target = coursesInGroup(courses, groupId).filter((c) => c.id !== courseId);
  const at = Math.max(0, Math.min(index, target.length));
  target.splice(at, 0, { ...course, groupId });

  const positions = new Map(target.map((c, i) => [c.id, i]));
  const moved = courses.map((c) =>
    positions.has(c.id) ? { ...c, groupId, order: positions.get(c.id)! } : c,
  );
  return from === groupId ? moved : reindex(moved, from);
}

/** Nudges a group one slot up (-1) or down (+1). A no-op at either end. */
export function reorderGroups(groups: Group[], id: string, direction: -1 | 1): Group[] {
  const ordered = sortGroups(groups);
  const from = ordered.findIndex((group) => group.id === id);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= ordered.length) return groups;

  const [group] = ordered.splice(from, 1);
  ordered.splice(to, 0, group);
  return ordered.map((entry, index) => ({ ...entry, order: index }));
}

/**
 * Removes a group and adopts its courses into the first remaining one — the
 * heading goes, the contents do not. Removing the last group is refused, since
 * courses need somewhere to live.
 */
export function removeGroup(
  groups: Group[],
  courses: Course[],
  id: string,
): { groups: Group[]; courses: Course[] } {
  if (groups.length <= 1 || !groups.some((group) => group.id === id)) {
    return { groups, courses };
  }
  const remaining = sortGroups(groups.filter((group) => group.id !== id)).map(
    (group, index) => ({ ...group, order: index }),
  );
  const target = remaining[0].id;

  // Adopted courses go after whatever is already in the destination.
  const existing = coursesInGroup(courses, target).length;
  const adopted = coursesInGroup(courses, id).map((course, index) => ({
    ...course,
    groupId: target,
    order: existing + index,
  }));
  const byId = new Map(adopted.map((course) => [course.id, course]));

  return {
    groups: remaining,
    courses: reindex(
      courses.map((course) => byId.get(course.id) ?? course),
      target,
    ),
  };
}

/**
 * Brings stored groups and courses into a consistent state: groups renumbered,
 * every course in a group that exists, and orders contiguous per group.
 *
 * Data saved before groups existed has courses with no group at all, so an
 * orphan is adopted into the first group, keeping the order it was listed in.
 */
export function reconcile(
  groups: Group[],
  courses: Course[],
  fallbackGroup: Group,
): { groups: Group[]; courses: Course[] } {
  const ordered = sortGroups(groups).map((group, index) => ({ ...group, order: index }));
  if (ordered.length === 0) ordered.push({ ...fallbackGroup, order: 0 });

  const known = new Set(ordered.map((group) => group.id));
  const fallbackId = ordered[0].id;
  const nextOrder = new Map<string, number>();

  const assigned = courses.map((course) => {
    const groupId = known.has(course.groupId) ? course.groupId : fallbackId;
    const next = nextOrder.get(groupId) ?? 0;
    nextOrder.set(groupId, next + 1);
    return {
      ...course,
      groupId,
      order: typeof course.order === "number" ? course.order : next,
    };
  });

  return {
    groups: ordered,
    courses: ordered.reduce((acc, group) => reindex(acc, group.id), assigned),
  };
}
