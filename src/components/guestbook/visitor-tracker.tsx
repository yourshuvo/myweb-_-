"use client";

import { useEffect, useState } from "react";
import { formatVisitorCount } from "@/lib/guestbook-format";

export function VisitorTracker({ enabled, showCount = false }: { enabled: boolean; showCount?: boolean }) {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void fetch("/api/visitors", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<{ total: number | null }>)
      .then((payload) => setTotal(typeof payload.total === "number" ? payload.total : null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [enabled]);

  if (!showCount) return null;
  return <span className="visitor-counter" aria-live="polite">Visitor #{formatVisitorCount(total)}</span>;
}
