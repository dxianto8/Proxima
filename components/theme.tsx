"use client";

import { useEffect } from "react";
import { useStore, STORAGE_KEY } from "@/lib/store";
import { BACKGROUND_KEY, readBackground } from "@/lib/background-store";
import type { CustomTheme, ThemePreference } from "@/lib/types";
import { Segmented } from "./ui/segmented";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

/** Every custom property a theme may override, so switching back clears cleanly. */
const THEMED_VARS = [
  "--accent",
  "--accent-hover",
  "--accent-soft",
  "--accent-text",
  "--bg",
  "--surface",
  "--surface-2",
  "--surface-3",
  "--border",
  "--border-strong",
] as const;

/**
 * Runs before first paint so the page never flashes the stock palette, the
 * wrong mode, or a missing wallpaper. It reads the same two localStorage keys
 * the app owns and applies precomputed values — no colour maths here, which is
 * why `customTheme` stores its variable maps rather than just a seed.
 */
export function ThemeScript() {
  const script = `(function(){try{
var root=document.documentElement;
root.classList.add("js");
var p="system",custom=null,dim=72;
var raw=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
if(raw){var d=JSON.parse(raw);if(d&&d.preferences){
  if(d.preferences.theme)p=d.preferences.theme;
  if(d.preferences.customTheme)custom=d.preferences.customTheme;
  if(typeof d.preferences.backgroundDim==="number")dim=d.preferences.backgroundDim;
}}
var dark=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
root.setAttribute("data-theme",dark?"dark":"light");
if(custom){var vars=dark?custom.dark:custom.light;for(var k in vars)root.style.setProperty(k,vars[k]);}
var bg=localStorage.getItem(${JSON.stringify(BACKGROUND_KEY)});
if(bg){root.style.setProperty("--bg-image","url("+JSON.stringify(bg)+")");
root.style.setProperty("--bg-dim",String(dim));
root.setAttribute("data-has-bg","true");}
}catch(e){document.documentElement.setAttribute("data-theme","light")}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

function resolveDark(preference: ThemePreference): boolean {
  return (
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

function applyTheme(preference: ThemePreference, custom: CustomTheme | null) {
  const root = document.documentElement;
  const dark = resolveDark(preference);
  root.setAttribute("data-theme", dark ? "dark" : "light");

  if (!custom) {
    for (const name of THEMED_VARS) root.style.removeProperty(name);
    return;
  }
  const vars = dark ? custom.dark : custom.light;
  for (const name of THEMED_VARS) {
    const value = vars[name];
    if (value) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  }
}

/** Applies the background image and its scrim, or removes both. */
export function applyBackground(dim: number) {
  const root = document.documentElement;
  const image = readBackground();
  if (image) {
    root.style.setProperty("--bg-image", `url(${JSON.stringify(image)})`);
    root.style.setProperty("--bg-dim", String(dim));
    root.setAttribute("data-has-bg", "true");
  } else {
    root.style.removeProperty("--bg-image");
    root.style.removeProperty("--bg-dim");
    root.removeAttribute("data-has-bg");
  }
}

/** Keeps the document in step with stored appearance preferences. */
export function ThemeSync() {
  const { data, hydrated } = useStore();
  const { theme, customTheme, backgroundDim } = data.preferences;

  useEffect(() => {
    if (!hydrated) return;
    applyTheme(theme, customTheme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system", customTheme);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, customTheme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    applyBackground(backgroundDim);
  }, [backgroundDim, hydrated]);

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
