// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markAnonymousMessageReadAction } from "@/app/admin/actions";
import { AnonymousMessageAdmin } from "@/components/admin/anonymous-message-admin";
import type { AnonymousMessage } from "@/db/schema";

vi.mock("@/app/admin/actions", () => ({
  archiveAnonymousMessageAction: vi.fn().mockResolvedValue(undefined),
  deleteAnonymousMessageAction: vi.fn().mockResolvedValue(undefined),
  markAnonymousMessageReadAction: vi.fn().mockResolvedValue(undefined),
  markAnonymousMessageUnreadAction: vi.fn().mockResolvedValue(undefined),
  restoreAnonymousMessageAction: vi.fn().mockResolvedValue(undefined),
}));

const unreadMessage: AnonymousMessage = {
  id: "8eb72560-9b57-4e54-9127-7a429eb7fe16",
  message: "Please keep this message visible while I read it.",
  status: "unread",
  createdAt: new Date("2026-07-20T12:00:00.000Z"),
  readAt: null,
  archivedAt: null,
};

describe("AnonymousMessageAdmin", () => {
  beforeEach(() => vi.mocked(markAnonymousMessageReadAction).mockClear());
  afterEach(cleanup);

  it("keeps an opened message visible when the server moves it to Read", async () => {
    const { rerender } = render(<AnonymousMessageAdmin unread={[unreadMessage]} read={[]} archived={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog").textContent).toContain(unreadMessage.message);
    await waitFor(() => expect(markAnonymousMessageReadAction).toHaveBeenCalledTimes(1));

    const readMessage = { ...unreadMessage, status: "read" as const, readAt: new Date("2026-07-20T12:01:00.000Z") };
    rerender(<AnonymousMessageAdmin unread={[]} read={[readMessage]} archived={[]} />);

    expect(screen.getByRole("dialog").textContent).toContain(unreadMessage.message);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.getByRole("tab", { name: "Read (1)" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText(unreadMessage.message)).toBeTruthy();
  });
});
