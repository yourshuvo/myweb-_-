// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotoLightbox } from "@/components/retro/photo-lightbox";

function stubViewport(isPhone: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: isPhone,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

function renderGallery(href = "/photos/1") {
  return render(
    <>
      <a href={href} data-photo-lightbox="https://cdn.hackclub.com/a.jpg" data-photo-lightbox-alt="A photo">Open photo</a>
      <PhotoLightbox />
    </>,
  );
}

describe("PhotoLightbox", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the full image when a phone taps a photo", () => {
    stubViewport(true);
    renderGallery();
    fireEvent.click(screen.getByText("Open photo"));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("img").getAttribute("src")).toBe("https://cdn.hackclub.com/a.jpg");
    expect(screen.getByRole("link", { name: "Open photo page" }).getAttribute("href")).toBe("/photos/1");
  });

  it("closes when Escape is pressed", () => {
    stubViewport(true);
    renderGallery();
    fireEvent.click(screen.getByText("Open photo"));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes when the backdrop is clicked", () => {
    stubViewport(true);
    renderGallery();
    fireEvent.click(screen.getByText("Open photo"));
    fireEvent.mouseDown(screen.getByRole("dialog"));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("leaves desktop clicks to the existing link", () => {
    stubViewport(false);
    render(
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/thumb.jpg" alt="Thumb" data-photo-lightbox="https://cdn.hackclub.com/a.jpg" />
        <PhotoLightbox />
      </>,
    );
    fireEvent.click(screen.getByAltText("Thumb"));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
