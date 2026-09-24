"use server";

import { refresh, updateTag } from "next/cache";
import { hasVisitorTrackingConfig } from "@/lib/env";
import { createPostComment, reservePostCommentSubmission } from "@/lib/post-comments-data";
import { postCommentSchema } from "@/lib/validation";
import { getOrCreateVisitorIdentity } from "@/lib/visitor-cookie";

export type PostCommentFormState = {
  status: "idle" | "error" | "success";
  message: string;
  commentId?: string;
  attemptId?: string;
};

export async function submitPostCommentAction(
  _state: PostCommentFormState,
  formData: FormData,
): Promise<PostCommentFormState> {
  const fail = (message: string): PostCommentFormState => ({ status: "error", message, attemptId: crypto.randomUUID() });
  if (!hasVisitorTrackingConfig()) {
    return fail("Comments are temporarily unavailable.");
  }

  const postId = String(formData.get("postId") || "");
  if (!postId) {
    return fail("The comment could not be posted.");
  }

  const parsed = postCommentSchema.safeParse({
    displayName: String(formData.get("displayName") || ""),
    message: String(formData.get("message") || ""),
    company: String(formData.get("company") || ""),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || "Check the comment fields.");
  }

  try {
    const identity = await getOrCreateVisitorIdentity();
    if (!(await reservePostCommentSubmission(identity.visitorHash))) {
      return fail("This browser has reached the three-comment daily limit.");
    }
    const comment = await createPostComment(postId, parsed.data.displayName || null, parsed.data.message);
    if (!comment) return fail("The comment could not be saved.");
    updateTag("post-comments");
    refresh();
    return { status: "success", message: "Your comment is now on this post.", commentId: comment.id, attemptId: crypto.randomUUID() };
  } catch {
    return fail("The comment could not be saved. Please try again.");
  }
}
