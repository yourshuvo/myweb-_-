// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deletePostAction } from "@/app/admin/actions";
import { PostActions } from "@/components/admin/post-actions";

vi.mock("@/app/admin/actions", () => ({
  deletePostAction: vi.fn(),
  duplicatePostAction: vi.fn(),
}));

describe("PostActions", () => {
  beforeEach(() => {
    vi.mocked(deletePostAction).mockReset().mockResolvedValue({
      status: "error",
      message: "This post changed after the delete dialog opened. Reload it, then try again.",
    });
  });
  afterEach(cleanup);

  it("submits the current version without unmounting the confirmation form", async () => {
    render(<PostActions id="11111111-1111-4111-8111-111111111111" title="Test post" version={5} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));

    await waitFor(() => expect(deletePostAction).toHaveBeenCalledTimes(1));
    const [, formData] = vi.mocked(deletePostAction).mock.calls[0];
    expect(formData.get("id")).toBe("11111111-1111-4111-8111-111111111111");
    expect(formData.get("version")).toBe("5");
    expect((await screen.findByRole("alert")).textContent).toContain("Reload it, then try again.");
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});
