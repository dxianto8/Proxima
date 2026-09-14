"use client";

import { useMemo, useState } from "react";
import type { CanvasItem, Task } from "@/lib/types";
import { useStore, type ImportResult } from "@/lib/store";
import { formatDue } from "@/lib/date";
import { cn, pluralize } from "@/lib/utils";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert } from "@/components/ui/alert";

interface Row {
  item: CanvasItem;
  existing: Task | undefined;
  past: boolean;
}

/**
 * Preview step between "fetch from Canvas" and "write to my task list".
 * Nothing is imported until the user confirms what they can see.
 */
export function CanvasImportDialog({
  open,
  items,
  onClose,
  onImported,
}: {
  open: boolean;
  items: CanvasItem[];
  onClose: () => void;
  onImported: (result: ImportResult) => void;
}) {
  const { data, importCanvasItems } = useStore();
  const [hidePast, setHidePast] = useState(true);
  const [hideSubmitted, setHideSubmitted] = useState(true);
  const [markSubmittedDone, setMarkSubmittedDone] = useState(true);
  const [deselected, setDeselected] = useState<Set<string>>(() => new Set());

  const existingByKey = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of data.tasks) if (task.canvas) map.set(task.canvas.key, task);
    return map;
  }, [data.tasks]);

  const now = new Date();

  const rows = useMemo<Row[]>(
    () =>
      items.map((item) => ({
        item,
        existing: existingByKey.get(item.key),
        past: Boolean(item.dueAt && new Date(item.dueAt) < now),
      })),
    // `now` is intentionally captured per render; the list is short-lived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, existingByKey],
  );

  const visible = useMemo(
    () =>
      rows.filter((row) => {
        if (hidePast && row.past && !row.existing) return false;
        if (hideSubmitted && row.item.submitted && !row.existing) return false;
        return true;
      }),
    [rows, hidePast, hideSubmitted],
  );

  const selectedKeys = visible
    .filter((row) => !deselected.has(row.item.key))
    .map((row) => row.item.key);

  const byCourse = useMemo(() => {
    const groups = new Map<string, Row[]>();
    for (const row of visible) {
      const bucket = groups.get(row.item.courseName);
      if (bucket) bucket.push(row);
      else groups.set(row.item.courseName, [row]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

  const newCount = visible.filter(
    (row) => !row.existing && !deselected.has(row.item.key),
  ).length;
  const updateCount = selectedKeys.length - newCount;

  function toggle(key: string) {
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    const allSelected = selectedKeys.length === visible.length;
    setDeselected(allSelected ? new Set(visible.map((row) => row.item.key)) : new Set());
  }

  function run() {
    const result = importCanvasItems(items, {
      keys: selectedKeys,
      markSubmittedDone,
    });
    onImported(result);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import from Canvas"
      description={`${pluralize(items.length, "item")} found across ${pluralize(
        new Set(items.map((i) => i.courseId)).size,
        "course",
      )}`}
      className="max-w-2xl"
      footer={
        <>
          <span className="mr-auto text-[12.5px] text-muted">
            {selectedKeys.length === 0
              ? "Nothing selected"
              : `${newCount} new${updateCount > 0 ? `, ${updateCount} to update` : ""}`}
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={run} disabled={selectedKeys.length === 0}>
            Import {selectedKeys.length || ""}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="divide-y divide-border rounded-lg border border-border bg-surface-2/50 px-3">
          <ToggleRow
            label="Hide items already past due"
            checked={hidePast}
            onChange={setHidePast}
          />
          <ToggleRow
            label="Hide items you've submitted"
            checked={hideSubmitted}
            onChange={setHideSubmitted}
          />
          <ToggleRow
            label="Mark submitted work as done"
            hint="Anything Canvas shows as turned in arrives already ticked off."
            checked={markSubmittedDone}
            onChange={setMarkSubmittedDone}
          />
        </div>

        {visible.length === 0 ? (
          <Alert tone="info" title="Nothing to import with these filters">
            Turn off &ldquo;hide past due&rdquo; or &ldquo;hide submitted&rdquo; to see the rest.
          </Alert>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-muted">
                {pluralize(visible.length, "item")} shown
              </p>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedKeys.length === visible.length ? "Deselect all" : "Select all"}
              </Button>
            </div>

            <div className="space-y-4">
              {byCourse.map(([courseName, courseRows]) => (
                <section key={courseName}>
                  <h3 className="mb-1.5 px-0.5 text-[12px] font-semibold text-text">
                    {courseName}
                    <span className="ml-1.5 font-normal text-subtle">
                      {courseRows.length}
                    </span>
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <div className="divide-y divide-border">
                      {courseRows.map(({ item, existing, past }) => {
                        const checked = !deselected.has(item.key);
                        return (
                          <label
                            key={item.key}
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors",
                              checked ? "bg-surface" : "bg-surface-2/40",
                              "hover:bg-surface-2",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(item.key)}
                              className="mt-[3px] h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "truncate text-[13px]",
                                  checked ? "text-text" : "text-subtle",
                                )}
                              >
                                {item.title}
                              </p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted">
                                <span className={cn("tabular", past && "text-danger")}>
                                  {item.dueAt
                                    ? formatDue(item.dueAt, true, now)
                                    : "No due date"}
                                </span>
                                {item.pointsPossible !== null ? (
                                  <span className="tabular">{item.pointsPossible} pts</span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-1">
                              {item.kind !== "assignment" ? (
                                <Badge className="capitalize">{item.kind}</Badge>
                              ) : null}
                              {item.submitted ? <Badge tone="success">Submitted</Badge> : null}
                              {existing ? <Badge tone="accent">Update</Badge> : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] text-text">{label}</p>
        {hint ? <p className="text-[11.5px] text-subtle">{hint}</p> : null}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
