import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublishedPostById: vi.fn(),
  hasVisitorTrackingConfig: vi.fn(),
  getOrCreateVisitorIdentity: vi.fn(),
  createPostComment: vi.fn(),
  reservePostCommentSubmission: vi.fn(),
  incrementVisitorCount: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/data", () => ({ getPublishedPostById: mocks.getPublishedPostById }));
vi.mock("@/lib/env", () => ({ hasVisitorTrackingConfig: mocks.hasVisitorTrackingConfig }));
vi.mock("@/lib/visitor-cookie", () => ({ getOrCreateVisitorIdentity: mocks.getOrCreateVisitorIdentity }));
vi.mock("@/lib/post-comments-data", () => ({
  createPostComment: mocks.createPostComment,
  reservePostCommentSubmission: mocks.reservePostCommentSubmission,
}));
vi.mock("@/lib/guestbook-data", () => ({ incrementVisitorCount: mocks.incrementVisitorCount }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));

const { POST } = await import("@/app/api/posts/[id]/comments/route");

const postId = "8eb72560-9b57-4e54-9127-7a429eb7fe16";

function post(body: unknown, id: string = postId) {
  return POST(
    new Request(`http://localhost/api/posts/${id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) } as never,
  );
}

describe("POST /api/posts/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasVisitorTrackingConfig.mockReturnValue(true);
    mocks.getPublishedPostById.mockResolvedValue({ id: postId, slug: "hello", title: "Hello" });
    mocks.getOrCreateVisitorIdentity.mockResolvedValue({ visitorHash: "hash-1", isNew: false });
    mocks.reservePostCommentSubmission.mockResolvedValue(true);
    mocks.createPostComment.mockResolvedValue({ id: "comment-1" });
  });

  it("creates a comment and returns 201", async () => {
    const response = await post({ displayName: "Ada", message: "Great post!" }, postId);
    expect(response.status).toBe(201);
    expect(mocks.createPostComment).toHaveBeenCalledWith(postId, "Ada", "Great post!");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("post-comments", { expire: 0 });
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe("comment-1");
  });

  it("allows an anonymous comment (blank name stored as null)", async () => {
    const response = await post({ displayName: "   ", message: "Nice!" });
    expect(response.status).toBe(201);
    expect(mocks.createPostComment).toHaveBeenCalledWith(postId, null, "Nice!");
  });

  it("increments the visitor total for a brand-new visitor identity", async () => {
    mocks.getOrCreateVisitorIdentity.mockResolvedValue({ visitorHash: "hash-2", isNew: true });
    const response = await post({ message: "First visit!" });
    expect(response.status).toBe(201);
    expect(mocks.incrementVisitorCount).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for an invalid post ID", async () => {
    const response = await post({ message: "Hi" }, "not-a-uuid");
    expect(response.status).toBe(400);
    expect(mocks.createPostComment).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid JSON body", async () => {
    const response = await post("{oops");
    expect(response.status).toBe(400);
  });

  it("returns 400 for an empty message", async () => {
    const response = await post({ message: "   " });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Write a comment before posting.");
  });

  it("returns 400 for a message over 500 characters", async () => {
    const response = await post({ message: "x".repeat(501) });
    expect(response.status).toBe(400);
  });

  it("returns 400 for a name over 40 characters", async () => {
    const response = await post({ displayName: "x".repeat(41), message: "Hi" });
    expect(response.status).toBe(400);
  });

  it("rejects a filled honeypot field", async () => {
    const response = await post({ message: "Hi", company: "bot" });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Automated submission rejected.");
    expect(mocks.createPostComment).not.toHaveBeenCalled();
  });

  it("returns 503 when visitor tracking is not configured", async () => {
    mocks.hasVisitorTrackingConfig.mockReturnValue(false);
    const response = await post({ message: "Hi" });
    expect(response.status).toBe(503);
    expect(mocks.createPostComment).not.toHaveBeenCalled();
  });

  it("returns 404 when the post does not exist or is unpublished", async () => {
    mocks.getPublishedPostById.mockResolvedValue(null);
    const response = await post({ message: "Hi" });
    expect(response.status).toBe(404);
    expect(mocks.createPostComment).not.toHaveBeenCalled();
  });

  it("returns 429 when the daily per-browser limit is reached", async () => {
    mocks.reservePostCommentSubmission.mockResolvedValue(false);
    const response = await post({ message: "Hi" });
    expect(response.status).toBe(429);
    expect(mocks.createPostComment).not.toHaveBeenCalled();
  });

  it("returns 500 when the comment cannot be saved", async () => {
    mocks.createPostComment.mockResolvedValue(null);
    const response = await post({ message: "Hi" });
    expect(response.status).toBe(500);
  });
});
