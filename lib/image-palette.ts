"use client";

import { rgbToOklch, toHex, type Rgb } from "./color";

/**
 * Pulls a small set of representative colours out of an image, in the browser.
 *
 * Deliberately not a k-means: a coarse 3D histogram over a downsampled copy is
 * far cheaper, runs comfortably on a phone, and for "what colours is this
 * picture" it gives the same answer. Buckets are scored by population weighted
 * towards chroma, because the eye reads a photo's few saturated pixels as its
 * colour long before it reads the grey mass behind them.
 */

/** How many levels per channel; 5 bits would over-split, 3 would flatten. */
const BITS = 4;
const LEVELS = 1 << BITS;
/** Long edge of the copy actually sampled. */
const SAMPLE_SIZE = 96;

interface Bucket {
  count: number;
  r: number;
  g: number;
  b: number;
}

export interface ExtractedPalette {
  /** Best accent candidate: vivid, and actually present in the image. */
  seed: string;
  /** A handful of distinct colours, most prominent first. */
  swatches: string[];
  /** Average lightness of the image, 0–1 — used to pick a readable scrim. */
  averageLightness: number;
}

/** Shortest angular distance between two hues, 0–180 degrees. */
function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image could not be read."));
    image.src = src;
  });
}

export async function extractPalette(dataUrl: string): Promise<ExtractedPalette> {
  const image = await loadImage(dataUrl);

  const scale = Math.min(SAMPLE_SIZE / image.width, SAMPLE_SIZE / image.height, 1);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Your browser blocked reading the image.");
  context.drawImage(image, 0, 0, width, height);

  const { data } = context.getImageData(0, 0, width, height);
  const buckets = new Map<number, Bucket>();
  let lightnessTotal = 0;
  let sampled = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 125) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const key =
      ((r >> (8 - BITS)) << (BITS * 2)) |
      ((g >> (8 - BITS)) << BITS) |
      (b >> (8 - BITS));

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }

    lightnessTotal += rgbToOklch({ r, g, b }).l;
    sampled += 1;
  }

  if (sampled === 0) throw new Error("That image appears to be empty.");

  const candidates = [...buckets.values()]
    .map((bucket) => {
      const rgb: Rgb = {
        r: bucket.r / bucket.count,
        g: bucket.g / bucket.count,
        b: bucket.b / bucket.count,
      };
      const { l, c, h } = rgbToOklch(rgb);
      const share = bucket.count / sampled;
      // Mid-lightness colours make usable accents; the near-black and
      // near-white ends of a photo do not.
      const usable = Math.min(l / 0.25, (1 - l) / 0.2, 1);
      return {
        hex: toHex(rgb),
        share,
        chroma: c,
        lightness: l,
        hue: h,
        score: share * (0.25 + Math.min(c, 0.2) * 6) * Math.max(usable, 0.05),
      };
    })
    .sort((a, b) => b.score - a.score);

  // Keep the list visually distinct — near-duplicates read as one colour.
  const swatches: typeof candidates = [];
  for (const candidate of candidates) {
    const tooClose = swatches.some((kept) => {
      const sameHue = hueDistance(kept.hue, candidate.hue) < 22;
      const bothGrey = kept.chroma < 0.03 && candidate.chroma < 0.03;
      return (
        (bothGrey || sameHue) && Math.abs(kept.lightness - candidate.lightness) < 0.1
      );
    });
    if (!tooClose) swatches.push(candidate);
    if (swatches.length >= 6) break;
  }

  // Prefer a colourful seed, but never invent one the image doesn't contain.
  const vivid = swatches.filter((s) => s.chroma >= 0.045);
  const seed = (vivid[0] ?? swatches[0] ?? candidates[0]).hex;

  return {
    seed,
    swatches: swatches.map((s) => s.hex),
    averageLightness: lightnessTotal / sampled,
  };
}
