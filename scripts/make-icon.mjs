/**
 * Renders the app icon to build/icon.png at 1024x1024. electron-builder turns
 * that into the .icns / .ico the platform installers want.
 *
 * The artwork follows Apple's template: the mark sits inside a rounded square
 * inset from the canvas edge, leaving the margin macOS expects.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const SIZE = 1024;
const INSET = 100; // transparent margin macOS icons are drawn with
const BOX = SIZE - INSET * 2;
const RADIUS = BOX * 0.2237; // the Big Sur squircle proportion

const html = `<!doctype html>
<style>
  html, body { margin: 0; width: ${SIZE}px; height: ${SIZE}px; background: transparent; }
</style>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6b74e4"/>
      <stop offset="55%" stop-color="#4b56d2"/>
      <stop offset="100%" stop-color="#3a43b4"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="22" flood-color="#141a3a" flood-opacity="0.30"/>
    </filter>
  </defs>

  <g filter="url(#drop)">
    <rect x="${INSET}" y="${INSET}" width="${BOX}" height="${BOX}" rx="${RADIUS}" fill="url(#bg)"/>
    <rect x="${INSET}" y="${INSET}" width="${BOX}" height="${BOX}" rx="${RADIUS}" fill="url(#sheen)"/>
  </g>

  <!-- The four-point spark from the in-app logo, scaled to the icon grid. -->
  <g transform="translate(${SIZE / 2} ${SIZE / 2}) scale(19.5) translate(-12 -12)">
    <path
      d="M12 2.5 14.2 9l6.3 2.2-6.3 2.2L12 20l-2.2-6.6L3.5 11.2 9.8 9 12 2.5Z"
      fill="#ffffff"
      stroke="#ffffff"
      stroke-width="0.9"
      stroke-linejoin="round"
    />
  </g>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: SIZE, height: SIZE },
  deviceScaleFactor: 1,
});
await page.setContent(html);
const png = await page.screenshot({ omitBackground: true });
await browser.close();

const out = path.join(process.cwd(), "build", "icon.png");
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, png);
console.log(`Wrote ${path.relative(process.cwd(), out)} (${SIZE}x${SIZE})`);
