import type { CanvasCourse, CanvasItem } from "./types";

/**
 * Minimal Canvas LMS REST client. Imported only by the route handlers under
 * `app/api/canvas/`, because it has to run on the server: Canvas sends no CORS
 * headers for token auth, and this way the access token never rides along in a
 * cross-origin request from the browser.
 *
 * API reference: https://canvas.instructure.com/doc/api/
 */

export class CanvasError extends Error {
  readonly status: number;
  readonly hint?: string;

  constructor(message: string, status: number, hint?: string) {
    super(message);
    this.name = "CanvasError";
    this.status = status;
    this.hint = hint;
  }
}

const BLOCKED_HOSTS = /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

/** Accepts `school.instructure.com` or a full URL; returns a bare https origin. */
export function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new CanvasError("Add your Canvas address first.", 400);
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new CanvasError(`"${input}" is not a valid Canvas address.`, 400);
  }

  if (url.protocol !== "https:") {
    throw new CanvasError("Canvas must be reached over https.", 400);
  }
  if (BLOCKED_HOSTS.test(url.hostname)) {
    throw new CanvasError("That address is not a public Canvas host.", 400);
  }
  if (!url.hostname.includes(".")) {
    throw new CanvasError(`"${input}" is not a valid Canvas address.`, 400);
  }
  return url.origin;
}

interface FetchOptions {
  /** Stop after this many pages so a huge account can't stall the request. */
  maxPages?: number;
  /** Non-fatal endpoints resolve to [] instead of throwing. */
  optional?: boolean;
}

async function canvasGet<T>(
  baseUrl: string,
  token: string,
  path: string,
  params: Record<string, string | number | string[]> = {},
  options: FetchOptions = {},
): Promise<T[]> {
  const { maxPages = 10, optional = false } = options;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else query.set(key, String(value));
  }
  if (!query.has("per_page")) query.set("per_page", "100");

  let next: string | null = `${baseUrl}${path}?${query.toString()}`;
  const results: T[] = [];

  for (let page = 0; next && page < maxPages; page += 1) {
    let response: Response;
    try {
      response = await fetch(next, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } catch {
      if (optional) return [];
      throw new CanvasError(
        "Could not reach Canvas.",
        502,
        "Check the address and your network connection.",
      );
    }

    if (!response.ok) {
      if (optional) return [];
      throw describeFailure(response.status, path);
    }

    const body = (await response.json()) as T[] | Record<string, unknown>;
    if (Array.isArray(body)) results.push(...body);

    next = parseNextLink(response.headers.get("link"));
  }

  return results;
}

function describeFailure(status: number, path: string): CanvasError {
  if (status === 401 || status === 403) {
    return new CanvasError("Canvas rejected that access token.", 401, "Generate a new token under Canvas → Account → Settings → New Access Token.");
  }
  if (status === 404) {
    return new CanvasError("Canvas responded, but that endpoint was not found.", 404, `Double-check the address — requested ${path}.`);
  }
  if (status === 429) {
    return new CanvasError("Canvas is rate limiting this account.", 429, "Wait a minute and try again.");
  }
  return new CanvasError(`Canvas returned an error (HTTP ${status}).`, status);
}

/** Canvas paginates with RFC 5988 `Link` headers. */
function parseNextLink(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
    if (match) return match[1];
  }
  return null;
}

/* ---------- raw Canvas shapes (only the fields we use) ---------- */

interface RawCourse {
  id: number;
  name?: string;
  course_code?: string;
  term?: { name?: string };
  access_restricted_by_date?: boolean;
}

interface RawAssignment {
  id: number;
  name?: string;
  description?: string | null;
  due_at?: string | null;
  html_url?: string;
  points_possible?: number | null;
  submission_types?: string[];
  course_id?: number;
  published?: boolean;
  submission?: {
    submitted_at?: string | null;
    workflow_state?: string;
    missing?: boolean;
  } | null;
}

interface RawEvent {
  id: number;
  title?: string;
  description?: string | null;
  start_at?: string | null;
  html_url?: string;
  context_code?: string;
  hidden?: boolean;
}

/* ---------- public API ---------- */

export async function fetchCourses(baseUrl: string, token: string): Promise<CanvasCourse[]> {
  const raw = await canvasGet<RawCourse>(baseUrl, token, "/api/v1/courses", {
    enrollment_state: "active",
    "state[]": ["available"],
    "include[]": ["term"],
  });

  return raw
    .filter((course) => !course.access_restricted_by_date && course.name)
    .map((course) => ({
      id: course.id,
      name: course.name as string,
      courseCode: course.course_code ?? "",
      term: course.term?.name ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface FetchItemsOptions {
  courseIds: number[];
  /** Also pull course calendar events, not just graded work. */
  includeEvents?: boolean;
}

export async function fetchItems(
  baseUrl: string,
  token: string,
  options: FetchItemsOptions,
): Promise<CanvasItem[]> {
  const courses = await fetchCourses(baseUrl, token);
  const wanted = new Set(options.courseIds);
  const selected = courses.filter((c) => wanted.has(c.id));
  if (selected.length === 0) return [];

  const names = new Map(selected.map((c) => [c.id, c.courseCode || c.name]));
  const items: CanvasItem[] = [];

  // A handful of courses at a time: fast enough, polite to Canvas.
  for (const batch of chunk(selected, 4)) {
    const responses = await Promise.all(
      batch.map((course) =>
        canvasGet<RawAssignment>(
          baseUrl,
          token,
          `/api/v1/courses/${course.id}/assignments`,
          { "include[]": ["submission"], order_by: "due_at" },
          { optional: true },
        ),
      ),
    );

    responses.forEach((assignments, index) => {
      const course = batch[index];
      for (const assignment of assignments) {
        if (assignment.published === false || !assignment.name) continue;
        items.push({
          key: `assignment:${assignment.id}`,
          kind: assignmentKind(assignment),
          title: assignment.name,
          description: assignment.description ?? "",
          dueAt: assignment.due_at ?? null,
          courseId: course.id,
          courseName: names.get(course.id) ?? course.name,
          htmlUrl: assignment.html_url ?? `${baseUrl}/courses/${course.id}/assignments/${assignment.id}`,
          pointsPossible: assignment.points_possible ?? null,
          submitted: isSubmitted(assignment),
        });
      }
    });
  }

  if (options.includeEvents) {
    const events = await canvasGet<RawEvent>(
      baseUrl,
      token,
      "/api/v1/calendar_events",
      {
        type: "event",
        "context_codes[]": selected.map((c) => `course_${c.id}`),
        start_date: isoDate(-30),
        end_date: isoDate(180),
      },
      { optional: true, maxPages: 4 },
    );

    for (const event of events) {
      if (event.hidden || !event.title || !event.start_at) continue;
      const courseId = Number(event.context_code?.replace("course_", ""));
      if (!wanted.has(courseId)) continue;
      items.push({
        key: `event:${event.id}`,
        kind: "event",
        title: event.title,
        description: event.description ?? "",
        dueAt: event.start_at,
        courseId,
        courseName: names.get(courseId) ?? "",
        htmlUrl: event.html_url ?? `${baseUrl}/calendar`,
        pointsPossible: null,
        submitted: false,
      });
    }
  }

  return items.sort(byDueDate);
}

function assignmentKind(assignment: RawAssignment): CanvasItem["kind"] {
  const types = assignment.submission_types ?? [];
  if (types.includes("online_quiz")) return "quiz";
  if (types.includes("discussion_topic")) return "discussion";
  return "assignment";
}

function isSubmitted(assignment: RawAssignment): boolean {
  const submission = assignment.submission;
  if (!submission) return false;
  if (submission.submitted_at) return true;
  return submission.workflow_state === "graded" || submission.workflow_state === "complete";
}

function byDueDate(a: CanvasItem, b: CanvasItem): number {
  if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
  if (a.dueAt !== b.dueAt) return a.dueAt ? -1 : 1;
  return a.title.localeCompare(b.title);
}

function isoDate(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
