// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaLibrary } from "@/components/admin/media-library";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const media = {
  id: "11111111-1111-4111-8111-111111111111",
  cdnId: "019c1234-1234-7123-8123-123456789abc",
  url: "https://cdn.hackclub.com/019c1234-1234-7123-8123-123456789abc/photo.jpg",
  filename: "photo.jpg",
  mimeType: "image/jpeg",
  byteSize: 1024,
  width: 800,
  height: 600,
  altText: "A test photograph",
  caption: "",
  takenDate: null,
  showInPhotoLog: true,
  createdAt: new Date("2026-07-20T00:00:00.000Z"),
};

describe("MediaLibrary", () => {
  afterEach(cleanup);

  it("explains blocked deletion and links to the exact editor", () => {
    render(<MediaLibrary media={[{
      ...media,
      references: [{
        key: "post:22222222-2222-4222-8222-222222222222:body",
        label: "Post body: Test update",
        href: "/admin/posts/22222222-2222-4222-8222-222222222222",
      }],
    }]} />);

    const editLink = screen.getByRole("link", { name: "Post body: Test update — edit" });
    expect(editLink.getAttribute("href")).toBe("/admin/posts/22222222-2222-4222-8222-222222222222");
    expect(screen.getByRole("button", { name: "In use — edit first" }).hasAttribute("disabled")).toBe(true);
  });
});
