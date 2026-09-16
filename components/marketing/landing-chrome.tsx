"use client";

import { useEffect, useRef } from "react";

/**
 * Marks the document while the landing page is mounted, which blacks out the
 * page behind it and suppresses any wallpaper set inside the app. Cleared on
 * unmount so navigating into the product restores the user's own theme.
 */
export function LandingChrome() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.landing = "true";
    return () => {
      delete root.dataset.landing;
    };
  }, []);

  return null;
}

/**
 * Drifts the hero's glow at a fraction of the scroll speed. Driven from a
 * rAF-throttled scroll listener rather than a scroll handler that writes
 * styles directly, so it stays on one style write per frame.
 */
export function HeroGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const offset = Math.min(window.scrollY, 600) * 0.25;
      element.style.transform = `translate3d(0, ${offset}px, 0)`;
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_70%_at_50%_0%,var(--accent-soft),transparent)] will-change-transform"
    />
  );
}
