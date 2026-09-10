"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { W98Icon } from "@/components/desktop/w98-icon";
import { logoutAction } from "@/lib/auth/actions";
import { adminApps, adminParentHref, resolveAdminApp, type AdminAppDefinition } from "@/lib/admin-apps";

type AdminTask = AdminAppDefinition & { taskHref: string };

const subscribeClock = (notify: () => void) => {
  const timer = window.setInterval(notify, 1_000);
  return () => window.clearInterval(timer);
};
const clockSnapshot = () => Math.floor(Date.now() / 60_000);
const serverClockSnapshot = () => 0;

function AdminClock() {
  const minute = useSyncExternalStore(subscribeClock, clockSnapshot, serverClockSnapshot);
  const date = minute ? new Date(minute * 60_000) : null;
  return <time dateTime={date?.toISOString()}>{date ? new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(date) : "--:--"}</time>;
}

function asTask(app: AdminAppDefinition, taskHref = app.href): AdminTask {
  return { ...app, taskHref };
}

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentApp = resolveAdminApp(pathname);
  const [selected, setSelected] = useState<AdminAppDefinition["id"] | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [minimized, setMinimized] = useState<Set<string>>(() => new Set());
  const [knownTasks, setKnownTasks] = useState<AdminTask[]>(() => [asTask(currentApp, pathname)]);
  const startButtonRef = useRef<HTMLButtonElement>(null);

  const tasks = (() => {
    const map = new Map(knownTasks.map((task) => [task.taskHref, task]));
    map.set(pathname, asTask(currentApp, pathname));
    return [...map.values()];
  })();

  function mayNavigate() {
    return window.dispatchEvent(new Event("admin:navigation-request", { cancelable: true }));
  }

  function registerTask(app: AdminAppDefinition, href = app.href) {
    setKnownTasks((current) => current.some((task) => task.taskHref === href) ? current : [...current, asTask(app, href)]);
    setMinimized((current) => {
      if (!current.has(href)) return current;
      const next = new Set(current);
      next.delete(href);
      return next;
    });
  }

  function openApp(app: AdminAppDefinition) {
    if (app.href !== pathname && !mayNavigate()) return;
    registerTask(app);
    setSelected(null);
    setStartOpen(false);
    router.push(app.href);
  }

  function activateTask(task: AdminTask) {
    if (task.taskHref !== pathname && !mayNavigate()) return;
    registerTask(task, task.taskHref);
    router.push(task.taskHref);
  }

  function minimize() {
    setMinimized((current) => new Set(current).add(pathname));
  }

  function close() {
    if (!mayNavigate()) return;
    if (pathname === "/admin") {
      minimize();
      return;
    }
    const remaining = tasks.filter((task) => task.taskHref !== pathname);
    setKnownTasks(remaining);
    router.push(remaining.at(-1)?.taskHref || "/admin");
  }

  function navigate(href: string) {
    if (href !== pathname && !mayNavigate()) return;
    setStartOpen(false);
    router.push(href);
  }

  return (
    <div className="win98-admin-desktop" onPointerDown={(event) => {
      if (startOpen && !(event.target as Element).closest(".admin-start-menu, .admin-start-button")) setStartOpen(false);
    }}>
      <nav className="admin-desktop-shortcuts" aria-label="Admin desktop shortcuts">
        {adminApps.map((app) => (
          <button
            aria-pressed={selected === app.id}
            className="admin-desktop-icon"
            key={app.id}
            onClick={() => setSelected(app.id)}
            onDoubleClick={() => openApp(app)}
            onKeyDown={(event) => { if (event.key === "Enter") openApp(app); }}
            onPointerUp={(event) => { if (event.pointerType === "touch") openApp(app); }}
          >
            <W98Icon icon={app.icon} size={32} />
            <span>{app.label}</span>
          </button>
        ))}
      </nav>

      <div className={`admin-route-window${minimized.has(pathname) ? " is-minimized" : ""}`}>
        <section className={`admin-window${pathname.startsWith("/admin/posts/") ? " admin-window--post-editor" : ""}`} aria-label={currentApp.title}>
          <div className="admin-window-titlebar">
            <span><W98Icon icon={currentApp.icon} size={16} /><strong>{currentApp.title}</strong></span>
            <span className="admin-window-controls">
              <button type="button" onClick={minimize} aria-label="Minimize">_</button>
              <button type="button" onClick={close} aria-label="Close">×</button>
            </span>
          </div>
          <nav className="admin-window-toolbar" aria-label="Window navigation">
            <button type="button" onClick={() => { if (mayNavigate()) router.back(); }}>Back</button>
            <button type="button" onClick={() => navigate(adminParentHref(pathname))} disabled={pathname === "/admin"}>Up</button>
            <button type="button" onClick={() => navigate("/admin")}>Home</button>
            <span className="admin-address-field"><strong>Address</strong><output>{pathname}</output></span>
            <button type="button" onClick={close}>Close</button>
          </nav>
          <main id="main-content" className="admin-main">{children}</main>
          <div className="admin-window-statusbar"><span>{email}</span><span>{currentApp.label}</span></div>
        </section>
      </div>

      {startOpen && (
        <div className="admin-start-menu" id="admin-start-menu" role="menu" onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => {
          const items = [...event.currentTarget.querySelectorAll<HTMLElement>("[role='menuitem']")];
          const index = items.indexOf(document.activeElement as HTMLElement);
          if (event.key === "Escape") {
            setStartOpen(false);
            startButtonRef.current?.focus();
          } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
          }
        }}>
          <div className="admin-start-rail">OWNER</div>
          <div className="admin-start-items">
            {adminApps.map((app) => (
              <button role="menuitem" key={app.id} onClick={() => openApp(app)}>
                <W98Icon icon={app.icon} size={32} /><span>{app.label}</span>
              </button>
            ))}
            <div className="admin-start-rule" />
            <button role="menuitem" onClick={() => window.open("/", "_blank", "noopener,noreferrer")}><W98Icon icon="computer" size={32} /><span>View public site</span></button>
            <form action={logoutAction}><button role="menuitem" type="submit"><W98Icon icon="folder-open" size={32} /><span>Sign out</span></button></form>
          </div>
        </div>
      )}

      <footer className="admin-taskbar" aria-label="Admin taskbar">
        <button
          className={`admin-start-button${startOpen ? " is-active" : ""}`}
          aria-controls="admin-start-menu"
          aria-expanded={startOpen}
          aria-haspopup="menu"
          type="button"
          ref={startButtonRef}
          onClick={() => {
            setStartOpen((open) => !open);
            setTimeout(() => document.querySelector<HTMLElement>(".admin-start-menu [role='menuitem']")?.focus(), 0);
          }}
        >
          <span className="start-mark" aria-hidden="true"><i /><i /><i /><i /></span><strong>Start</strong>
        </button>
        <div className="admin-taskbar-divider" />
        <div className="admin-task-buttons">
          {tasks.map((task) => (
            <button className={!minimized.has(task.taskHref) && pathname === task.taskHref ? "is-active" : ""} key={task.taskHref} type="button" onClick={() => activateTask(task)}>
              <W98Icon icon={task.icon} size={16} /><span>{task.title}</span>
            </button>
          ))}
        </div>
        <div className="admin-taskbar-tray"><AdminClock /></div>
      </footer>
    </div>
  );
}
