"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { AppData } from "@/lib/types";
import { pluralize } from "@/lib/utils";
import { PageContainer, PageHeader } from "@/components/app-shell";
import { CanvasPanel } from "@/components/canvas/canvas-panel";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/overlay";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DownloadIcon, UploadIcon } from "@/components/icons";

export default function SettingsPage() {
  const { data, hydrated, setPreferences, replaceAll, resetAll } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  if (!hydrated) return <PageSkeleton />;

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `proxima-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as AppData;
      if (!parsed || !Array.isArray(parsed.tasks)) throw new Error("no tasks array");
      replaceAll(parsed);
      setNotice({
        tone: "success",
        text: `Restored ${pluralize(parsed.tasks.length, "task")} and ${pluralize(
          parsed.courses?.length ?? 0,
          "course",
        )}.`,
      });
    } catch {
      setNotice({ tone: "error", text: "That file isn't a Proxima backup." });
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        subtitle="Canvas, appearance, and your local data."
      />

      <div className="space-y-8">
        <section>
          <SectionTitle
            title="Canvas"
            body="Pull assignments, quizzes and discussions straight from Instructure Canvas."
          />
          <CanvasPanel />
        </section>

        <section>
          <SectionTitle title="Appearance" />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            <Row label="Theme" hint="Follow your system, or pin light or dark.">
              <ThemeToggle />
            </Row>
            <Row label="Week starts on" hint="Applies to the calendar grid.">
              <Segmented<"0" | "1">
                ariaLabel="Week starts on"
                value={String(data.preferences.weekStartsOn) as "0" | "1"}
                onChange={(value) =>
                  setPreferences({ weekStartsOn: Number(value) as 0 | 1 })
                }
                options={[
                  { value: "0", label: "Sunday" },
                  { value: "1", label: "Monday" },
                ]}
              />
            </Row>
          </div>
        </section>

        <section>
          <SectionTitle
            title="Your data"
            body="Everything lives in this browser — nothing is uploaded to a Proxima server. Export a backup before clearing site data or switching machines."
          />
          <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={exportData}>
                <DownloadIcon size={15} />
                Export backup
              </Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <UploadIcon size={15} />
                Restore from file
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importData(file);
                  event.target.value = "";
                }}
              />
              <Button
                variant="ghost"
                className="ml-auto text-danger hover:bg-danger-soft hover:text-danger"
                onClick={() => setConfirmReset(true)}
              >
                Delete everything
              </Button>
            </div>

            <p className="text-[12.5px] text-subtle">
              {pluralize(data.tasks.length, "task")} · {pluralize(data.courses.length, "course")}
            </p>

            {notice ? (
              <Alert tone={notice.tone}>{notice.text}</Alert>
            ) : null}
          </div>
        </section>

        <section>
          <SectionTitle title="Keyboard shortcuts" />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            <Shortcut keys={["N"]} label="New task" />
            <Shortcut keys={["/"]} label="Search tasks" />
            <Shortcut keys={["Enter"]} label="Add the task you're typing" />
            <Shortcut keys={["Esc"]} label="Close a panel or clear the box" />
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAll();
          setNotice({ tone: "success", text: "All local data cleared." });
        }}
        title="Delete all Proxima data?"
        confirmLabel="Delete everything"
        body="Every task, course and the saved Canvas connection will be removed from this browser. Export a backup first if you might want it back."
      />
    </PageContainer>
  );
}

function SectionTitle({ title, body }: { title: string; body?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-text">{title}</h2>
      {body ? (
        <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-muted">{body}</p>
      ) : null}
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

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="flex gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-text"
          >
            {key}
          </kbd>
        ))}
      </span>
    </div>
  );
}
