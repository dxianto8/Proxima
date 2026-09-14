import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTheme,
  contrastRatio,
  hexToOklch,
  isValidHex,
  oklchToHexInGamut,
  parseHex,
  readableTextOn,
  rgbToOklch,
  themeToCssVars,
  toHex,
} from "../lib/color.ts";

const rgb = (hex: string) => {
  const value = parseHex(hex);
  assert.ok(value, `${hex} should parse`);
  return value;
};

describe("hex parsing", () => {
  it("accepts long, short and unprefixed forms", () => {
    assert.deepEqual(parseHex("#4b56d2"), { r: 75, g: 86, b: 210 });
    assert.deepEqual(parseHex("4b56d2"), { r: 75, g: 86, b: 210 });
    assert.deepEqual(parseHex("#abc"), { r: 170, g: 187, b: 204 });
    assert.deepEqual(parseHex("  #FFF  "), { r: 255, g: 255, b: 255 });
  });

  it("rejects anything that isn't a hex colour", () => {
    for (const bad of ["", "#12345", "#gggggg", "rgb(1,2,3)", "#1234567"]) {
      assert.equal(parseHex(bad), null, `${bad} should be rejected`);
      assert.equal(isValidHex(bad), false);
    }
  });

  it("round-trips through toHex", () => {
    for (const hex of ["#000000", "#ffffff", "#4b56d2", "#149080"]) {
      assert.equal(toHex(rgb(hex)), hex);
    }
  });
});

describe("OKLCH conversion", () => {
  it("puts black and white at the ends of the lightness range", () => {
    assert.ok(rgbToOklch({ r: 0, g: 0, b: 0 }).l < 0.001);
    assert.ok(rgbToOklch({ r: 255, g: 255, b: 255 }).l > 0.999);
  });

  it("reports greys as having no chroma", () => {
    for (const value of [0, 60, 128, 200, 255]) {
      assert.ok(
        rgbToOklch({ r: value, g: value, b: value }).c < 0.002,
        `grey ${value} should be achromatic`,
      );
    }
  });

  it("places primaries at their expected hues", () => {
    const hue = (hex: string) => hexToOklch(hex)!.h;
    assert.ok(Math.abs(hue("#ff0000") - 29) < 8, "red sits near 29°");
    assert.ok(Math.abs(hue("#00ff00") - 142) < 8, "green sits near 142°");
    assert.ok(Math.abs(hue("#0000ff") - 264) < 8, "blue sits near 264°");
  });

  it("survives a hex → OKLCH → hex round trip", () => {
    for (const hex of ["#4b56d2", "#149080", "#cc6520", "#c44a8e", "#5f6b7a"]) {
      const back = oklchToHexInGamut(hexToOklch(hex)!);
      const a = rgb(hex);
      const b = rgb(back);
      const drift = Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
      assert.ok(drift <= 3, `${hex} drifted to ${back}`);
    }
  });
});

describe("contrast", () => {
  it("matches the known black-on-white ratio", () => {
    const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    assert.ok(Math.abs(ratio - 21) < 0.01);
  });

  it("is 1 for a colour against itself, and order-independent", () => {
    assert.ok(Math.abs(contrastRatio(rgb("#4b56d2"), rgb("#4b56d2")) - 1) < 1e-9);
    assert.equal(
      contrastRatio(rgb("#000000"), rgb("#ffffff")),
      contrastRatio(rgb("#ffffff"), rgb("#000000")),
    );
  });

  it("picks the more readable of black or white", () => {
    assert.equal(readableTextOn("#ffffff"), "#0c0e12");
    assert.equal(readableTextOn("#000000"), "#ffffff");
    assert.equal(readableTextOn("#f5d90a"), "#0c0e12", "yellow wants dark text");
    assert.equal(readableTextOn("#1a1f6e"), "#ffffff", "navy wants light text");
  });
});

describe("buildTheme", () => {
  const seeds = ["#4b56d2", "#149080", "#cc6520", "#f5d90a", "#0b0d2a", "#f2f4f8", "#808080"];

  it("rejects an unparseable seed", () => {
    assert.equal(buildTheme("nope", "light"), null);
  });

  it("keeps accent text readable on the accent, for every seed and mode", () => {
    for (const seed of seeds) {
      for (const mode of ["light", "dark"] as const) {
        const theme = buildTheme(seed, mode)!;
        const ratio = contrastRatio(rgb(theme.accent), rgb(theme.accentText));
        assert.ok(
          ratio >= 4.5,
          `${seed} ${mode}: accent ${theme.accent} vs text ${theme.accentText} was ${ratio.toFixed(2)}`,
        );
      }
    }
  });

  it("normalises extreme seeds to a usable accent lightness", () => {
    // A near-black and a near-white seed must both yield a visible accent.
    for (const seed of ["#0b0d2a", "#f2f4f8"]) {
      const light = hexToOklch(buildTheme(seed, "light")!.accent)!;
      const dark = hexToOklch(buildTheme(seed, "dark")!.accent)!;
      assert.ok(light.l > 0.4 && light.l < 0.68, `light accent l=${light.l.toFixed(2)}`);
      assert.ok(dark.l > 0.6 && dark.l < 0.85, `dark accent l=${dark.l.toFixed(2)}`);
    }
  });

  it("keeps the seed's hue", () => {
    for (const seed of ["#149080", "#cc6520", "#c44a8e"]) {
      const seedHue = hexToOklch(seed)!.h;
      const accentHue = hexToOklch(buildTheme(seed, "light")!.accent)!.h;
      const diff = Math.abs(seedHue - accentHue) % 360;
      const gap = diff > 180 ? 360 - diff : diff;
      assert.ok(gap < 12, `${seed}: hue moved from ${seedHue} to ${accentHue}`);
    }
  });

  it("leaves surfaces nearly neutral so text stays legible on them", () => {
    const theme = buildTheme("#cc2020", "light")!;
    for (const surface of [theme.bg, theme.surface, theme.surface2, theme.surface3]) {
      assert.ok(
        hexToOklch(surface)!.c <= 0.015,
        `${surface} carries too much chroma for a text background`,
      );
    }
  });

  it("keeps light surfaces light and dark surfaces dark", () => {
    const light = buildTheme("#4b56d2", "light")!;
    const dark = buildTheme("#4b56d2", "dark")!;
    assert.ok(hexToOklch(light.bg)!.l > 0.9, "light bg stays near white");
    assert.ok(hexToOklch(dark.bg)!.l < 0.25, "dark bg stays near black");
    assert.ok(hexToOklch(light.surface)!.l > hexToOklch(light.bg)!.l, "cards sit above the page");
    assert.ok(hexToOklch(dark.surface)!.l > hexToOklch(dark.bg)!.l, "cards sit above the page");
  });

  it("gives a grey seed a grey theme rather than inventing a hue", () => {
    const theme = buildTheme("#808080", "light")!;
    assert.ok(hexToOklch(theme.accent)!.c < 0.02);
  });

  it("emits every variable the theme script clears", () => {
    const vars = themeToCssVars(buildTheme("#4b56d2", "light")!);
    assert.deepEqual(Object.keys(vars).sort(), [
      "--accent",
      "--accent-hover",
      "--accent-soft",
      "--accent-text",
      "--bg",
      "--border",
      "--border-strong",
      "--surface",
      "--surface-2",
      "--surface-3",
    ]);
    for (const [name, value] of Object.entries(vars)) {
      assert.ok(isValidHex(value), `${name} should be a hex colour, got ${value}`);
    }
  });
});
