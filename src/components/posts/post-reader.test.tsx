// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostReader } from "@/components/posts/post-reader";

describe("PostReader", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    Object.defineProperty(window, "print", { configurable: true, value: vi.fn() });
  });

  afterEach(cleanup);

  it("lets the reader choose a comfortable text size", () => {
    const { container } = render(<PostReader><article>Story</article></PostReader>);
    fireEvent.click(screen.getByRole("button", { name: "Large" }));

    expect(screen.getByRole("button", { name: "Large" }).getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".post-reader--large")).toBeTruthy();
  });

  it("copies the current post URL", async () => {
    render(<PostReader><article>Story</article></PostReader>);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByText("Link copied.")).toBeTruthy();
  });
});
