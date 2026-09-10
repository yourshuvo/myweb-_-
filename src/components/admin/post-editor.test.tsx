// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostEditor } from "@/components/admin/post-editor";

const autosavePostDraftAction = vi.fn();
const savePostExplicitAction = vi.fn();
const storedValues = new Map<string, string>();
const storage: Storage = {
  get length() { return storedValues.size; },
  clear: () => storedValues.clear(),
  getItem: (key) => storedValues.get(key) ?? null,
  key: (index) => Array.from(storedValues.keys())[index] ?? null,
  removeItem: (key) => { storedValues.delete(key); },
  setItem: (key, value) => { storedValues.set(key, value); },
};
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
Object.defineProperty(window, "localStorage", { configurable: true, value: storage });

vi.mock("@/app/admin/actions", () => ({
  autosavePostDraftAction: (...args: unknown[]) => autosavePostDraftAction(...args),
  savePostExplicitAction: (...args: unknown[]) => savePostExplicitAction(...args),
}));

describe("PostEditor autosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    autosavePostDraftAction.mockReset().mockResolvedValue({
      status: "success",
      message: "Draft autosaved.",
      postId: "f91ca418-64d7-4b91-a922-5a8f77aa1904",
      version: 1,
      savedAt: new Date(2026, 6, 16, 12).toISOString(),
      persistedStatus: "draft",
    });
    savePostExplicitAction.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("writes browser recovery before syncing a valid new draft", async () => {
    render(<PostEditor media={[]} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Today outside" } });
    fireEvent.change(screen.getByPlaceholderText("Write naturally. Markdown is supported..."), { target: { value: "A short note." } });

    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(localStorage.getItem("admin-post-recovery:v1:new")).toContain("Today outside");
    expect(autosavePostDraftAction).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(2_500); });
    expect(autosavePostDraftAction).toHaveBeenCalledTimes(1);
    expect(autosavePostDraftAction.mock.calls[0][0]).toMatchObject({ title: "Today outside", slug: "today-outside", status: "draft" });
  });

  it("keeps published edits in browser recovery until an explicit save", async () => {
    render(<PostEditor media={[]} post={{
      id: "f91ca418-64d7-4b91-a922-5a8f77aa1904",
      version: 4,
      title: "Already public",
      slug: "already-public",
      excerpt: "",
      body: "Original",
      status: "published",
      coverMediaId: null,
      thumbnailMediaId: null,
      publishedAt: new Date("2026-07-16T08:00:00.000Z"),
      updatedAt: new Date("2026-07-16T08:00:00.000Z"),
    }} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    fireEvent.change(screen.getByPlaceholderText("Write naturally. Markdown is supported..."), { target: { value: "Private edit" } });

    await act(async () => { await vi.advanceTimersByTimeAsync(3_500); });
    expect(localStorage.getItem("admin-post-recovery:v1:f91ca418-64d7-4b91-a922-5a8f77aa1904")).toContain("Private edit");
    expect(autosavePostDraftAction).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Update published post" })).toBeTruthy();
  });

  it("keeps recovery and gives refresh guidance when a save request is interrupted", async () => {
    autosavePostDraftAction.mockRejectedValueOnce(new Error("Server Action request failed"));
    render(<PostEditor media={[]} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Safe local copy" } });
    fireEvent.change(screen.getByPlaceholderText("Write naturally. Markdown is supported..."), { target: { value: "Still here." } });

    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });

    expect(localStorage.getItem("admin-post-recovery:v1:new")).toContain("Safe local copy");
    expect(screen.getByText(/Refresh this page and restore the browser recovery copy/i)).toBeTruthy();
  });

  it("formats selected writing from the Markdown toolbar", async () => {
    render(<PostEditor media={[]} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    const body = screen.getByLabelText("Post body") as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: "A useful sentence" } });
    body.setSelectionRange(2, 8);

    fireEvent.click(screen.getByTitle("Bold"));
    await act(async () => { await vi.advanceTimersByTimeAsync(20); });

    expect(body.value).toBe("A **useful** sentence");
    expect(body.selectionStart).toBe(4);
    expect(body.selectionEnd).toBe(10);
  });
});
