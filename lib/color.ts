/**
 * Colour maths for the custom theme.
 *
 * Works in OKLab/OKLCH rather than HSL: lightness there is perceptually even,
 * so "make this 20% lighter" behaves the same for a yellow as for a navy.
 * HSL would hand back a washed-out yellow and a barely-changed navy.
 *
 * Plain TypeScript with no React or DOM, so `npm test` exercises it directly.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Oklch {
  /** Perceptual lightness, 0–1. */
  l: number;
  /** Chroma; ~0 is grey, ~0.37 is the most saturated sRGB can hold. */
  c: number;
  /** Hue in degrees, 0–360. */
  h: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/* ---------------------------------------------------------------- parsing */

export function parseHex(input: string): Rgb | null {
  const hex = input.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex.split("").map((c) => c + c).join("")
      : hex.length === 6
        ? hex
        : null;
  if (!full || !/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (value: number) =>
    clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function isValidHex(input: string): boolean {
  return parseHex(input) !== null;
}

/* ------------------------------------------------------------- sRGB ↔ OKLab */

const linearize = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const delinearize = (channel: number) => {
  const c = channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
  return clamp(c * 255, 0, 255);
};

export function rgbToOklch(rgb: Rgb): Oklch {
  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.sqrt(okA * okA + okB * okB);
  const h = c < 1e-6 ? 0 : ((Math.atan2(okB, okA) * 180) / Math.PI + 360) % 360;
  return { l: okL, c, h };
}

export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const okA = c * Math.cos(rad);
  const okB = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * okA + 0.2158037573 * okB) ** 3;
  const m_ = (l - 0.1055613458 * okA - 0.0638541728 * okB) ** 3;
  const s_ = (l - 0.0894841775 * okA - 1.291485548 * okB) ** 3;

  return {
    r: delinearize(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    g: delinearize(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    b: delinearize(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  };
}

export const hexToOklch = (hex: string): Oklch | null => {
  const rgb = parseHex(hex);
  return rgb ? rgbToOklch(rgb) : null;
};

export const oklchToHex = (value: Oklch): string => toHex(oklchToRgb(value));

/**
 * Builds a hex from OKLCH, reducing chroma until the result survives the round
 * trip back through sRGB. Without this, a high-chroma request silently clips to
 * a different hue.
 */
export function oklchToHexInGamut(value: Oklch): string {
  let { c } = value;
  for (let i = 0; i < 24; i += 1) {
    const hex = oklchToHex({ ...value, c });
    const back = hexToOklch(hex);
    if (!back) break;
    const drift = Math.abs(back.l - value.l) + Math.abs(back.c - c);
    if (drift < 0.012 || c <= 0.005) return hex;
    c *= 0.88;
  }
  return oklchToHex({ ...value, c });
}

/* ------------------------------------------------------------- contrast */

/** WCAG relative luminance. */
export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG contrast ratio, 1–21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** Whichever of black or white reads better on `background`. */
export function readableTextOn(background: string): string {
  const rgb = parseHex(background);
  if (!rgb) return "#ffffff";
  const onWhite = contrastRatio(rgb, { r: 255, g: 255, b: 255 });
  const onBlack = contrastRatio(rgb, { r: 12, g: 14, b: 18 });
  return onBlack >= onWhite ? "#0c0e12" : "#ffffff";
}

/* --------------------------------------------------------- theme building */

export interface ThemeTokens {
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentText: string;
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  borderStrong: string;
}

/** Neutral bases the tint is applied to, matching the stock palette. */
const LIGHT_BASE = {
  bg: 0.972,
  surface: 1,
  surface2: 0.955,
  surface3: 0.923,
  border: 0.912,
  borderStrong: 0.85,
} as const;

const DARK_BASE = {
  bg: 0.163,
  surface: 0.194,
  surface2: 0.223,
  surface3: 0.26,
  border: 0.257,
  borderStrong: 0.328,
} as const;

/**
 * Derives a full token set from one seed colour.
 *
 * The accent is pinned to a fixed lightness per mode so any seed — a pale sky
 * or a near-black navy — lands somewhere usable, keeping only its hue and a
 * capped chroma. Surfaces get a whisper of the same hue (chroma ≤ 0.012) so the
 * app feels tinted without turning the text background coloured.
 */
export function buildTheme(seedHex: string, mode: "light" | "dark"): ThemeTokens | null {
  const seed = hexToOklch(seedHex);
  if (!seed) return null;

  const dark = mode === "dark";
  const hue = seed.h;
  // A grey seed should stay grey rather than acquire an arbitrary hue.
  const chroma = Math.min(seed.c, dark ? 0.15 : 0.17);
  const tint = Math.min(chroma * 0.08, 0.012);

  const accent = oklchToHexInGamut({ l: dark ? 0.72 : 0.53, c: chroma, h: hue });
  const base = dark ? DARK_BASE : LIGHT_BASE;
  const surfaceTint = (l: number, scale = 1) =>
    oklchToHexInGamut({ l, c: tint * scale, h: hue });

  return {
    accent,
    accentHover: oklchToHexInGamut({
      l: dark ? 0.78 : 0.46,
      c: chroma,
      h: hue,
    }),
    accentSoft: oklchToHexInGamut({
      l: dark ? 0.26 : 0.945,
      c: Math.min(chroma * (dark ? 0.55 : 0.35), dark ? 0.06 : 0.05),
      h: hue,
    }),
    accentText: readableTextOn(accent),
    bg: surfaceTint(base.bg),
    surface: surfaceTint(base.surface, dark ? 1 : 0.4),
    surface2: surfaceTint(base.surface2),
    surface3: surfaceTint(base.surface3),
    border: surfaceTint(base.border),
    borderStrong: surfaceTint(base.borderStrong),
  };
}

/** The CSS custom properties `buildTheme` maps onto. */
export function themeToCssVars(tokens: ThemeTokens): Record<string, string> {
  return {
    "--accent": tokens.accent,
    "--accent-hover": tokens.accentHover,
    "--accent-soft": tokens.accentSoft,
    "--accent-text": tokens.accentText,
    "--bg": tokens.bg,
    "--surface": tokens.surface,
    "--surface-2": tokens.surface2,
    "--surface-3": tokens.surface3,
    "--border": tokens.border,
    "--border-strong": tokens.borderStrong,
  };
}
