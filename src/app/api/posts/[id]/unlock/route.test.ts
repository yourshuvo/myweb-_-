import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPostUnlockToken,
  hashPostPassword,
  postUnlockCookieName,
} from "@/lib/post-password";

const mocks = vi.hoisted(() => ({
  getPostPasswordHashById: vi.fn(),
  cookieSet: vi.fn(),
}));

vi.mock("@/lib/data", () => ({ getPostPasswordHashById: mocks.getPostPasswordHashById }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: mocks.cookieSet, get: vi.fn() })),
}));

const { POST } = await import("@/app/api/posts/[id]/unlock/route");

const postId = "8eb72560-9b57-4e54-9127-7a429eb7fe16";
const passwordHash = hashPostPassword("open-sesame");

function post(body: unknown, id: string = postId) {
  return POST(
    new Request(`http://localhost/api/posts/${id}/unlock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) } as never,
  );
}

describe("POST /api/posts/[id]/unlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPostPasswordHashById.mockResolvedValue(passwordHash);
  });

  it("sets a 30-day httpOnly unlock cookie for the correct password", async () => {
    const response = await post({ password: "open-sesame" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.cookieSet).toHaveBeenCalledTimes(1);
    const [name, token, options] = mocks.cookieSet.mock.calls[0];
    expect(name).toBe(postUnlockCookieName(postId));
    expect(token).toBe(createPostUnlockToken(postId, passwordHash));
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  });

  it("returns a generic 401 and sets no cookie for a wrong password", async () => {
    const response = await post({ password: "wrong-password" });
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("That password is incorrect.");
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("returns 404 when the post is missing, unpublished, or not protected", async () => {
    mocks.getPostPasswordHashById.mockResolvedValue(null);
    const response = await post({ password: "open-sesame" });
    expect(response.status).toBe(404);
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid post ID", async () => {
    const response = await post({ password: "open-sesame" }, "not-a-uuid");
    expect(response.status).toBe(400);
    expect(mocks.getPostPasswordHashById).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON, a missing password, or an overlong password", async () => {
    expect((await post("{oops")).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect((await post({ password: "" })).status).toBe(400);
    expect((await post({ password: "x".repeat(129) })).status).toBe(400);
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
});
