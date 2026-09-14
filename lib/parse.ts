import type { Course, Priority } from "./types";
import { addDays, startOfDay, startOfWeek } from "./date";

interface TimeOfDay {
  hours: number;
  minutes: number;
}

export interface ParsedQuickAdd {
  title: string;
  dueAt: string | null;
  hasDueTime: boolean;
  priority: Priority;
  courseId: string | null;
  estimateMinutes: number | null;
  /** Human-readable chips describing what was understood, for the live preview. */
  hints: string[];
}

const WEEKDAYS = [
  ["sunday", "sun"],
  ["monday", "mon"],
  ["tuesday", "tue", "tues"],
  ["wednesday", "wed"],
  ["thursday", "thu", "thur", "thurs"],
  ["friday", "fri"],
  ["saturday", "sat"],
];

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * Parses a quick-add line such as
 * `Essay draft #cs101 tomorrow 5pm !high ~2h`
 * into a task. Anything it doesn't recognise stays in the title, so typing a
 * plain sentence always works.
 */
export function parseQuickAdd(
  input: string,
  courses: Course[],
  now: Date = new Date(),
): ParsedQuickAdd {
  let text = ` ${input} `;
  const hints: string[] = [];

  /* priority ------------------------------------------------------------ */
  let priority: Priority = "normal";
  text = consume(text, /\s(!!|!high|!h)(?=\s)/i, () => {
    priority = "high";
    hints.push("High priority");
  });
  if (priority === "normal") {
    text = consume(text, /\s(!low|!l)(?=\s)/i, () => {
      priority = "low";
      hints.push("Low priority");
    });
  }

  /* course -------------------------------------------------------------- */
  let courseId: string | null = null;
  text = consume(text, /\s[#@]([\w-]+)(?=\s)/i, (match) => {
    const needle = match[1].toLowerCase();
    const course = matchCourse(courses, needle);
    if (!course) return false; // leave the token in the title
    courseId = course.id;
    hints.push(course.code || course.name);
    return true;
  });

  /* estimate ------------------------------------------------------------ */
  let estimateMinutes: number | null = null;
  text = consume(text, /\s~(\d+(?:\.\d+)?)\s*(m|min|mins|h|hr|hrs)?(?=\s)/i, (match) => {
    const amount = Number(match[1]);
    const unit = (match[2] || "m").toLowerCase();
    estimateMinutes = unit.startsWith("h") ? Math.round(amount * 60) : Math.round(amount);
    hints.push(formatEstimate(estimateMinutes));
    return true;
  });

  /* date ---------------------------------------------------------------- */
  let day: Date | null = null;

  const dateMatchers: Array<[RegExp, (m: RegExpMatchArray) => Date | null]> = [
    [/\s(today|tonight)(?=\s)/i, () => startOfDay(now)],
    [/\s(tomorrow|tmrw|tmr)(?=\s)/i, () => addDays(startOfDay(now), 1)],
    [/\syesterday(?=\s)/i, () => addDays(startOfDay(now), -1)],
    [/\snext week(?=\s)/i, () => addDays(startOfWeek(now, 1), 7)],
    [
      /\sin (\d+) (day|days|week|weeks)(?=\s)/i,
      (m) =>
        addDays(startOfDay(now), Number(m[1]) * (m[2].toLowerCase().startsWith("week") ? 7 : 1)),
    ],
    [/\s(next )?(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(day|nesday|rsday|urday)?(?=\s)/i, (m) =>
      weekdayDate(m[2].toLowerCase(), !!m[1], now),
    ],
    [
      new RegExp(`\\s(${MONTHS.join("|")}|${MONTHS.map((m) => m.slice(0, 3)).join("|")})\\.? (\\d{1,2})(?:st|nd|rd|th)?(?:,? (\\d{4}))?(?=\\s)`, "i"),
      (m) => monthDayDate(m[1], Number(m[2]), m[3] ? Number(m[3]) : null, now),
    ],
    [/\s(\d{4})-(\d{2})-(\d{2})(?=\s)/, (m) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))],
    [
      /\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/,
      (m) => {
        const year = m[3]
          ? Number(m[3].length === 2 ? `20${m[3]}` : m[3])
          : now.getFullYear();
        const d = new Date(year, Number(m[1]) - 1, Number(m[2]));
        return Number.isNaN(d.getTime()) ? null : d;
      },
    ],
  ];

  for (const [pattern, resolve] of dateMatchers) {
    if (day) break;
    text = consume(text, pattern, (match) => {
      const resolved = resolve(match);
      if (!resolved) return false;
      day = resolved;
      return true;
    });
  }

  /* time ---------------------------------------------------------------- */
  let time: TimeOfDay | null = null;
  text = consume(text, /\s(?:at\s+)?noon(?=\s)/i, () => {
    time = { hours: 12, minutes: 0 };
  });
  if (!time) {
    text = consume(text, /\s(?:at\s+)?midnight(?=\s)/i, () => {
      time = { hours: 0, minutes: 0 };
    });
  }
  if (!time) {
    text = consume(
      text,
      /\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i,
      (match) => {
        let hours = Number(match[1]);
        if (hours > 12) return false;
        const minutes = match[2] ? Number(match[2]) : 0;
        const meridiem = match[3].toLowerCase();
        if (meridiem === "pm" && hours !== 12) hours += 12;
        if (meridiem === "am" && hours === 12) hours = 0;
        time = { hours, minutes };
        return true;
      },
    );
  }
  if (!time) {
    text = consume(text, /\sat\s+(\d{1,2}):(\d{2})(?=\s)/, (match) => {
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      if (hours > 23 || minutes > 59) return false;
      time = { hours, minutes };
      return true;
    });
  }

  /* assemble ------------------------------------------------------------ */
  let dueAt: string | null = null;
  let hasDueTime = false;
  // Re-read through explicit annotations: the matchers above assign inside
  // callbacks, which narrowing cannot follow.
  const resolvedDay = day as Date | null;
  const resolvedTime = time as TimeOfDay | null;

  if (resolvedDay || resolvedTime) {
    const base = resolvedDay ?? startOfDay(now);
    const due = new Date(base);
    if (resolvedTime) {
      due.setHours(resolvedTime.hours, resolvedTime.minutes, 0, 0);
      hasDueTime = true;
      // "5pm" with no day, already past → assume they mean tomorrow.
      if (!resolvedDay && due < now) due.setDate(due.getDate() + 1);
    }
    dueAt = due.toISOString();
    hints.unshift(describeDue(due, hasDueTime));
  }

  return {
    title: text.replace(/\s+/g, " ").trim(),
    dueAt,
    hasDueTime,
    priority,
    courseId,
    estimateMinutes,
    hints,
  };
}

/* ---------- helpers ---------- */

/**
 * Runs `pattern` against `text` and, when `onMatch` doesn't explicitly return
 * `false`, removes the matched span. Returning `false` means "not actually a
 * match" and leaves the text untouched.
 */
function consume(
  text: string,
  pattern: RegExp,
  onMatch: (match: RegExpMatchArray) => boolean | void,
): string {
  const match = text.match(pattern);
  if (!match || match.index === undefined) return text;
  if (onMatch(match) === false) return text;
  return `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`;
}

function matchCourse(courses: Course[], needle: string): Course | undefined {
  const active = courses.filter((c) => !c.archived);
  const normalized = (value: string) => value.toLowerCase().replace(/[\s-]/g, "");
  const target = normalized(needle);
  return (
    active.find((c) => normalized(c.code) === target) ??
    active.find((c) => normalized(c.name) === target) ??
    active.find((c) => normalized(c.code).startsWith(target) && target.length >= 2) ??
    active.find((c) => normalized(c.name).startsWith(target) && target.length >= 3)
  );
}

function weekdayDate(token: string, next: boolean, now: Date): Date | null {
  const index = WEEKDAYS.findIndex((names) =>
    names.some((name) => name === token || name.startsWith(token)),
  );
  if (index === -1) return null;

  const today = startOfDay(now);
  let offset = (index - today.getDay() + 7) % 7;
  if (next) {
    if (offset === 0) offset = 7;
    // "next friday" while it's still this week means the *following* Friday.
    if (startOfWeek(addDays(today, offset), 0).getTime() === startOfWeek(today, 0).getTime()) {
      offset += 7;
    }
  }
  return addDays(today, offset);
}

function monthDayDate(token: string, dayOfMonth: number, year: number | null, now: Date): Date | null {
  const lower = token.toLowerCase();
  const month = MONTHS.findIndex((m) => m === lower || m.startsWith(lower));
  if (month === -1 || dayOfMonth < 1 || dayOfMonth > 31) return null;
  const resolvedYear = year ?? now.getFullYear();
  const date = new Date(resolvedYear, month, dayOfMonth);
  // No year given and the date already passed → they mean next year.
  if (!year && date < startOfDay(now)) date.setFullYear(resolvedYear + 1);
  return date;
}

function describeDue(due: Date, hasTime: boolean): string {
  const day = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (!hasTime) return day;
  const time = due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

export function formatEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
