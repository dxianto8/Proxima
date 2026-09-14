"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  /** Draws a divider above this item. */
  separated?: boolean;
}

export interface MenuPosition {
  x: number;
  y: number;
}

/**
 * A right-click menu rendered in a portal at the cursor. Closes on selection,
 * Escape, outside click, scroll or resize, and flips back inside the viewport
 * when opened near an edge.
 */
export function ContextMenu({
  position,
  items,
  onClose,
  label,
}: {
  position: MenuPosition | null;
  items: MenuItem[];
  onClose: () => void;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [offset, setOffset] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Measure after paint so the menu can be nudged back on screen before it
  // is visible at the wrong spot.
  useLayoutEffect(() => {
    if (!position) {
      setOffset(null);
      return;
    }
    const menu = menuRef.current;
    if (!menu) {
      setOffset(position);
      return;
    }
    const { width, height } = menu.getBoundingClientRect();
    const margin = 8;
    setOffset({
      x: Math.min(position.x, window.innerWidth - width - margin),
      y: Math.min(position.y, window.innerHeight - height - margin),
    });
  }, [position]);

  useEffect(() => {
    if (!position) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    // A menu pinned to a page coordinate is wrong the moment anything moves.
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [position, onClose]);

  // Give the first item focus so the menu is keyboard-navigable.
  useEffect(() => {
    if (!position) return;
    menuRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [position, offset]);

  if (!mounted || !position) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      style={{ left: offset?.x ?? position.x, top: offset?.y ?? position.y }}
      className={cn(
        "animate-in-up fixed z-[60] min-w-[184px] overflow-hidden rounded-lg p-1",
        "border border-border bg-surface shadow-overlay",
        offset ? "visible" : "invisible",
      )}
      onKeyDown={(event) => {
        const buttons = Array.from(
          menuRef.current?.querySelectorAll<HTMLElement>("button") ?? [],
        );
        const index = buttons.indexOf(document.activeElement as HTMLElement);
        if (event.key === "ArrowDown") {
          event.preventDefault();
          buttons[(index + 1) % buttons.length]?.focus();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
        }
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          role="menuitem"
          type="button"
          onClick={() => {
            onClose();
            item.onSelect();
          }}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left",
            "text-[13px] transition-colors duration-100",
            item.separated && "mt-1 border-t border-border pt-2",
            item.danger
              ? "text-danger hover:bg-danger-soft"
              : "text-text hover:bg-surface-2",
          )}
        >
          <span className={cn("shrink-0", item.danger ? "text-danger" : "text-subtle")}>
            {item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}

/** Tracks where a right-click happened, for driving {@link ContextMenu}. */
export function useContextMenu<T>() {
  const [state, setState] = useState<{ target: T; position: MenuPosition } | null>(null);

  function open(event: React.MouseEvent, target: T) {
    event.preventDefault();
    event.stopPropagation();
    setState({ target, position: { x: event.clientX, y: event.clientY } });
  }

  return { state, open, close: () => setState(null) };
}
