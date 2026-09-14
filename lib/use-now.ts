"use client";

import { useEffect, useState } from "react";

/**
 * A clock that ticks once a minute. Views derive "overdue", "today" and
 * relative labels from it, so a tab left open overnight still reads correctly.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const onFocus = () => setNow(new Date());
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMs]);

  return now;
}
