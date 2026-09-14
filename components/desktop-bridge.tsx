"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTaskEditor } from "./task-editor";
import { useCanvasSync } from "./canvas/sync-provider";

interface DesktopApi {
  isDesktop: true;
  platform: string;
  onMenuCommand: (handler: (command: string) => void) => () => void;
}

declare global {
  interface Window {
    proxima?: DesktopApi;
  }
}

/**
 * Connects the app to the Electron shell when one is present, and does nothing
 * at all in a browser. Two jobs: honour the native menu (⌘N, ⌘1–⌘5, ⌘F), and
 * reserve room at the top of the window for macOS's inset traffic lights.
 */
export function DesktopBridge() {
  const router = useRouter();
  const { openNew } = useTaskEditor();
  const { sync } = useCanvasSync();

  useEffect(() => {
    const api = window.proxima;
    if (!api?.isDesktop) return;

    const root = document.documentElement;
    root.dataset.desktop = api.platform === "darwin" ? "mac" : "other";

    return api.onMenuCommand((command) => {
      if (command === "new-task") {
        openNew();
      } else if (command === "sync") {
        void sync();
      } else if (command === "search") {
        const search = document.querySelector<HTMLInputElement>('input[aria-label="Search tasks"]');
        search?.focus();
        search?.select();
      } else if (command.startsWith("go:")) {
        router.push(command.slice(3));
      }
    });
  }, [router, openNew, sync]);

  return null;
}

/**
 * The strip behind the traffic lights. It is a drag handle, so the window
 * still moves even though the title bar is hidden.
 */
export function DesktopTitlebar() {
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-40 h-[var(--titlebar-h)] bg-bg"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    />
  );
}
