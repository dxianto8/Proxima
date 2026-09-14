<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Proxima

A local-first coursework task tracker: tasks, a calendar, and Canvas
(Instructure) import. See `README.md` for the user-facing tour.

## Shape of the app

- **All state lives in the browser.** `lib/store.tsx` is a React context backed
  by one `localStorage` key (`proxima.data.v1`). There is no database. Pages
  render an empty store on the server and gate real UI on `hydrated`, which is
  what keeps hydration matching — keep that pattern when adding a page.
- **Two server routes only**, under `app/api/canvas/`. They proxy Canvas
  because Canvas sends no CORS headers for token auth. They store nothing:
  credentials arrive per request, with `CANVAS_BASE_URL` / `CANVAS_ACCESS_TOKEN`
  as fallbacks.
- **`lib/` is plain TypeScript with no React**, so `npm test` can exercise it
  directly through `node --test`. Keep it that way — a React import in `lib/`
  (other than `store.tsx`) breaks the test path.

## Conventions

- Colours come from the CSS custom properties in `app/globals.css`, surfaced as
  Tailwind utilities (`bg-surface`, `text-muted`, `border-border`). Don't reach
  for raw Tailwind palette classes — they won't follow the theme.
- Dark mode is `data-theme="dark"` on `<html>`, set before paint by
  `ThemeScript`. The `dark:` variant is redefined in `globals.css` to match.
- Course colours are one hex each (`lib/colors.ts`); tints are derived at render
  time with `color-mix` via `accentVars()`.
- Dates are local-time throughout. Canvas hands back UTC ISO strings and they're
  converted once, in `lib/date.ts`.

## Theming

`lib/color.ts` derives a whole palette from one seed colour, in OKLab rather
than HSL so lightness moves evenly across hues. `buildTheme` pins the accent to
a fixed lightness per mode and keeps only the seed's hue with capped chroma, so
any seed — a pale sky or a near-black navy — lands somewhere usable. Surfaces
get chroma of at most 0.015; anything more and body text starts sitting on a
coloured ground.

Derived themes are stored as precomputed CSS-variable maps for both modes, not
as a seed, so `ThemeScript` can apply them before first paint without running
colour maths inline. If you add a themed variable, add it to `THEMED_VARS` in
`components/theme.tsx` too — that list is what gets cleared when someone resets.

The background image lives under its own localStorage key
(`lib/background-store.ts`), never inside the main data blob: a photo is orders
of magnitude larger than everything else, and a quota failure while saving a
wallpaper must not be able to cost someone their tasks.

## Checks

`npm run check` runs the typechecker and the unit tests. `npm run build` must
pass before pushing.

## Desktop build

`npm run desktop:prepare` builds Next in `standalone` mode and stages the
server into `desktop/app`; `desktop/main.js` forks it on a random loopback port
and points a BrowserWindow at it. There is deliberately no second rendering
path — the desktop app runs the same routes and the same Canvas proxy as the
web app.

Two packaging constraints worth knowing before editing `electron-builder.yml`:

- `files` must keep `!node_modules/**`. The Electron shell needs no npm
  packages, and without the exclusion electron-builder packs every production
  dependency into the asar a second time (~200MB).
- The staged server is copied by `scripts/after-pack.js`, not by
  `extraResources`, because electron-builder strips `node_modules` out of
  anything `extraResources` copies — which would ship `server.js` with no
  dependencies. The hook fails loudly if the copy comes out wrong.

macOS installers can only be produced on macOS; `.github/workflows/release-mac.yml`
builds them on a `macos-14` runner.
