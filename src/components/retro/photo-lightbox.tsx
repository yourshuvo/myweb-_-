"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Matches the mobile layout breakpoint in globals.css. */
const PHONE_QUERY = "(max-width: 767px)";

type LightboxImage = { src: string; alt: string; href: string };

function readTrigger(trigger: Element): LightboxImage | null {
  const src = trigger.getAttribute("data-photo-lightbox");
  if (!src) return null;
  return {
    src,
    alt: trigger.getAttribute("data-photo-lightbox-alt") || "",
    href: trigger instanceof HTMLAnchorElement ? trigger.getAttribute("href") || "" : "",
  };
}

/**
 * Phone-only full-size image viewer.
 *
 * Any element marked with `data-photo-lightbox` opens the overlay on tap when the
 * viewport matches the mobile breakpoint. The desktop layout is untouched, and
 * links keep their href so opening in a new tab still reaches the photo page.
 */
export function PhotoLightbox() {
  const [image, setImage] = useState<LightboxImage | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const close = useCallback(() => {
    setImage(null);
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger instanceof HTMLElement) trigger.focus();
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!window.matchMedia(PHONE_QUERY).matches) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest("[data-photo-lightbox]");
      if (!trigger) return;
      const next = readTrigger(trigger);
      if (!next) return;
      event.preventDefault();
      triggerRef.current = trigger;
      setImage(next);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!image) return;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button, a[href]");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [image, close]);

  if (!image) return null;

  return createPortal(
    <div
      className="photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || "Image preview"}
      ref={dialogRef}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <button ref={closeButtonRef} type="button" className="photo-lightbox__close" onClick={close} aria-label="Close image preview">×</button>
      <figure className="photo-lightbox__frame">
        {/* eslint-disable-next-line @next/next/no-img-element -- Full-size CDN image shown at its natural dimensions. */}
        <img src={image.src} alt={image.alt} />
        {(image.alt || image.href) && (
          <figcaption>
            {image.alt && <span>{image.alt}</span>}
            {image.href && <a href={image.href}>Open photo page</a>}
          </figcaption>
        )}
      </figure>
    </div>,
    document.body,
  );
}
