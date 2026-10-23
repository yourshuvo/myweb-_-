import { describe, expect, it } from "vitest";
import { movieRecommendationSchema, passwordResetRequestSchema, passwordResetSchema, postEditorSnapshotSchema, postSchema, profileSchema, slugify, tmdbSearchSchema } from "@/lib/validation";

describe("slugify", () => {
  it("creates a stable URL slug", () => {
    expect(slugify("  Café Notes & Ordinary Days! ")).toBe("cafe-notes-ordinary-days");
  });
  it("removes leading and trailing separators", () => {
    expect(slugify("---hello---")).toBe("hello");
  });
});

describe("content validation", () => {
  it("rejects invalid post slugs", () => {
    expect(postSchema.safeParse({ id: "", title: "Test", slug: "Not valid", excerpt: "", body: "", status: "draft", coverMediaId: "", thumbnailMediaId: "", publishedAt: "" }).success).toBe(false);
  });
  it("requires an owner display name", () => {
    expect(profileSchema.safeParse({ displayName: "", siteTitle: "Notes", biography: "", avatarMediaId: "", contactEmail: "", website: "", github: "", instagram: "", mastodon: "", spotifyPlaylistTitle: "", spotifyPlaylistUrl: "" }).success).toBe(false);
  });
  it("accepts only public Spotify playlist URLs", () => {
    const base = { displayName: "Owner", siteTitle: "Notes", biography: "", avatarMediaId: "", contactEmail: "", website: "", github: "", instagram: "", mastodon: "", spotifyPlaylistTitle: "Favorites" };
    expect(profileSchema.safeParse({ ...base, spotifyPlaylistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, spotifyPlaylistUrl: "https://open.spotify.com/album/123" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, spotifyPlaylistUrl: "https://evil.example/playlist/123" }).success).toBe(false);
  });
  it("allows a movie to be published without a personal note", () => {
    const base = { id: "", tmdbId: "123", personalNote: "", watchedAt: "", status: "draft" };
    expect(movieRecommendationSchema.safeParse(base).success).toBe(true);
    expect(movieRecommendationSchema.safeParse({ ...base, status: "published" }).success).toBe(true);
    expect(movieRecommendationSchema.safeParse({ ...base, status: "published", personalNote: "A quiet film I kept thinking about." }).success).toBe(true);
  });
  it("validates TMDB search length", () => {
    expect(tmdbSearchSchema.safeParse({ query: "Alien" }).success).toBe(true);
    expect(tmdbSearchSchema.safeParse({ query: "A" }).success).toBe(false);
  });
});

describe("post password validation", () => {
  const baseSnapshot = {
    id: "",
    version: 0,
    title: "Test",
    slug: "test",
    excerpt: "",
    body: "",
    status: "draft" as const,
    coverMediaId: "",
    thumbnailMediaId: "",
    publishedAt: "",
    passwordProtected: true,
  };

  it("accepts an empty password (no change) and a password of at least 4 characters", () => {
    expect(postEditorSnapshotSchema.safeParse({ ...baseSnapshot, password: "" }).success).toBe(true);
    expect(postEditorSnapshotSchema.safeParse({ ...baseSnapshot, password: "abcd" }).success).toBe(true);
    expect(postEditorSnapshotSchema.safeParse({ ...baseSnapshot, passwordProtected: false, password: "" }).success).toBe(true);
  });

  it("rejects passwords under 4 or over 128 characters", () => {
    expect(postEditorSnapshotSchema.safeParse({ ...baseSnapshot, password: "abc" }).success).toBe(false);
    expect(postEditorSnapshotSchema.safeParse({ ...baseSnapshot, password: "x".repeat(129) }).success).toBe(false);
  });

  it("requires the passwordProtected flag in editor snapshots", () => {
    const { passwordProtected: _omitted, ...withoutFlag } = baseSnapshot;
    expect(postEditorSnapshotSchema.safeParse({ ...withoutFlag, password: "" }).success).toBe(false);
  });

  it("keeps the agent-facing post password optional and nullable", () => {
    const basePost = { id: "", title: "Test", slug: "test", excerpt: "", body: "", status: "draft", coverMediaId: "", thumbnailMediaId: "", publishedAt: "" };
    expect(postSchema.safeParse(basePost).success).toBe(true);
    expect(postSchema.safeParse({ ...basePost, password: "abcd" }).success).toBe(true);
    expect(postSchema.safeParse({ ...basePost, password: null }).success).toBe(true);
    expect(postSchema.safeParse({ ...basePost, password: "abc" }).success).toBe(false);
  });
});

describe("password setup validation", () => {
  it("accepts a valid owner email", () => {
    expect(passwordResetRequestSchema.safeParse({ email: "owner@example.com" }).success).toBe(true);
  });

  it("requires a strong enough matching password and a token", () => {
    expect(passwordResetSchema.safeParse({ token: "reset-token", password: "eightchars", confirmPassword: "eightchars" }).success).toBe(true);
    expect(passwordResetSchema.safeParse({ token: "reset-token", password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(passwordResetSchema.safeParse({ token: "reset-token", password: "eightchars", confirmPassword: "different" }).success).toBe(false);
    expect(passwordResetSchema.safeParse({ token: "", password: "eightchars", confirmPassword: "eightchars" }).success).toBe(false);
  });
});
