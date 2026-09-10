"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { W98Icon } from "@/components/desktop/w98-icon";
import { publicApps, type PublicAppDefinition } from "@/lib/public-apps";

const groups = [
  { id: "documents", label: "Documents" },
  { id: "programs", label: "Programs" },
  { id: "system", label: "System" },
] as const;

export function StartMenu({ siteTitle, onClose, onOpenApp }: { siteTitle: string; onClose: () => void; onOpenApp: (app: PublicAppDefinition) => void }) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstItem = menuRef.current?.querySelector<HTMLElement>("[role='menuitem']");
    firstItem?.focus();
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") || []);
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || !items.length) return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1 + items.length) % items.length
          : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  return (
    <div className="start-menu" role="menu" ref={menuRef} onKeyDown={handleKeyDown} onPointerDown={(event) => event.stopPropagation()}>
      <div className="start-menu__rail" aria-hidden="true">{siteTitle}</div>
      <div className="start-menu__items">
        <button role="menuitem" onClick={() => onOpenApp(publicApps[0])}>
          <W98Icon icon="computer" size={32} />
          <span><strong>Home</strong><small>Return to the desktop welcome file</small></span>
        </button>
        {groups.map((group) => (
          <section className="start-menu__group" aria-label={group.label} key={group.id}>
            <div className="start-menu__group-label">{group.label}</div>
            {publicApps.filter((app) => app.group === group.id && app.id !== "home").map((app) => (
              <button role="menuitem" key={app.id} onClick={() => onOpenApp(app)}>
                <W98Icon icon={app.icon} size={32} />
                <span>{app.mobileLabel}</span>
              </button>
            ))}
          </section>
        ))}
        <div className="start-menu__rule" />
        <Link role="menuitem" href="/admin/login" onClick={onClose}>
          <W98Icon icon="user-computer" size={32} />
          <span>Owner sign in</span>
        </Link>
      </div>
    </div>
  );
}

