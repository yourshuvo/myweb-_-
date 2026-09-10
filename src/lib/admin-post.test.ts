import { describe, expect, it } from "vitest";
import {
  POST_RECOVERY_MAX_AGE_MS,
  isAutosaveReady,
  nextCopySlug,
  parsePostRecovery,
  postRecoveryKey,
  postWritingStats,
  snapshotContent,
  type PostEditorSnapshot,
} from "@/lib/admin-post";

const snapshot: PostEditorSnapshot = {
  id: "",
  version: 0,
  title: "A small update",
  slug: "a-small-update",
  excerpt: "",
  body: "One two three",
  status: "draft",
  coverMediaId: "",
  thumbnailMediaId: "",
  publishedAt: "",
};

describe("post recovery", () => {
  it("uses stable versioned keys", () => {
    expect(postRecoveryKey("")).toBe("admin-post-recovery:v1:new");
    expect(postRecoveryKey("post-id")).toBe("admin-post-recovery:v1:post-id");
  });

  it("parses current recovery data and rejects expired or malformed data", () => {
    const now = 10_000_000_000;
    const serialized = JSON.stringify({ savedAt: now - 1_000, snapshot });
    expect(parsePostRecovery(serialized, now)?.snapshot.title).toBe("A small update");
    expect(parsePostRecovery(JSON.stringify({ savedAt: now - POST_RECOVERY_MAX_AGE_MS - 1, snapshot }), now)).toBeNull();
    expect(parsePostRecovery("not-json", now)).toBeNull();
  });

  it("migrates recovery data saved before thumbnails were added", () => {
    const now = 10_000_000_000;
    const legacySnapshot: Partial<PostEditorSnapshot> = { ...snapshot };
    delete legacySnapshot.thumbnailMediaId;
    const recovered = parsePostRecovery(JSON.stringify({ savedAt: now, snapshot: legacySnapshot }), now);
    expect(recovered?.snapshot.thumbnailMediaId).toBe("");
  });

  it("compares content without treating server IDs and versions as edits", () => {
    expect(snapshotContent({ ...snapshot, id: "one", version: 1 })).toBe(snapshotContent({ ...snapshot, id: "two", version: 9 }));
    expect(snapshotContent({ ...snapshot, body: "Changed" })).not.toBe(snapshotContent(snapshot));
  });
});

describe("post productivity helpers", () => {
  it("requires a valid draft title and slug before autosaving", () => {
    expect(isAutosaveReady(snapshot)).toBe(true);
    expect(isAutosaveReady({ ...snapshot, title: "" })).toBe(false);
    expect(isAutosaveReady({ ...snapshot, slug: "Not valid" })).toBe(false);
    expect(isAutosaveReady({ ...snapshot, status: "published" })).toBe(false);
  });

  it("creates collision-safe copy slugs", () => {
    expect(nextCopySlug("hello", [])).toBe("hello-copy");
    expect(nextCopySlug("hello", ["hello-copy", "hello-copy-2"])).toBe("hello-copy-3");
  });

  it("calculates useful writing statistics", () => {
    expect(postWritingStats("")).toEqual({ words: 0, readingMinutes: 0 });
    expect(postWritingStats("one two three")).toEqual({ words: 3, readingMinutes: 1 });
    expect(postWritingStats(Array.from({ length: 401 }, () => "word").join(" "))).toEqual({ words: 401, readingMinutes: 3 });
  });
});
