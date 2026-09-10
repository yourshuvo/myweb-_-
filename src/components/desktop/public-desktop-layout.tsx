"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { DesktopWindowContext } from "@/components/desktop/desktop-context";
import { StartMenu } from "@/components/desktop/start-menu";
import { Taskbar, type DesktopTask } from "@/components/desktop/taskbar";
import { W98Icon } from "@/components/desktop/w98-icon";
import { desktopShortcutApps, resolvePublicApp, type PublicAppDefinition } from "@/lib/public-apps";

gsap.registerPlugin(useGSAP);

function asTask(app: PublicAppDefinition, href = app.href): DesktopTask {
  return { ...app, taskHref: href };
}

export function PublicDesktopLayout({ children, siteTitle }: { children: React.ReactNode; siteTitle: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const currentApp = useMemo(() => resolvePublicApp(pathname), [pathname]);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [minimized, setMinimized] = useState<Set<string>>(() => new Set());
  const [knownTasks, setKnownTasks] = useState<DesktopTask[]>(() => [asTask(currentApp, pathname)]);

  const tasks = useMemo(() => {
    const taskMap = new Map(knownTasks.map((task) => [task.taskHref, task]));
    taskMap.set(pathname, asTask(currentApp, pathname));
    return Array.from(taskMap.values());
  }, [currentApp, knownTasks, pathname]);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      if (sessionStorage.getItem("w98-desktop-revealed")) return;
      gsap.from("[data-desktop-shortcut]", { autoAlpha: 0, y: 6, duration: 0.18, stagger: 0.035, ease: "power1.out" });
      sessionStorage.setItem("w98-desktop-revealed", "1");
    });
    return () => media.revert();
  }, { scope: rootRef });

  function registerTask(app: PublicAppDefinition, href = app.href) {
    setKnownTasks((current) => current.some((task) => task.taskHref === href) ? current : [...current, asTask(app, href)]);
    setMinimized((current) => {
      if (!current.has(href)) return current;
      const next = new Set(current);
      next.delete(href);
      return next;
    });
  }

  function openApp(app: PublicAppDefinition) {
    registerTask(app);
    setStartOpen(false);
    setSelectedIcon(null);
    router.push(app.href);
  }

  function activateTask(task: DesktopTask) {
    registerTask(task, task.taskHref);
    router.push(task.taskHref);
  }

  const minimizeWindow = useCallback(() => {
    setMinimized((current) => new Set(current).add(pathname));
  }, [pathname]);

  const closeWindow = useCallback(() => {
    if (pathname === "/") {
      minimizeWindow();
      return;
    }
    const remaining = tasks.filter((task) => task.taskHref !== pathname);
    const destination = remaining.at(-1)?.taskHref || "/";
    const nextTasks = remaining.some((task) => task.taskHref === "/") ? remaining : [asTask(resolvePublicApp("/"), "/"), ...remaining];
    setKnownTasks(nextTasks);
    router.push(destination);
  }, [minimizeWindow, pathname, router, tasks]);

  const controls = useMemo(() => ({
    isMinimized: minimized.has(pathname),
    closeWindow,
    minimizeWindow,
  }), [closeWindow, minimizeWindow, minimized, pathname]);

  return (
    <DesktopWindowContext.Provider value={controls}>
      <div className="win98-desktop" ref={rootRef} onPointerDown={(event) => {
        if (startOpen && !(event.target as Element).closest(".start-menu, .start-button")) setStartOpen(false);
      }}>
        <nav className="win98-desktop__shortcuts" aria-label="Desktop shortcuts">
          {desktopShortcutApps.map((app) => (
            <button
              aria-pressed={selectedIcon === app.id}
              className="desktop-icon"
              data-desktop-shortcut
              key={app.id}
              onClick={() => setSelectedIcon(app.id)}
              onDoubleClick={() => openApp(app)}
              onKeyDown={(event) => {
                if (event.key === "Enter") openApp(app);
              }}
              onPointerUp={(event) => {
                if (event.pointerType === "touch") openApp(app);
              }}
            >
              <W98Icon icon={app.icon} size={32} />
              <span>{app.mobileLabel}</span>
            </button>
          ))}
        </nav>

        <div className={`win98-desktop__route${minimized.has(pathname) ? " is-minimized" : ""}`}>
          {children}
        </div>

        {startOpen && <div id="start-menu"><StartMenu siteTitle={siteTitle} onClose={() => { setStartOpen(false); startButtonRef.current?.focus(); }} onOpenApp={openApp} /></div>}
        <Taskbar activeHref={minimized.has(pathname) ? "" : pathname} isStartOpen={startOpen} onActivate={activateTask} onToggleStart={() => setStartOpen((open) => !open)} startButtonRef={startButtonRef} tasks={tasks} />
      </div>
    </DesktopWindowContext.Provider>
  );
}
