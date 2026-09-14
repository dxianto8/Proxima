"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore, type ImportResult } from "@/lib/store";
import type { CanvasCourse, CanvasItem } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CanvasImportDialog } from "./import-dialog";
import { CheckIcon, ExternalLinkIcon, LinkIcon, RefreshIcon } from "@/components/icons";

interface ApiError {
  error: string;
  hint?: string | null;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const failure = payload as ApiError;
    const error = new Error(failure.error || "Canvas request failed");
    (error as Error & { hint?: string }).hint = failure.hint ?? undefined;
    throw error;
  }
  return payload as T;
}

export function CanvasPanel() {
  const { data, setCanvas } = useStore();
  const connection = data.canvas;

  const [baseUrl, setBaseUrl] = useState(connection.baseUrl);
  const [token, setToken] = useState(connection.token);
  const [courses, setCourses] = useState<CanvasCourse[] | null>(null);
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [includeEvents, setIncludeEvents] = useState(false);
  const [busy, setBusy] = useState<"connect" | "fetch" | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [serverToken, setServerToken] = useState(false);

  // Adopt server-side defaults so a self-hosted install can skip this form.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/canvas/config")
      .then((response) => (response.ok ? response.json() : null))
      .then((config: { baseUrl?: string; hasServerToken?: boolean } | null) => {
        if (cancelled || !config) return;
        setServerToken(Boolean(config.hasServerToken));
        if (config.baseUrl) setBaseUrl((current) => current || config.baseUrl!);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = connection.selectedCourseIds;

  const connect = useCallback(async () => {
    setBusy("connect");
    setError(null);
    setResult(null);
    try {
      const response = await post<{ courses: CanvasCourse[] }>("/api/canvas/courses", {
        baseUrl,
        token,
      });
      setCourses(response.courses);
      setCanvas({ baseUrl: baseUrl.trim(), token: token.trim() });
      if (response.courses.length > 0 && selected.length === 0) {
        setCanvas({ selectedCourseIds: response.courses.map((course) => course.id) });
      }
    } catch (failure) {
      setCourses(null);
      setError({
        message: (failure as Error).message,
        hint: (failure as Error & { hint?: string }).hint,
      });
    } finally {
      setBusy(null);
    }
  }, [baseUrl, token, setCanvas, selected.length]);

  const fetchItems = useCallback(async () => {
    setBusy("fetch");
    setError(null);
    setResult(null);
    try {
      const response = await post<{ items: CanvasItem[] }>("/api/canvas/items", {
        baseUrl,
        token,
        courseIds: selected,
        includeEvents,
      });
      setItems(response.items);
      setShowImport(true);
    } catch (failure) {
      setError({
        message: (failure as Error).message,
        hint: (failure as Error & { hint?: string }).hint,
      });
    } finally {
      setBusy(null);
    }
  }, [baseUrl, token, selected, includeEvents]);

  function toggleCourse(id: number) {
    const next = selected.includes(id)
      ? selected.filter((value) => value !== id)
      : [...selected, id];
    setCanvas({ selectedCourseIds: next });
  }

  const canConnect = Boolean(baseUrl.trim()) && (Boolean(token.trim()) || serverToken);
  const connected = courses !== null;

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-text">
              Canvas connection
            </h3>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
              Proxima reads your courses and assignments through the Canvas API. Your token
              is stored in this browser and only ever sent to your own Canvas host.
            </p>
          </div>
          {connection.lastSyncAt ? (
            <Badge tone="success">
              <CheckIcon size={11} />
              Synced
            </Badge>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Canvas address" htmlFor="canvas-url">
            <Input
              id="canvas-url"
              value={baseUrl}
              placeholder="myschool.instructure.com"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
          </Field>
          <Field
            label="Access token"
            htmlFor="canvas-token"
            hint={
              serverToken && !token ? (
                "Using the token configured on the server."
              ) : (
                <a
                  href={
                    baseUrl.trim()
                      ? `https://${baseUrl.trim().replace(/^https?:\/\//, "")}/profile/settings`
                      : "https://community.canvaslms.com/t5/Student-Guide/How-do-I-manage-API-access-tokens-as-a-student/ta-p/273"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                >
                  Create one in Canvas → Account → Settings
                  <ExternalLinkIcon size={11} />
                </a>
              )
            }
          >
            <Input
              id="canvas-token"
              type="password"
              value={token}
              placeholder={serverToken ? "Configured on the server" : "1234~abcdef…"}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setToken(event.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            onClick={connect}
            disabled={!canConnect || busy !== null}
          >
            {busy === "connect" ? (
              <Spinner />
            ) : connected ? (
              <RefreshIcon size={15} />
            ) : (
              <LinkIcon size={15} />
            )}
            {busy === "connect"
              ? "Connecting…"
              : connected
                ? "Refresh course list"
                : "Connect to Canvas"}
          </Button>

          {connection.baseUrl || connection.token ? (
            <Button
              variant="ghost"
              onClick={() => {
                setCanvas({ baseUrl: "", token: "", selectedCourseIds: [], lastSyncAt: null });
                setBaseUrl("");
                setToken("");
                setCourses(null);
                setResult(null);
                setError(null);
              }}
            >
              Disconnect
            </Button>
          ) : null}

          {connection.lastSyncAt ? (
            <span className="text-[12px] text-subtle">
              Last sync {new Date(connection.lastSyncAt).toLocaleString()}
            </span>
          ) : null}
        </div>

        {error ? (
          <Alert tone="error" title={error.message}>
            {error.hint}
          </Alert>
        ) : null}

        {result ? (
          <Alert tone="success" title="Import finished">
            {[
              result.created > 0 ? `${pluralize(result.created, "task")} added` : null,
              result.updated > 0 ? `${result.updated} updated` : null,
              result.coursesCreated > 0
                ? `${pluralize(result.coursesCreated, "course")} created`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Everything was already up to date."}
          </Alert>
        ) : null}
      </div>

      {connected ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-text">
                Courses to sync
              </h3>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {courses.length === 0
                  ? "This token can't see any active courses."
                  : `${selected.length} of ${courses.length} selected`}
              </p>
            </div>
            {courses.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCanvas({
                    selectedCourseIds:
                      selected.length === courses.length ? [] : courses.map((c) => c.id),
                  })
                }
              >
                {selected.length === courses.length ? "Clear" : "Select all"}
              </Button>
            ) : null}
          </div>

          {courses.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="divide-y divide-border">
                  {courses.map((course) => {
                    const checked = selected.includes(course.id);
                    return (
                      <label
                        key={course.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-surface-2",
                          !checked && "opacity-60",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCourse(course.id)}
                          className="h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-text">{course.name}</p>
                          {course.courseCode || course.term ? (
                            <p className="truncate text-[11.5px] text-subtle">
                              {[course.courseCode, course.term].filter(Boolean).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/50 px-3 py-2.5">
                <div>
                  <p className="text-[13px] text-text">Include course calendar events</p>
                  <p className="text-[11.5px] text-subtle">
                    Lectures, labs and other non-graded entries.
                  </p>
                </div>
                <Switch
                  checked={includeEvents}
                  onChange={setIncludeEvents}
                  label="Include course calendar events"
                />
              </div>

              <Button
                variant="primary"
                onClick={fetchItems}
                disabled={selected.length === 0 || busy !== null}
              >
                {busy === "fetch" ? <Spinner /> : <RefreshIcon size={15} />}
                {busy === "fetch"
                  ? "Loading assignments…"
                  : connection.lastSyncAt
                    ? "Sync now"
                    : "Fetch assignments"}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      <CanvasImportDialog
        open={showImport}
        items={items}
        onClose={() => setShowImport(false)}
        onImported={setResult}
      />
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
    />
  );
}
