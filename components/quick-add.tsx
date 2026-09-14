"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { parseQuickAdd } from "@/lib/parse";
import { useTaskEditor } from "./task-editor";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { PlusIcon } from "./icons";

/**
 * The always-available capture box. Typing a plain sentence works; the parser
 * picks up dates, `#course`, `!high` and `~90m` and shows what it understood
 * before you commit.
 */
export function QuickAdd({
  placeholder = "Add a task…",
  defaultCourseId = null,
  defaultDueAt = null,
  autoFocus = false,
  className,
}: {
  placeholder?: string;
  defaultCourseId?: string | null;
  defaultDueAt?: string | null;
  autoFocus?: boolean;
  className?: string;
}) {
  const { data, addTask } = useStore();
  const { openNew } = useTaskEditor();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(
    () => (value.trim() ? parseQuickAdd(value, data.courses) : null),
    [value, data.courses],
  );

  /** Hands the current line (parsed, if there is one) to the full editor. */
  function openEditor() {
    const draft = value.trim() ? parseQuickAdd(value, data.courses) : null;
    openNew(
      draft
        ? {
            title: draft.title,
            dueAt: draft.dueAt ?? defaultDueAt,
            hasDueTime: draft.hasDueTime,
            priority: draft.priority,
            courseId: draft.courseId ?? defaultCourseId,
            estimateMinutes: draft.estimateMinutes,
          }
        : { dueAt: defaultDueAt, courseId: defaultCourseId },
    );
    setValue("");
  }

  function submit() {
    const draft = parseQuickAdd(value, data.courses);
    if (!draft.title) return;
    addTask({
      title: draft.title,
      dueAt: draft.dueAt ?? defaultDueAt,
      hasDueTime: draft.dueAt ? draft.hasDueTime : false,
      priority: draft.priority,
      courseId: draft.courseId ?? defaultCourseId,
      estimateMinutes: draft.estimateMinutes,
    });
    setValue("");
    inputRef.current?.focus();
  }

  const showHints = focused && (parsed === null || parsed.hints.length > 0);

  return (
    <div className={cn("group/qa", className)}>
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border bg-surface px-3 shadow-card",
          "transition-[border-color,box-shadow] duration-150",
          focused
            ? "border-accent ring-2 ring-accent/20"
            : "border-border hover:border-border-strong",
        )}
      >
        <button
          type="button"
          aria-label="Open the full task editor"
          title="Open the full task editor"
          onMouseDown={(event) => event.preventDefault()}
          onClick={openEditor}
          className={cn(
            "-ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors duration-150",
            "hover:bg-surface-2 hover:text-accent active:scale-95",
            focused ? "text-accent" : "text-subtle",
          )}
        >
          <PlusIcon size={17} />
        </button>
        <input
          ref={inputRef}
          data-quick-add
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            } else if (event.key === "Escape") {
              setValue("");
              inputRef.current?.blur();
            }
          }}
          className="h-11 min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-subtle"
        />
        {value.trim() ? (
          <Button
            variant="primary"
            size="sm"
            onMouseDown={(event) => event.preventDefault()}
            onClick={submit}
          >
            Add
          </Button>
        ) : null}
      </div>

      <div
        aria-hidden={!showHints}
        className={cn(
          "overflow-hidden transition-all duration-150",
          showHints ? "mt-2 max-h-16 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          {parsed === null ? (
            <span className="text-[11px] text-subtle">
              Dates, <code className="font-mono">#course</code>,{" "}
              <code className="font-mono">!high</code> and{" "}
              <code className="font-mono">~90m</code> are picked up as you type — try
              “essay draft #cs101 friday 5pm !high”.
            </span>
          ) : (
            <>
              {parsed.hints.map((hint) => (
                <span
                  key={hint}
                  className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent"
                >
                  {hint}
                </span>
              ))}
              <span className="text-[11px] text-subtle">— press Enter to add</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
