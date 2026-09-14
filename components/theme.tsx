"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { STORAGE_KEY } from "@/lib/store";
import type { ThemePreference } from "@/lib/types";
import { Segmented } from "./ui/segmented";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

/**
 * Runs before first paint so the page never flashes the wrong theme. It reads
 * the same localStorage blob the store owns, defaulting to the OS setting.
 */
export function ThemeScript() {
  const script = `(function(){try{var p="system";var raw=localStorage.getItem(${JSON.stringify(
    STORAGE_KEY,
  )});if(raw){var d=JSON.parse(raw);if(d&&d.preferences&&d.preferences.theme)p=d.preferences.theme}var dark=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",dark?"dark":"light")}catch(e){document.documentElement.setAttribute("data-theme","light")}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

/** Keeps `data-theme` in step with the stored preference and the OS setting. */
export function ThemeSync() {
  const { data, hydrated } = useStore();
  const preference = data.preferences.theme;

  useEffect(() => {
    if (!hydrated) return;
    applyTheme(preference);
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference, hydrated]);

  return null;
}

export function ThemeToggle({ size = "md" }: { size?: "sm" | "md" }) {
  const { data, setPreferences } = useStore();
  return (
    <Segmented<ThemePreference>
      ariaLabel="Colour theme"
      size={size}
      value={data.preferences.theme}
      onChange={(theme) => setPreferences({ theme })}
      options={[
        { value: "light", label: "Light", iconOnly: true, icon: <SunIcon size={14} /> },
        { value: "dark", label: "Dark", iconOnly: true, icon: <MoonIcon size={14} /> },
        { value: "system", label: "System", iconOnly: true, icon: <MonitorIcon size={14} /> },
      ]}
    />
  );
}
