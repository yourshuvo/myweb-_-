// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlbumEditor } from "@/components/admin/album-editor";
import type { MediaAsset } from "@/db/schema";

const saveAlbumAction = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();

vi.mock("@/app/admin/actions", () => ({
  saveAlbumAction: (...args: unknown[]) => saveAlbumAction(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

const media: MediaAsset[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    cdnId: "first",
    url: "https://cdn.hackclub.com/first.jpg",
    filename: "first.jpg",
    mimeType: "image/jpeg",
    byteSize: 100,
    width: 800,
    height: 600,
    altText: "First photograph",
    caption: "First caption",
    takenDate: null,
    showInPhotoLog: false,
    createdAt: new Date("2026-07-01T00:00:00Z"),
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    cdnId: "second",
    url: "https://cdn.hackclub.com/second.jpg",
    filename: "second.jpg",
    mimeType: "image/jpeg",
    byteSize: 100,
    width: 800,
    height: 600,
    altText: "Second photograph",
    caption: "",
    takenDate: null,
    showInPhotoLog: true,
    createdAt: new Date("2026-07-02T00:00:00Z"),
  },
];

describe("AlbumEditor", () => {
  beforeEach(() => {
    saveAlbumAction.mockReset().mockResolvedValue({
      status: "success",
      message: "Album draft saved.",
      albumId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      slug: "weekend",
      savedAt: "2026-07-17T08:00:00.000Z",
      persistedStatus: "draft",
    });
    replace.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("adds, captions, reorders, and explicitly saves existing media", async () => {
    render(<AlbumEditor media={media} />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Weekend" } });
    expect((screen.getByLabelText("Slug") as HTMLInputElement).value).toBe("weekend");

    fireEvent.click(screen.getByText("first.jpg").closest("button")!);
    fireEvent.click(screen.getByText("second.jpg").closest("button")!);
    fireEvent.change(screen.getAllByLabelText("Album caption")[0], { target: { value: "Opening frame" } });
    fireEvent.click(screen.getByRole("button", { name: "Move first.jpg down" }));
    fireEvent.change(screen.getByLabelText("Cover photo"), { target: { value: media[0].id } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(saveAlbumAction).toHaveBeenCalledTimes(1));
    expect(saveAlbumAction.mock.calls[0][0]).toMatchObject({
      title: "Weekend",
      slug: "weekend",
      coverMediaId: media[0].id,
      items: [
        { mediaId: media[1].id, caption: "" },
        { mediaId: media[0].id, caption: "Opening frame" },
      ],
    });
    expect(replace).toHaveBeenCalledWith("/admin/albums/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
