"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { CustomTheme } from "@/lib/types";
import { buildTheme, isValidHex, themeToCssVars } from "@/lib/color";
import { extractPalette } from "@/lib/image-palette";
import {
  BackgroundTooLargeError,
  clearBackground,
  downscaleToDataUrl,
  readBackground,
  writeBackground,
} from "@/lib/background-store";
import { applyBackground } from "@/components/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/theme";
import { Segmented } from "@/components/ui/segmented";
import { CheckIcon, TrashIcon, UploadIcon } from "@/components/icons";

/** Hand-picked starting points, spread around the hue wheel. */
const PRESETS: { name: string; hex: string }[] = [
  { name: "Indigo", hex: "#4b56d2" },
  { name: "Blue", hex: "#2f7fd1" },
  { name: "Teal", hex: "#149080" },
  { name: "Green", hex: "#3f9142" },
  { name: "Amber", hex: "#b57614" },
  { name: "Orange", hex: "#cc6520" },
  { name: "Rose", hex: "#d0464a" },
  { name: "Pink", hex: "#c44a8e" },
  { name: "Violet", hex: "#8a52c9" },
  { name: "Slate", hex: "#5f6b7a" },
];

/** Derives both modes at once so switching light/dark needs no recompute. */
function themeFromSeed(seed: string): CustomTheme | null {
  const light = buildTheme(seed, "light");
  const dark = buildTheme(seed, "dark");
  if (!light || !dark) return null;
  return { seed, light: themeToCssVars(light), dark: themeToCssVars(dark) };
}

export function AppearancePanel() {
  const { data, setPreferences } = useStore();
  const { customTheme, backgroundDim, extractedColors } = data.preferences;

  const fileRef = useRef<HTMLInputElement>(null);
  const [background, setBackground] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The image lives outside the store, so read it once on mount.
  useEffect(() => setBackground(readBackground()), []);

  function applySeed(seed: string) {
    const theme = themeFromSeed(seed);
    if (!theme) {
      setError("That colour could not be read.");
      return;
    }
    setError(null);
    setPreferences({ customTheme: theme });
  }

  async function onPickFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await downscaleToDataUrl(file);
      const palette = await extractPalette(dataUrl);
      writeBackground(dataUrl);
      setBackground(dataUrl);

      // A bright photo needs a heavier scrim to keep text readable, a dark one
      // less; start somewhere sensible and let the slider take over.
      const dim = Math.round(
        Math.min(88, Math.max(52, 40 + palette.averageLightness * 55)),
      );
      const theme = themeFromSeed(palette.seed);
      setPreferences({
        backgroundDim: dim,
        extractedColors: palette.swatches,
        ...(theme ? { customTheme: theme } : {}),
      });
      applyBackground(dim);
    } catch (failure) {
      setError(
        failure instanceof BackgroundTooLargeError
          ? `${failure.message} Try a smaller image.`
          : failure instanceof Error
            ? failure.message
            : "That image could not be used.",
      );
    } finally {
      setBusy(false);
    }
  }

  function removeBackground() {
    clearBackground();
    setBackground(null);
    setPreferences({ extractedColors: [] });
    applyBackground(backgroundDim);
  }

  const activeSeed = customTheme?.seed?.toLowerCase() ?? null;

  return (
    <div className="space-y-4">
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <Row label="Theme" hint="Follow your system, or pin light or dark.">
          <ThemeToggle />
        </Row>
        <Row label="Week starts on" hint="Applies to the calendar grid.">
          <Segmented<"0" | "1">
            ariaLabel="Week starts on"
            value={String(data.preferences.weekStartsOn) as "0" | "1"}
            onChange={(value) => setPreferences({ weekStartsOn: Number(value) as 0 | 1 })}
            options={[
              { value: "0", label: "Sunday" },
              { value: "1", label: "Monday" },
            ]}
          />
        </Row>
      </div>

      {/* ---------------------------------------------------------- accent */}
      <section className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-text">
              Accent colour
            </h3>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
              Sets the highlight colour and tints the surfaces behind it. Light and
              dark are derived separately, so both stay readable.
            </p>
          </div>
          {customTheme ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreferences({ customTheme: null })}
            >
              Reset
            </Button>
          ) : null}
        </div>

        <Swatches
          colors={PRESETS.map((p) => ({ hex: p.hex, name: p.name }))}
          active={activeSeed}
          onPick={applySeed}
        />

        {extractedColors.length > 0 ? (
          <div className="space-y-1.5 border-t border-border pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle">
              From your background
            </p>
            <Swatches
              colors={extractedColors.map((hex) => ({ hex, name: hex }))}
              active={activeSeed}
              onPick={applySeed}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <label
            htmlFor="accent-custom"
            className="text-[12.5px] text-muted"
          >
            Or pick your own
          </label>
          <input
            id="accent-custom"
            type="color"
            value={customTheme?.seed ?? "#4b56d2"}
            onChange={(event) => {
              if (isValidHex(event.target.value)) applySeed(event.target.value);
            }}
            className="h-7 w-12 cursor-pointer rounded-md border border-border bg-surface p-0.5"
          />
          <span className="tabular text-[12px] uppercase text-subtle">
            {customTheme?.seed ?? "default"}
          </span>
        </div>
      </section>

      {/* ------------------------------------------------------ background */}
      <section className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card">
        <div>
          <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-text">
            Background image
          </h3>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
            Upload a picture and Proxima builds an accent from the colours in it.
            The image is stored in this browser and never uploaded anywhere.
          </p>
        </div>

        {background ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <div
              role="img"
              aria-label="Current background image"
              style={{ backgroundImage: `url(${background})` }}
              className="h-32 w-full bg-cover bg-center"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? (
              <span
                aria-hidden
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
              />
            ) : (
              <UploadIcon size={15} />
            )}
            {busy ? "Reading image…" : background ? "Replace image" : "Upload image"}
          </Button>
          {background ? (
            <Button
              variant="ghost"
              onClick={removeBackground}
              className="text-danger hover:bg-danger-soft hover:text-danger"
            >
              <TrashIcon size={15} />
              Remove
            </Button>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onPickFile(file);
              event.target.value = "";
            }}
          />
        </div>

        {background ? (
          <div className="space-y-1.5 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <label htmlFor="bg-dim" className="text-[13px] text-text">
                Fade
              </label>
              <span className="tabular text-[12px] text-subtle">{backgroundDim}%</span>
            </div>
            <input
              id="bg-dim"
              type="range"
              min={20}
              max={96}
              value={backgroundDim}
              onChange={(event) => setPreferences({ backgroundDim: Number(event.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
            <p className="text-[11.5px] text-subtle">
              More fade means a quieter image and easier reading.
            </p>
          </div>
        ) : null}

        {error ? <Alert tone="error">{error}</Alert> : null}
      </section>
    </div>
  );
}

function Swatches({
  colors,
  active,
  onPick,
}: {
  colors: { hex: string; name: string }[];
  active: string | null;
  onPick: (hex: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap gap-1.5">
      {colors.map(({ hex, name }) => {
        const selected = hex.toLowerCase() === active;
        return (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            title={name}
            onClick={() => onPick(hex)}
            style={{ backgroundColor: hex }}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full text-white transition-transform duration-100",
              "hover:scale-110",
              selected && "ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface)]",
            )}
          >
            <CheckIcon
              size={13}
              strokeWidth={3}
              className={cn("transition-opacity", selected ? "opacity-100" : "opacity-0")}
            />
          </button>
        );
      })}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-[13.5px] text-text">{label}</p>
        {hint ? <p className="text-[12px] text-subtle">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
