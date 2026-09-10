"use client";

import { useState, type ReactNode } from "react";

type ReaderSize = "small" | "comfortable" | "large";

const sizes: Array<{ value: ReaderSize; label: string }> = [
  { value: "small", label: "Small" },
  { value: "comfortable", label: "Default" },
  { value: "large", label: "Large" },
];

export function PostReader({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<ReaderSize>("comfortable");
  const [copyStatus, setCopyStatus] = useState("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("Link copied.");
    } catch {
      setCopyStatus("The link could not be copied. Use the address bar instead.");
    }
  }

  return (
    <div className={`post-reader post-reader--${size}`}>
      <div className="post-reader-toolbar" role="toolbar" aria-label="Reading controls">
        <span className="post-reader-toolbar__label">Text size</span>
        <span className="post-reader-size-controls">
          {sizes.map((option) => (
            <button
              aria-pressed={size === option.value}
              key={option.value}
              onClick={() => setSize(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </span>
        <span className="post-reader-toolbar__spacer" />
        <button type="button" onClick={() => void copyLink()}>Copy link</button>
        <button type="button" onClick={() => window.print()}>Print</button>
        <span className="sr-only" role="status" aria-live="polite">{copyStatus}</span>
      </div>
      <div className="post-reader-canvas">{children}</div>
    </div>
  );
}
