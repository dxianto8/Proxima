/**
 * Course colours. One accent hex per entry; the soft fills used by chips and
 * calendar bars are derived at render time with `color-mix`, so a single value
 * stays legible on both the light and dark surface.
 */
export interface CourseColor {
  id: string;
  label: string;
  hex: string;
}

export const COURSE_COLORS: CourseColor[] = [
  { id: "indigo", label: "Indigo", hex: "#5b63d3" },
  { id: "blue", label: "Blue", hex: "#2f7fd1" },
  { id: "cyan", label: "Cyan", hex: "#1798ae" },
  { id: "teal", label: "Teal", hex: "#149080" },
  { id: "green", label: "Green", hex: "#3f9142" },
  { id: "amber", label: "Amber", hex: "#b57614" },
  { id: "orange", label: "Orange", hex: "#cc6520" },
  { id: "red", label: "Red", hex: "#d0464a" },
  { id: "pink", label: "Pink", hex: "#c44a8e" },
  { id: "violet", label: "Violet", hex: "#8a52c9" },
  { id: "slate", label: "Slate", hex: "#5f6b7a" },
];

const BY_ID = new Map(COURSE_COLORS.map((c) => [c.id, c]));

export function colorHex(id: string | null | undefined): string {
  return (id && BY_ID.get(id)?.hex) || COURSE_COLORS[0].hex;
}

/** Deterministic colour for a course we created without the user choosing one. */
export function colorForIndex(index: number): string {
  return COURSE_COLORS[index % COURSE_COLORS.length].id;
}

/**
 * CSS custom properties for a coloured surface. Consumers spread this onto a
 * style prop and reference `var(--accent)` / `var(--accent-soft)` in classes.
 */
export function accentVars(colorId: string | null | undefined): React.CSSProperties {
  const hex = colorHex(colorId);
  return {
    ["--accent" as string]: hex,
    ["--accent-soft" as string]: `color-mix(in srgb, ${hex} 14%, transparent)`,
    ["--accent-line" as string]: `color-mix(in srgb, ${hex} 34%, transparent)`,
  };
}
