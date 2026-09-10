"use client";

import { useSyncExternalStore, type RefObject } from "react";
import { W98Icon } from "@/components/desktop/w98-icon";
import type { PublicAppDefinition } from "@/lib/public-apps";

export type DesktopTask = PublicAppDefinition & { taskHref: string };

const subscribeToClock = (notify: () => void) => {
  const interval = window.setInterval(notify, 1_000);
  return () => window.clearInterval(interval);
};
const getClockSnapshot = () => Math.floor(Date.now() / 60_000);
const getClockServerSnapshot = () => 0;

function Clock() {
  const minute = useSyncExternalStore(subscribeToClock, getClockSnapshot, getClockServerSnapshot);
  const date = minute ? new Date(minute * 60_000) : null;
  const value = date ? new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(date) : "--:--";
  return <time dateTime={date?.toISOString()}>{value}</time>;
}

export function Taskbar({ activeHref, isStartOpen, onActivate, onToggleStart, startButtonRef, tasks }: { activeHref: string; isStartOpen: boolean; onActivate: (task: DesktopTask) => void; onToggleStart: () => void; startButtonRef: RefObject<HTMLButtonElement | null>; tasks: DesktopTask[] }) {
  return (
    <footer className="taskbar" aria-label="Desktop taskbar">
      <button className="start-button" aria-controls="start-menu" aria-expanded={isStartOpen} aria-haspopup="menu" onClick={onToggleStart} ref={startButtonRef}>
        <span className="start-mark" aria-hidden="true"><i /><i /><i /><i /></span>
        <strong>Start</strong>
      </button>
      <div className="taskbar__divider" aria-hidden="true" />
      <div className="taskbar__tasks" aria-label="Open windows">
        {tasks.map((task) => (
          <button className={activeHref === task.taskHref ? "is-active" : ""} key={task.taskHref} onClick={() => onActivate(task)}>
            <W98Icon icon={task.icon} size={16} />
            <span>{task.title}</span>
          </button>
        ))}
      </div>
      <div className="taskbar__tray"><Clock /></div>
    </footer>
  );
}
