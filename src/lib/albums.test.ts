import { describe, expect, it } from "vitest";
import { albumCaption, albumCoverMediaId, normalizeAlbumItems, photoIsPublic } from "@/lib/albums";
import { albumEditorSchema, slugify } from "@/lib/validation";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

describe("photo album validation", () => {
  const draft = {
    id: "",
    title: "Summer walks",
    slug: "summer-walks",
    introduction: "A few ordinary afternoons.",
    status: "draft" as const,
    coverMediaId: "",
    items: [],
  };

  it("normalizes an album title into a URL slug", () => {
    expect(slugify("  Summer Walks, 2026! ")).toBe("summer-walks-2026");
  });

  it("allows an incomplete draft but requires a photo for publishing", () => {
    expect(albumEditorSchema.safeParse(draft).success).toBe(true);
    expect(albumEditorSchema.safeParse({ ...draft, status: "published" }).success).toBe(false);
    expect(albumEditorSchema.safeParse({ ...draft, status: "published", items: [{ mediaId: firstId, caption: "" }] }).success).toBe(true);
  });

  it("rejects duplicate membership and a cover outside the album", () => {
    expect(albumEditorSchema.safeParse({ ...draft, items: [{ mediaId: firstId, caption: "" }, { mediaId: firstId, caption: "Again" }] }).success).toBe(false);
    expect(albumEditorSchema.safeParse({ ...draft, coverMediaId: secondId, items: [{ mediaId: firstId, caption: "" }] }).success).toBe(false);
  });
});

describe("photo album presentation", () => {
  it("normalizes ordering and removes duplicate media IDs", () => {
    expect(normalizeAlbumItems([
      { mediaId: firstId, caption: " First " },
      { mediaId: secondId, caption: " Second " },
      { mediaId: firstId, caption: "Duplicate" },
    ])).toEqual([
      { mediaId: firstId, caption: "First" },
      { mediaId: secondId, caption: "Second" },
    ]);
  });

  it("uses album, global, then filename caption fallbacks", () => {
    expect(albumCaption("Album wording", "Media wording", "photo.jpg")).toBe("Album wording");
    expect(albumCaption("", "Media wording", "photo.jpg")).toBe("Media wording");
    expect(albumCaption("", "", "photo.jpg")).toBe("photo.jpg");
  });

  it("uses a selected member as cover or falls back to the first photo", () => {
    const items = [{ mediaId: firstId }, { mediaId: secondId }];
    expect(albumCoverMediaId(secondId, items)).toBe(secondId);
    expect(albumCoverMediaId("33333333-3333-4333-8333-333333333333", items)).toBe(firstId);
    expect(albumCoverMediaId(null, [])).toBeNull();
  });

  it("makes a photo public through the camera roll or a published album", () => {
    expect(photoIsPublic(true, 0)).toBe(true);
    expect(photoIsPublic(false, 1)).toBe(true);
    expect(photoIsPublic(false, 0)).toBe(false);
  });
});
