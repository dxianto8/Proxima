/**
 * Date helpers. Everything here works in the browser's local timezone — Canvas
 * hands us UTC ISO strings and the user thinks in "Tuesday at 5pm", so the
 * conversion happens once, here.
 */

export const MS_PER_DAY = 86_400_000;

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  // Clamp: Jan 31 + 1 month should land on the last day of February, not Mar 3.
  d.setDate(Math.min(targetDay, daysInMonth(d.getFullYear(), d.getMonth())));
  return d;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 0): Date {
  const d = startOfDay(date);
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  return addDays(d, -diff);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Local-time `YYYY-MM-DD`. Used as a stable map key for calendar buckets. */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inverse of {@link dateKey}: local midnight for a `YYYY-MM-DD` string. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

/**
 * The 6x7 grid of days shown by the month view, including the leading and
 * trailing days that spill over from the neighbouring months.
 */
export function monthGrid(year: number, month: number, weekStartsOn: 0 | 1 = 0): Date[] {
  const first = startOfWeek(new Date(year, month, 1), weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

const WEEKDAYS_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayLabels(weekStartsOn: 0 | 1 = 0): string[] {
  return weekStartsOn === 0
    ? WEEKDAYS_SUN
    : [...WEEKDAYS_SUN.slice(1), WEEKDAYS_SUN[0]];
}

/* ---------- formatting ---------- */

export function formatTime(date: Date): string {
  return date
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .replace(/\s?([AP])\.?M\.?/i, (_m, p: string) => p.toLowerCase() + "m");
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatDayLong(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatDayShort(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * "Today · 5:00pm", "Tomorrow", "Fri, Sep 19", "Sep 4, 2024" — the label shown
 * on a task row. `now` is injected so the caller controls the clock (and so
 * rendering stays deterministic within a single pass).
 */
export function formatDue(iso: string, hasTime: boolean, now: Date = new Date()): string {
  const due = new Date(iso);
  const offset = daysBetween(now, due);
  const time = hasTime ? formatTime(due) : "";

  let day: string;
  if (offset === 0) day = "Today";
  else if (offset === 1) day = "Tomorrow";
  else if (offset === -1) day = "Yesterday";
  else if (offset > 1 && offset < 7) {
    day = due.toLocaleDateString(undefined, { weekday: "long" });
  } else if (due.getFullYear() === now.getFullYear()) {
    day = due.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } else {
    day = due.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return time ? `${day} · ${time}` : day;
}

/** "3 days overdue", "2 weeks overdue" — only meaningful for past due dates. */
export function formatOverdue(iso: string, now: Date = new Date()): string {
  const days = Math.abs(daysBetween(new Date(iso), now));
  if (days === 0) return "Due today";
  if (days === 1) return "1 day overdue";
  if (days < 14) return `${days} days overdue`;
  return `${Math.floor(days / 7)} weeks overdue`;
}

/* ---------- <input> interop ---------- */

/** Local-time value for `<input type="datetime-local">`. */
export function toDateTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${dateKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function toDateInput(iso: string): string {
  return dateKey(new Date(iso));
}

/** Parses an `<input type="date">` / `datetime-local` value into an ISO string. */
export function fromDateInput(value: string, time?: string): string | null {
  if (!value) return null;
  const [datePart, inlineTime] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  const clock = time ?? inlineTime ?? "";
  const [hh, mm] = clock ? clock.split(":").map(Number) : [0, 0];
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0).toISOString();
}
