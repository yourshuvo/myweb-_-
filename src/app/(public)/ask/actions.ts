"use server";

import { createAnonymousMessage, reserveAnonymousMessageSubmission } from "@/lib/anonymous-messages";
import { hasGuestbookConfig } from "@/lib/env";
import { incrementVisitorCount } from "@/lib/guestbook-data";
import { verifyAnonymousMessageTurnstile } from "@/lib/turnstile";
import { anonymousMessageSchema } from "@/lib/validation";
import { getOrCreateVisitorIdentity } from "@/lib/visitor-cookie";

export type AnonymousMessageFormState = {
  status: "idle" | "error" | "success";
  message: string;
  attemptId?: string;
};

export async function submitAnonymousMessageAction(
  _state: AnonymousMessageFormState,
  formData: FormData,
): Promise<AnonymousMessageFormState> {
  const result = (status: "error" | "success", message: string): AnonymousMessageFormState => ({
    status,
    message,
    attemptId: crypto.randomUUID(),
  });

  if (!hasGuestbookConfig()) {
    return result("error", "Anonymous messages are temporarily unavailable.");
  }

  const parsed = anonymousMessageSchema.safeParse({
    message: String(formData.get("message") || ""),
    company: String(formData.get("company") || ""),
    turnstileToken: String(formData.get("cf-turnstile-response") || ""),
  });
  if (!parsed.success) {
    return result("error", parsed.error.issues[0]?.message || "Check the message field.");
  }

  if (!(await verifyAnonymousMessageTurnstile(parsed.data.turnstileToken))) {
    return result("error", "The anti-spam check expired or failed. Please try again.");
  }

  try {
    const identity = await getOrCreateVisitorIdentity();
    if (identity.isNew) await incrementVisitorCount();
    if (!(await reserveAnonymousMessageSubmission(identity.visitorHash))) {
      return result("error", "This browser has reached the three-message daily limit.");
    }
    const created = await createAnonymousMessage(parsed.data.message);
    if (!created) return result("error", "The message could not be saved.");
    return result("success", "Sent privately. Only the site owner can read it.");
  } catch {
    return result("error", "The message could not be saved. Please try again.");
  }
}
