"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useStore, type ImportResult } from "@/lib/store";
import type { CanvasItem } from "@/lib/types";
import { describeError, postCanvas } from "@/lib/canvas-client";
import { CanvasImportDialog } from "./import-dialog";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export interface SyncFailure {
  message: string;
  hint?: string;
}

interface CanvasSyncApi {
  /** A connection is saved, so a one-click sync is meaningful. */
  connected: boolean;
  syncing: boolean;
  /** Result of the most recent completed import, for showing a summary. */
  lastResult: ImportResult | null;
  error: SyncFailure | null;
  sync: () => Promise<void>;
  clearResult: () => void;
}

const CanvasSyncContext = createContext<CanvasSyncApi | null>(null);

export function useCanvasSync(): CanvasSyncApi {
  const ctx = useContext(CanvasSyncContext);
  if (!ctx) throw new Error("useCanvasSync must be used inside <CanvasSyncProvider>");
  return ctx;
}

/**
 * Owns the "fetch from Canvas, then confirm what to import" flow so both the
 * Settings panel and the top bar's refresh button drive the same thing — and
 * so the preview dialog exists once, wherever the sync was started from.
 */
export function CanvasSyncProvider({ children }: { children: React.ReactNode }) {
  const { data } = useStore();
  const { baseUrl, token, selectedCourseIds, includeEvents } = data.canvas;

  const [items, setItems] = useState<CanvasItem[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<SyncFailure | null>(null);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  const connected = Boolean(baseUrl && token);

  const sync = useCallback(async () => {
    setError(null);
    setLastResult(null);

    if (!connected) {
      setError({
        message: "Canvas isn't connected yet.",
        hint: "Add your Canvas address and access token in Settings.",
      });
      return;
    }
    if (selectedCourseIds.length === 0) {
      setError({
        message: "No courses are selected to sync.",
        hint: "Connect in Settings and tick the courses you want to follow.",
      });
      return;
    }

    setSyncing(true);
    try {
      const response = await postCanvas<{ items: CanvasItem[] }>("/api/canvas/items", {
        baseUrl,
        token,
        courseIds: selectedCourseIds,
        includeEvents,
      });
      setItems(response.items);
      setShowImport(true);
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setSyncing(false);
    }
  }, [connected, baseUrl, token, selectedCourseIds, includeEvents]);

  const value = useMemo<CanvasSyncApi>(
    () => ({
      connected,
      syncing,
      lastResult,
      error,
      sync,
      clearResult: () => setLastResult(null),
    }),
    [connected, syncing, lastResult, error, sync],
  );

  return (
    <CanvasSyncContext.Provider value={value}>
      {children}

      <CanvasImportDialog
        open={showImport}
        items={items}
        onClose={() => setShowImport(false)}
        onImported={setLastResult}
      />

      <Modal
        open={Boolean(error)}
        onClose={() => setError(null)}
        title="Couldn't sync with Canvas"
        className="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setError(null)}>
              Close
            </Button>
            <Link href="/settings" onClick={() => setError(null)}>
              <Button variant="primary" data-autofocus>
                Open Canvas settings
              </Button>
            </Link>
          </>
        }
      >
        <Alert tone="error" title={error?.message}>
          {error?.hint}
        </Alert>
      </Modal>
    </CanvasSyncContext.Provider>
  );
}
