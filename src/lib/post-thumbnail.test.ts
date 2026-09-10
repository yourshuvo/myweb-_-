import { describe, expect, it } from "vitest";
import { resolvePostThumbnail } from "@/lib/post-thumbnail";

const post = {
  title: "A small update",
  thumbnailUrl: "https://cdn.hackclub.com/thumb.png",
  thumbnailAltText: "A small notebook on a desk",
  coverUrl: "https://cdn.hackclub.com/cover.png",
  coverAltText: "A wide view of the desk",
};

describe("update thumbnails", () => {
  it("prefers the dedicated thumbnail", () => {
    expect(resolvePostThumbnail(post)).toEqual({
      url: post.thumbnailUrl,
      alt: post.thumbnailAltText,
      source: "thumbnail",
    });
  });

  it("falls back to the cover and then to no image", () => {
    expect(resolvePostThumbnail({ ...post, thumbnailUrl: null })?.source).toBe("cover");
    expect(resolvePostThumbnail({ ...post, thumbnailUrl: null, coverUrl: null })).toBeNull();
  });

  it("creates useful fallback alt text", () => {
    expect(resolvePostThumbnail({ ...post, thumbnailAltText: "" })?.alt).toBe("Thumbnail for A small update");
  });
});
