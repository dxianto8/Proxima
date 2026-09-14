# Proxima

A task tracker for coursework: a calendar, a quick-capture box that understands
plain English, and one-click import of your assignments from Canvas
(Instructure).

Everything lives in your browser. There is no Proxima account, no server-side
database, and your Canvas token never leaves your machine except to reach your
own Canvas host.

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Importing from Canvas

1. In Canvas, go to **Account → Settings → Approved Integrations → New Access
   Token**. Give it a purpose ("Proxima") and copy the token — Canvas shows it
   once.
2. In Proxima, open **Settings → Canvas**, enter your institution's address
   (for example `myschool.instructure.com`) and paste the token, then
   **Connect to Canvas**.
3. Tick the courses you want to follow and choose **Fetch assignments**.
4. A preview lists everything found, grouped by course. By default it hides
   work that is already past due or already submitted, and marks submitted
   items as done. Adjust, then **Import**.

Press **Sync now** later to pick up new assignments and changed due dates.
Re-syncing matches on the Canvas item id, so it updates tasks in place rather
than duplicating them — and it leaves your own edits (notes, priority,
estimate, and a status you set by hand) alone.

### What gets imported

Assignments, quizzes and graded discussions for the courses you select, with
their due date, point value and submission status. Course calendar events —
lectures, labs, review sessions — are off by default; turn them on with the
**Include course calendar events** switch.

### Pre-configuring the connection

For a self-hosted or shared install, copy `.env.example` to `.env.local` and
set `CANVAS_BASE_URL` (and optionally `CANVAS_ACCESS_TOKEN`). The Settings page
picks these up and skips asking for what is already configured. These are read
on the server only.

## Quick add

The capture box at the top of most pages parses as you type, and shows you what
it understood before you commit:

```
Essay draft #astr friday 5pm !high ~2h
```

| Syntax | Meaning |
| --- | --- |
| `today`, `tomorrow`, `friday`, `next friday`, `in 3 days`, `sep 20`, `9/20`, `2026-12-01` | Due date |
| `5pm`, `5:30pm`, `at 14:45`, `noon`, `midnight` | Due time |
| `#astr` or `@math` | Course, matched on its code or name |
| `!high`, `!!`, `!low` | Priority |
| `~90m`, `~2h` | Time estimate |

Anything it doesn't recognise stays in the title, so typing an ordinary
sentence always works.

## Around the app

- **Today** — what's overdue, what's due today, and what you've already closed out.
- **Upcoming** — the next 7, 14 or 30 days, grouped by day.
- **All tasks** — search and filter by course, priority and status.
- **Calendar** — month and week views. Drag a task onto another day to
  reschedule it; the time of day is preserved.
- **Courses** — colour-coded groups with progress. Canvas courses appear here
  automatically after a sync.

Keyboard: `N` for a new task, `/` to search, `Enter` to add what you're typing,
`Esc` to close a panel.

## Your data

Tasks, courses and the Canvas connection are stored in this browser's
`localStorage` under `proxima.data.v1`. That means it is fast and private, but
it does not follow you to another browser or machine, and clearing site data
clears it. **Settings → Your data** exports a JSON backup and restores one.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (`node --test`) |
| `npm run check` | Typecheck, then tests |

## How it fits together

```
app/
  today/ upcoming/ tasks/ calendar/ courses/ settings/   pages (client-rendered)
  api/canvas/                                            Canvas proxy routes
components/                                              UI, calendar, Canvas panel
lib/
  store.tsx      the localStorage-backed store and its actions
  canvas.ts      Canvas REST client: pagination, normalising, error messages
  parse.ts       the quick-add parser
  selectors.ts   filtering, sorting, grouping, summaries
  date.ts        local-time date helpers
tests/                                                   unit tests
```

The Canvas calls go through `app/api/canvas/*` rather than straight from the
browser for two reasons: Canvas sends no CORS headers for token auth, so a
direct request would be blocked, and this keeps the token out of a
cross-origin request. The routes hold nothing — credentials arrive with each
request and are forwarded to your Canvas host.

Built with Next.js, React and Tailwind CSS.
