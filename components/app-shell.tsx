"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Course } from "@/lib/types";
import { useTaskEditor } from "./task-editor";
import { openTaskCount, summarize } from "@/lib/selectors";
import { colorHex } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme";
import { ContextMenu, useContextMenu } from "./ui/context-menu";
import { ConfirmDialog } from "./ui/overlay";
import { CourseModal } from "./course-modal";
import { useCanvasSync } from "./canvas/sync-provider";
import { Button } from "./ui/button";
import { Dot } from "./ui/badge";
import {
  ArchiveIcon,
  BookIcon,
  CheckIcon,
  CalendarIcon,
  ChevronRightIcon,
  InboxIcon,
  LayersIcon,
  MenuIcon,
  PencilIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  SparkIcon,
  SunriseIcon,
  TrashIcon,
  XIcon,
} from "./icons";

const NAV = [
  { href: "/today", label: "Today", icon: SunriseIcon },
  { href: "/upcoming", label: "Upcoming", icon: LayersIcon },
  { href: "/tasks", label: "All tasks", icon: InboxIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className="mt-[var(--titlebar-h)] flex h-[calc(100dvh-var(--titlebar-h))] overflow-hidden bg-bg">
      {/* Desktop rail */}
      <aside className="hidden w-[248px] shrink-0 border-r border-border bg-surface lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="animate-fade absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <aside className="animate-fade relative flex w-[260px] border-r border-border bg-surface">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto overscroll-contain">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data, updateCourse, deleteCourse } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const { openNew } = useTaskEditor();
  const summary = useMemo(() => summarize(data.tasks), [data.tasks]);

  // Right-click on a course opens the same actions the Courses page offers.
  const menu = useContextMenu<Course>();
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);

  function courseMenuItems(course: Course) {
    return [
      {
        label: "Open course",
        icon: <ChevronRightIcon size={14} />,
        onSelect: () => {
          router.push(`/courses/${course.id}`);
          onNavigate?.();
        },
      },
      {
        label: "Add task to course",
        icon: <PlusIcon size={14} />,
        onSelect: () => openNew({ courseId: course.id }),
      },
      {
        label: "Edit course…",
        icon: <PencilIcon size={14} />,
        separated: true,
        onSelect: () => setEditing(course),
      },
      {
        label: course.archived ? "Unarchive" : "Archive",
        icon: <ArchiveIcon size={14} />,
        onSelect: () => updateCourse(course.id, { archived: !course.archived }),
      },
      {
        label: "Delete course…",
        icon: <TrashIcon size={14} />,
        danger: true,
        separated: true,
        onSelect: () => setDeleting(course),
      },
    ];
  }

  const activeCourses = data.courses
    .filter((course) => !course.archived)
    .map((course) => ({ course, open: openTaskCount(data.tasks, course.id) }))
    .sort((a, b) => b.open - a.open || a.course.name.localeCompare(b.course.name));

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-text">
          <SparkIcon size={15} />
        </span>
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-text">Proxima</span>
      </div>

      <nav className="space-y-0.5 px-2.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const count =
            href === "/today"
              ? summary.overdue + summary.dueToday
              : href === "/upcoming"
                ? summary.dueThisWeek
                : href === "/tasks"
                  ? summary.open
                  : 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] transition-colors duration-100",
                active
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {count > 0 ? (
                <span
                  className={cn(
                    "tabular rounded px-1 text-[11px] font-medium",
                    href === "/today" && summary.overdue > 0
                      ? "text-danger"
                      : active
                        ? "text-accent"
                        : "text-subtle",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col px-2.5">
        <div className="flex items-center justify-between px-2.5 pb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-subtle">
            Courses
          </span>
          <Link
            href="/courses"
            onClick={onNavigate}
            className="text-[11px] font-medium text-subtle transition-colors hover:text-accent"
          >
            Manage
          </Link>
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-2">
          {activeCourses.length === 0 ? (
            <Link
              href="/settings"
              onClick={onNavigate}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-subtle hover:bg-surface-2 hover:text-text"
            >
              <BookIcon size={15} />
              Import from Canvas
            </Link>
          ) : (
            activeCourses.map(({ course, open }) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                onClick={onNavigate}
                onContextMenu={(event) => menu.open(event, course)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-[6px] text-[13px] transition-colors duration-100",
                  pathname === `/courses/${course.id}` || menu.state?.target.id === course.id
                    ? "bg-surface-2 font-medium text-text"
                    : "text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <Dot color={colorHex(course.color)} />
                <span className="flex-1 truncate">{course.code || course.name}</span>
                {open > 0 ? (
                  <span className="tabular text-[11px] text-subtle">{open}</span>
                ) : null}
              </Link>
            ))
          )}
        </div>
      </div>

      <ContextMenu
        label={menu.state ? `Actions for ${menu.state.target.name}` : undefined}
        position={menu.state?.position ?? null}
        onClose={menu.close}
        items={menu.state ? courseMenuItems(menu.state.target) : []}
      />

      <CourseModal
        key={editing?.id ?? "none"}
        open={Boolean(editing)}
        course={editing}
        onClose={() => setEditing(null)}
        onSubmit={(values) => editing && updateCourse(editing.id, values)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteCourse(deleting.id)}
        title={`Delete ${deleting?.name ?? "course"}?`}
        body="Its tasks stay, but they lose their course tag. If it came from Canvas, syncing again will recreate it."
      />

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
            pathname === "/settings"
              ? "bg-surface-2 font-medium text-text"
              : "text-muted hover:bg-surface-2 hover:text-text",
          )}
        >
          <SettingsIcon size={15} />
          Settings
        </Link>
        <ThemeToggle size="sm" />
      </div>
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const { openNew } = useTaskEditor();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // App-wide shortcuts: `/` jumps to search, `n` opens a new task.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNew();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openNew]);

  function runSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/tasks?q=${encodeURIComponent(trimmed)}` : "/tasks");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-bg/85 px-3 backdrop-blur-md sm:px-5">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <MenuIcon size={18} />
      </Button>

      <form onSubmit={runSearch} className="relative max-w-sm flex-1">
        <SearchIcon
          size={15}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle"
        />
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
              searchRef.current?.blur();
            }
          }}
          placeholder="Search tasks"
          aria-label="Search tasks"
          className={cn(
            "h-9 w-full rounded-lg border border-transparent bg-surface-2 pl-8 pr-8 text-[13.5px]",
            "text-text outline-none transition-colors placeholder:text-subtle",
            "hover:bg-surface-3 focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20",
          )}
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-subtle hover:text-text"
          >
            <XIcon size={13} />
          </button>
        ) : (
          <kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface px-1 text-[10px] font-medium text-subtle sm:block">
            /
          </kbd>
        )}
      </form>

      <div className="ml-auto flex items-center gap-2">
        <SyncButton />
        <Button variant="primary" size="md" onClick={() => openNew()}>
          <PlusIcon size={15} />
          <span className="hidden sm:inline">New task</span>
        </Button>
      </div>
    </header>
  );
}

/**
 * One-click Canvas sync. Only appears once a connection is saved — until then
 * there is nothing to sync and Settings is the place to go.
 */
function SyncButton() {
  const { connected, syncing, sync, lastResult, clearResult } = useCanvasSync();
  const [justSynced, setJustSynced] = useState(false);

  // A short confirmation, since the import dialog closes on its own.
  useEffect(() => {
    if (!lastResult) return;
    setJustSynced(true);
    const id = setTimeout(() => {
      setJustSynced(false);
      clearResult();
    }, 2500);
    return () => clearTimeout(id);
  }, [lastResult, clearResult]);

  if (!connected) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={() => void sync()}
      disabled={syncing}
      aria-label={syncing ? "Syncing with Canvas" : "Sync with Canvas"}
      title={syncing ? "Syncing with Canvas…" : "Sync with Canvas"}
    >
      {justSynced ? (
        // Colour the glyph, not the button: the variant's own text colour
        // would win the cascade against a utility added here.
        <CheckIcon size={15} className="text-success" />
      ) : (
        <RefreshIcon size={15} className={cn(syncing && "animate-spin")} />
      )}
    </Button>
  );
}

/** Shared page frame: title block plus a constrained content column. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-text">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-[13.5px] text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageContainer({
  children,
  wide = false,
  className,
}: {
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-6 sm:px-6 sm:py-8",
        wide ? "max-w-6xl" : "max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
