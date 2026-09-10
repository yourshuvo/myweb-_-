"use client";

import { RetroButton } from "@/components/retro/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="system-message"><div className="retro-window"><div className="retro-titlebar"><strong>Application error</strong></div><div className="system-message__body"><span aria-hidden="true">⚠️</span><div><h1>That did not work</h1><p>The page ran into a problem while opening.</p><RetroButton onClick={reset}>Try again</RetroButton></div></div></div></main>;
}
