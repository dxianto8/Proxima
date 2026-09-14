import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { CanvasError, fetchCourses, fetchItems, normalizeBaseUrl } from "../lib/canvas.ts";

const BASE = "https://school.instructure.com";
const TOKEN = "test-token";

type Route = { body: unknown; status?: number; nextLink?: string };

const realFetch = globalThis.fetch;
let routes = new Map<string, Route>();
let requests: string[] = [];

/** Serves `routes` by pathname+search, so tests describe Canvas, not HTTP. */
function stubFetch() {
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input);
    requests.push(url);
    const { pathname } = new URL(url);
    const route =
      routes.get(url) ?? routes.get(pathname) ?? { body: [], status: 200 };
    const headers = new Headers({ "content-type": "application/json" });
    if (route.nextLink) headers.set("link", `<${route.nextLink}>; rel="next"`);
    return new Response(JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers,
    });
  }) as typeof fetch;
}

beforeEach(() => {
  routes = new Map();
  requests = [];
  stubFetch();
});

after(() => {
  globalThis.fetch = realFetch;
});

describe("normalizeBaseUrl", () => {
  it("accepts a bare hostname and returns an https origin", () => {
    assert.equal(normalizeBaseUrl("school.instructure.com"), BASE);
  });

  it("strips paths and trailing slashes", () => {
    assert.equal(normalizeBaseUrl("https://school.instructure.com/courses/1/"), BASE);
  });

  it("rejects plain http", () => {
    assert.throws(() => normalizeBaseUrl("http://school.instructure.com"), CanvasError);
  });

  it("rejects loopback and private hosts", () => {
    for (const host of ["localhost", "127.0.0.1", "10.0.0.4", "192.168.1.9", "172.16.0.1"]) {
      assert.throws(() => normalizeBaseUrl(host), CanvasError, `expected ${host} to be blocked`);
    }
  });

  it("rejects an empty address", () => {
    assert.throws(() => normalizeBaseUrl("   "), CanvasError);
  });
});

describe("fetchCourses", () => {
  it("normalizes, filters restricted courses, and sorts by name", async () => {
    routes.set("/api/v1/courses", {
      body: [
        { id: 2, name: "Zoology", course_code: "BIO 110", term: { name: "Fall 2026" } },
        { id: 1, name: "Astrophysics", course_code: "ASTR 201" },
        { id: 3, name: "Hidden", access_restricted_by_date: true },
        { id: 4 },
      ],
    });

    const courses = await fetchCourses(BASE, TOKEN);

    assert.deepEqual(courses, [
      { id: 1, name: "Astrophysics", courseCode: "ASTR 201", term: null },
      { id: 2, name: "Zoology", courseCode: "BIO 110", term: "Fall 2026" },
    ]);
  });

  it("sends the token as a bearer header", async () => {
    routes.set("/api/v1/courses", { body: [] });
    await fetchCourses(BASE, TOKEN);
    assert.ok(requests[0].startsWith(`${BASE}/api/v1/courses?`));
  });

  it("follows RFC 5988 Link pagination", async () => {
    const page2 = `${BASE}/api/v1/courses?page=2`;
    routes.set(`${BASE}/api/v1/courses?enrollment_state=active&state%5B%5D=available&include%5B%5D=term&per_page=100`, {
      body: [{ id: 1, name: "One" }],
      nextLink: page2,
    });
    routes.set(page2, { body: [{ id: 2, name: "Two" }] });

    const courses = await fetchCourses(BASE, TOKEN);
    assert.deepEqual(courses.map((c) => c.id), [1, 2]);
    assert.equal(requests.length, 2);
  });

  it("turns a 401 into an actionable message", async () => {
    routes.set("/api/v1/courses", { body: { errors: [] }, status: 401 });
    await assert.rejects(fetchCourses(BASE, TOKEN), (error: CanvasError) => {
      assert.equal(error.status, 401);
      assert.match(error.message, /rejected that access token/i);
      assert.match(error.hint ?? "", /New Access Token/);
      return true;
    });
  });

  it("reports an unreachable host instead of leaking the network error", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("getaddrinfo ENOTFOUND");
    }) as typeof fetch;
    await assert.rejects(fetchCourses(BASE, TOKEN), (error: CanvasError) => {
      assert.match(error.message, /Could not reach Canvas/);
      return true;
    });
  });
});

describe("fetchItems", () => {
  const courses = [
    { id: 1, name: "Astrophysics", course_code: "ASTR 201" },
    { id: 2, name: "Linear Algebra", course_code: "MATH 254" },
  ];

  beforeEach(() => {
    routes.set("/api/v1/courses", { body: courses });
  });

  it("only fetches the courses the user selected", async () => {
    routes.set("/api/v1/courses/1/assignments", { body: [] });
    await fetchItems(BASE, TOKEN, { courseIds: [1] });
    assert.ok(requests.some((url) => url.includes("/courses/1/assignments")));
    assert.ok(!requests.some((url) => url.includes("/courses/2/assignments")));
  });

  it("returns nothing when no selected course is visible", async () => {
    const items = await fetchItems(BASE, TOKEN, { courseIds: [99] });
    assert.deepEqual(items, []);
  });

  it("maps assignments, quizzes and discussions to stable keys", async () => {
    routes.set("/api/v1/courses/1/assignments", {
      body: [
        {
          id: 10,
          name: "Lab report",
          description: "<p>Bring the <b>calibration</b> table</p>",
          due_at: "2026-09-20T23:59:00Z",
          html_url: "https://school.instructure.com/courses/1/assignments/10",
          points_possible: 40,
          submission_types: ["online_upload"],
        },
        { id: 11, name: "Quiz 4", submission_types: ["online_quiz"], due_at: null },
        { id: 12, name: "Week 3 thread", submission_types: ["discussion_topic"] },
        { id: 13, name: "Unpublished draft", published: false },
        { id: 14 },
      ],
    });

    const items = await fetchItems(BASE, TOKEN, { courseIds: [1] });

    assert.deepEqual(
      items.map((item) => [item.key, item.kind]),
      // Dated work first, then the undated pair alphabetically.
      [
        ["assignment:10", "assignment"],
        ["assignment:11", "quiz"],
        ["assignment:12", "discussion"],
      ],
    );
    const lab = items.find((item) => item.key === "assignment:10");
    assert.equal(lab?.pointsPossible, 40);
    assert.equal(lab?.courseName, "ASTR 201");
    assert.equal(lab?.dueAt, "2026-09-20T23:59:00Z");
  });

  it("sorts dated work first, then undated alphabetically", async () => {
    routes.set("/api/v1/courses/1/assignments", {
      body: [
        { id: 1, name: "Later", due_at: "2026-10-01T00:00:00Z" },
        { id: 2, name: "Zebra", due_at: null },
        { id: 3, name: "Sooner", due_at: "2026-09-01T00:00:00Z" },
        { id: 4, name: "Apple", due_at: null },
      ],
    });
    const items = await fetchItems(BASE, TOKEN, { courseIds: [1] });
    assert.deepEqual(items.map((i) => i.title), ["Sooner", "Later", "Apple", "Zebra"]);
  });

  it("detects submitted work from the submission include", async () => {
    routes.set("/api/v1/courses/1/assignments", {
      body: [
        { id: 1, name: "Turned in", submission: { submitted_at: "2026-09-01T10:00:00Z" } },
        { id: 2, name: "Graded", submission: { workflow_state: "graded" } },
        { id: 3, name: "Untouched", submission: { workflow_state: "unsubmitted" } },
        { id: 4, name: "No submission data" },
      ],
    });
    const items = await fetchItems(BASE, TOKEN, { courseIds: [1] });
    const submitted = Object.fromEntries(items.map((i) => [i.title, i.submitted]));
    assert.deepEqual(submitted, {
      "Turned in": true,
      Graded: true,
      Untouched: false,
      "No submission data": false,
    });
  });

  it("keeps going when one course's assignments fail", async () => {
    routes.set("/api/v1/courses/1/assignments", { body: { errors: [] }, status: 403 });
    routes.set("/api/v1/courses/2/assignments", { body: [{ id: 7, name: "Problem set" }] });

    const items = await fetchItems(BASE, TOKEN, { courseIds: [1, 2] });
    assert.deepEqual(items.map((i) => i.title), ["Problem set"]);
  });

  it("skips calendar events unless asked for them", async () => {
    routes.set("/api/v1/courses/1/assignments", { body: [] });
    routes.set("/api/v1/calendar_events", {
      body: [
        {
          id: 5,
          title: "Observation night",
          start_at: "2026-09-25T02:00:00Z",
          context_code: "course_1",
        },
        { id: 6, title: "Hidden", start_at: "2026-09-26T02:00:00Z", context_code: "course_1", hidden: true },
        { id: 7, title: "Other course", start_at: "2026-09-27T02:00:00Z", context_code: "course_9" },
      ],
    });

    const without = await fetchItems(BASE, TOKEN, { courseIds: [1] });
    assert.equal(without.length, 0);

    const withEvents = await fetchItems(BASE, TOKEN, { courseIds: [1], includeEvents: true });
    assert.deepEqual(
      withEvents.map((i) => [i.key, i.kind]),
      [["event:5", "event"]],
    );
  });
});
