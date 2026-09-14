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

Press **Sync now** later to pick up new assignments and changed due dates — or
use the refresh button in the top bar, which runs the same sync from wherever
you are. It appears once a connection is saved.
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

## The Mac app

Proxima also ships as a desktop app. It's the same application, bundled with
its own server so it runs offline with no terminal and no browser tab.

### Download

Installers are built by GitHub Actions on a macOS runner:

- **Tagged release** — push a tag (`git tag v0.1.0 && git push origin v0.1.0`)
  and the workflow publishes a GitHub release with `Proxima-0.1.0-arm64.dmg`
  (Apple silicon) and `Proxima-0.1.0-x64.dmg` (Intel) attached.
- **Without tagging** — run **Build macOS app** from the repository's Actions
  tab and download the `proxima-macos` artifact from the finished run.

Open the `.dmg` and drag Proxima to Applications.

### First launch

The app is **not code-signed** — that needs a paid Apple Developer ID — so
macOS will refuse to open it the first time, reporting that it is damaged or
from an unidentified developer. This is Gatekeeper reacting to the missing
signature, not to anything wrong with the app. To get past it:

**System Settings → Privacy & Security**, scroll to the bottom, and choose
**Open Anyway** next to the Proxima message, or from a terminal:

```bash
xattr -dr com.apple.quarantine /Applications/Proxima.app
```

You only have to do this once. If you have a Developer ID, set
`CSC_LINK` / `CSC_KEY_PASSWORD` in the workflow and remove `identity: null`
from `electron-builder.yml` to ship a signed build instead.

Requires macOS 11 Big Sur or newer.

### Building it yourself

```bash
npm run desktop:prepare   # build Next, stage the server under desktop/app
npm run desktop:start     # run the desktop app against that bundle
npm run desktop:mac       # produce release/*.dmg (macOS only)
```

`npm run desktop:pack` builds an unpacked bundle for the current platform,
which is handy for checking packaging without making an installer.

### How the desktop build works

`next.config.ts` emits a `standalone` server. `scripts/prepare-desktop.mjs`
stages that server plus the client assets into `desktop/app`, and
`desktop/main.js` starts it on a random loopback port and points a window at
it. Nothing listens on a public interface, and no second rendering path exists
— the desktop app runs exactly the code the web app runs, including the Canvas
proxy routes.

The trade-off is size: bundling Electron and a Node server puts the download
around 100–130 MB. The alternative — exporting a static site and rewriting the
Canvas calls to run in Electron's main process — would be far smaller but would
mean two versions of the integration to keep in step.

Native menu items work as you'd expect: ⌘N for a new task, ⌘F to search,
⌘1–⌘5 to switch views, and ⌘⇧S to sync with Canvas.

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
  automatically after a sync. Right-click one in the sidebar to open it, add a
  task to it, edit, archive or delete it.

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
| `npm run desktop:prepare` | Build and stage the bundle the desktop app runs |
| `npm run desktop:start` | Launch the desktop app against that bundle |
| `npm run desktop:mac` | Build `release/*.dmg` (macOS only) |
| `npm run icon` | Regenerate `build/icon.png` |

## How it fits together

```
app/
  today/ upcoming/ tasks/ calendar/ courses/ settings/   pages (client-rendered)
  api/canvas/                                            Canvas proxy routes
components/                                              UI, calendar, Canvas panel
desktop/
  main.js        Electron main: runs the bundled server, window, native menu
  preload.js     the only renderer bridge (platform + menu commands)
lib/
  store.tsx      the localStorage-backed store and its actions
  canvas.ts      Canvas REST client: pagination, normalising, error messages
  parse.ts       the quick-add parser
  selectors.ts   filtering, sorting, grouping, summaries
  date.ts        local-time date helpers
tests/                                                   unit tests
scripts/                                                 icon, desktop staging, packaging hook
```

The Canvas calls go through `app/api/canvas/*` rather than straight from the
browser for two reasons: Canvas sends no CORS headers for token auth, so a
direct request would be blocked, and this keeps the token out of a
cross-origin request. The routes hold nothing — credentials arrive with each
request and are forwarded to your Canvas host.

Built with Next.js, React and Tailwind CSS.
