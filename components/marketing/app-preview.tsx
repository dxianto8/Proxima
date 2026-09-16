import { cn } from "@/lib/utils";
import { CheckIcon, SparkIcon } from "@/components/icons";

/**
 * A miniature, non-interactive rendering of the Today view.
 *
 * Built from the same design tokens rather than shipped as a screenshot, so it
 * follows the reader's light/dark preference and any accent they have set, and
 * stays sharp at any density.
 */
export function AppPreview() {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none select-none overflow-hidden rounded-2xl border border-border",
        "bg-surface shadow-overlay",
      )}
    >
      <div className="flex">
        {/* sidebar */}
        <div className="hidden w-[150px] shrink-0 border-r border-border bg-surface-2/50 p-3 sm:block">
          <div className="mb-4 flex items-center gap-1.5">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-accent text-accent-text">
              <SparkIcon size={11} />
            </span>
            <span className="text-[11px] font-semibold tracking-[-0.02em] text-text">
              Proxima
            </span>
          </div>
          <NavRow label="Today" active />
          <NavRow label="Upcoming" count="6" />
          <NavRow label="Calendar" />
          <p className="mb-1 mt-3 px-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-subtle">
            Courses
          </p>
          <CourseRow color="#5b63d3" label="ASTR 201" count="3" />
          <CourseRow color="#149080" label="MATH 254" count="2" />
          <p className="mb-1 mt-2.5 px-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-subtle">
            Clubs
          </p>
          <CourseRow color="#cc6520" label="Debate" count="1" />
        </div>

        {/* content */}
        <div className="min-w-0 flex-1 p-4">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-text">Today</p>
          <p className="mb-3 text-[10px] text-muted">Monday, 15 September</p>

          <div className="mb-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
            <Stat label="Due today" value="2" tone="accent" />
            <Stat label="Overdue" value="1" tone="danger" />
            <Stat label="Open" value="9" />
          </div>

          <p className="mb-1 text-[9px] font-semibold text-danger">Overdue</p>
          <div className="mb-3 overflow-hidden rounded-lg border border-border">
            <TaskRow title="Problem set 6" meta="MATH 254 · Yesterday" color="#149080" late />
          </div>

          <p className="mb-1 text-[9px] font-semibold text-text">Due today</p>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            <TaskRow
              title="Lab report: stellar parallax"
              meta="ASTR 201 · 5:00pm · 40 pts"
              color="#5b63d3"
            />
            <TaskRow title="Read Ch. 7–9" meta="ENGL 310 · 11:59pm" color="#b57614" />
            <TaskRow title="Draft opening argument" meta="Debate" color="#cc6520" done />
          </div>
        </div>
      </div>
    </div>
  );
}

function NavRow({
  label,
  active,
  count,
}: {
  label: string;
  active?: boolean;
  count?: string;
}) {
  return (
    <div
      className={cn(
        "mb-0.5 flex items-center justify-between rounded-md px-1.5 py-1 text-[10px]",
        active ? "bg-accent-soft font-medium text-accent" : "text-muted",
      )}
    >
      {label}
      {count ? <span className="tabular text-[9px] text-subtle">{count}</span> : null}
    </div>
  );
}

function CourseRow({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: string;
}) {
  return (
    <div className="mb-0.5 flex items-center gap-1.5 rounded-md px-1.5 py-[3px] text-[10px] text-muted">
      <span style={{ backgroundColor: color }} className="h-1.5 w-1.5 rounded-full" />
      <span className="flex-1 truncate">{label}</span>
      <span className="tabular text-[9px] text-subtle">{count}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "danger";
}) {
  return (
    <div className="bg-surface px-2 py-1.5">
      <p className="text-[7.5px] font-medium uppercase tracking-[0.06em] text-subtle">
        {label}
      </p>
      <p
        className={cn(
          "tabular text-[15px] font-semibold leading-tight",
          tone === "accent" ? "text-accent" : tone === "danger" ? "text-danger" : "text-text",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function TaskRow({
  title,
  meta,
  color,
  late,
  done,
}: {
  title: string;
  meta: string;
  color: string;
  late?: boolean;
  done?: boolean;
}) {
  return (
    <div className="relative flex items-start gap-2 bg-surface px-2.5 py-1.5">
      <span
        style={{ backgroundColor: color }}
        className="absolute inset-y-1 left-0 w-[2px] rounded-full opacity-70"
      />
      <span
        style={done ? { backgroundColor: color, borderColor: color } : undefined}
        className={cn(
          "mt-[2px] grid h-[11px] w-[11px] shrink-0 place-items-center rounded-full border",
          done ? "text-white" : "border-border-strong",
        )}
      >
        {done ? <CheckIcon size={7} strokeWidth={4} /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[10.5px] leading-tight",
            done ? "text-subtle line-through" : "text-text",
          )}
        >
          {title}
        </p>
        <p className={cn("mt-0.5 text-[9px]", late ? "text-danger" : "text-muted")}>{meta}</p>
      </div>
    </div>
  );
}
