import { cookies } from "next/headers";
import { z } from "zod";
import { getPostPasswordHashById } from "@/lib/data";
import {
  POST_UNLOCK_COOKIE_MAX_AGE_SECONDS,
  createPostUnlockToken,
  postUnlockCookieName,
  verifyPostPassword,
} from "@/lib/post-password";

export const runtime = "nodejs";

const postIdParam = z.uuid("Invalid post ID.");

type RouteContext = { params: Promise<{ id: string }> };

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

/**
 * POST /api/posts/[id]/unlock
 * Verify a per-post password and, on success, set an httpOnly unlock cookie
 * whose token is an HMAC of the post id keyed by the current password hash —
 * changing or removing the password invalidates previously issued cookies.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!postIdParam.safeParse(id).success) return jsonError("Invalid post ID.", 400);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("The request body must be valid JSON.", 400);
  }
  const password =
    payload && typeof payload === "object" && "password" in payload
      ? (payload as { password: unknown }).password
      : undefined;
  if (typeof password !== "string" || password.length === 0 || password.length > 128) {
    return jsonError("Enter the password for this update.", 400);
  }

  const passwordHash = await getPostPasswordHashById(id);
  if (!passwordHash) return jsonError("Post not found.", 404);

  if (!verifyPostPassword(password, passwordHash)) {
    return jsonError("That password is incorrect.", 401);
  }

  const cookieStore = await cookies();
  cookieStore.set(postUnlockCookieName(id), createPostUnlockToken(id, passwordHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: POST_UNLOCK_COOKIE_MAX_AGE_SECONDS,
  });
  return Response.json({ ok: true });
}
