"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useDesktopWindow } from "@/components/desktop/desktop-context";
import { W98Icon } from "@/components/desktop/w98-icon";
import { parentHref, resolvePublicApp } from "@/lib/public-apps";

gsap.registerPlugin(useGSAP);

export function Win98Window({ children, displayName, showVisitorCount, title, visitorCounter }: { children: React.ReactNode; displayName: string; showVisitorCount: boolean; title: string; visitorCounter: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const windowRef = useRef<HTMLElement>(null);
  const previousMinimizedRef = useRef(false);
  const [isMinimizing, setIsMinimizing] = useState(false);
  const app = resolvePublicApp(pathname);
  const { closeWindow, isMinimized, minimizeWindow } = useDesktopWindow();
  const { contextSafe } = useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(windowRef.current, { autoAlpha: 0, y: 4, duration: 0.16, ease: "power1.out" });
    });
    return () => media.revert();
  }, { scope: windowRef });

  useGSAP(() => {
    const wasMinimized = previousMinimizedRef.current;
    previousMinimizedRef.current = isMinimized;
    if (!wasMinimized || isMinimized || !windowRef.current) return;

    setIsMinimizing(false);
    gsap.killTweensOf(windowRef.current);
    gsap.set(windowRef.current, { clearProps: "opacity,visibility,transform" });
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(windowRef.current, { autoAlpha: 0, y: 4 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: "power1.out" });
    });
    return () => media.revert();
  }, { scope: windowRef, dependencies: [isMinimized] });

  const runAndFinish = contextSafe((event: React.MouseEvent<HTMLButtonElement>, finish: () => void, direction: "close" | "minimize") => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsMinimizing(false);
      finish();
      return;
    }
    const target = event.currentTarget.closest("[data-public-window]");
    if (!target) {
      finish();
      return;
    }
    if (direction === "minimize") {
      setIsMinimizing(true);
      finish();
      gsap.to(target, { autoAlpha: 0, y: 8, duration: 0.12, onComplete: () => setIsMinimizing(false) });
      return;
    }
    gsap.to(target, { autoAlpha: 0, y: 2, duration: 0.12, onComplete: finish });
  });

  return (
    <main className={`win98-window-shell ${app.windowClass || ""}`} id="main-content">
      <section className="retro-window public-window" data-public-window ref={windowRef} aria-label={title} hidden={isMinimized && !isMinimizing}>
        <header className="retro-titlebar">
          <div className="retro-titlebar__label"><W98Icon icon={app.icon} size={16} /><span>{title}</span></div>
          <div className="retro-titlebar__controls">
            <button aria-label={`Minimize ${title}`} onClick={(event) => runAndFinish(event, minimizeWindow, "minimize")}><span aria-hidden="true">_</span></button>
            <button aria-label={`Close ${title}`} onClick={(event) => runAndFinish(event, closeWindow, "close")}><span aria-hidden="true">×</span></button>
          </div>
        </header>
        <nav className="retro-menubar" aria-label="Window commands">
          <button onClick={() => router.back()}><span aria-hidden="true">←</span> Back</button>
          <Link href={parentHref(pathname)}><W98Icon icon="folder-open" size={16} /> Up</Link>
          <Link href="/"><W98Icon icon="computer" size={16} /> Home</Link>
        </nav>
        <div className="win98-addressbar"><span>Address</span><output>{pathname === "/" ? "C:\\WINDOWS\\Desktop\\Welcome.txt" : `C:\\My Website${pathname.replaceAll("/", "\\")}`}</output></div>
        <div className="retro-window__content">{children}</div>
        <footer className="retro-statusbar">
          <span>Ready</span>
          <span>{displayName || "Personal website"}</span>
          {showVisitorCount ? visitorCounter : <span className="status-grip" aria-hidden="true" />}
        </footer>
      </section>
    </main>
  );
}
