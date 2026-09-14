/**
 * Assembles what the desktop app ships: the Next standalone server plus the
 * static assets it serves, staged into `desktop/app` so both `npm run
 * desktop:start` and electron-builder read the exact same layout.
 */
import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const staticDir = path.join(root, ".next", "static");
const target = path.join(root, "desktop", "app");

async function exists(candidate) {
  try {
    await stat(candidate);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(standalone))) {
  console.error(
    "Missing .next/standalone — run `npm run build` first (next.config.ts sets output: \"standalone\").",
  );
  process.exit(1);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

// The server itself, with its traced node_modules.
await cp(standalone, target, { recursive: true });

// Client chunks and CSS, which the standalone output deliberately leaves out.
await cp(staticDir, path.join(target, ".next", "static"), { recursive: true });

// Anything in public/, if the project ever grows some.
const publicDir = path.join(root, "public");
if (await exists(publicDir)) {
  await cp(publicDir, path.join(target, "public"), { recursive: true });
}

console.log(`Staged desktop server at ${path.relative(root, target)}`);
