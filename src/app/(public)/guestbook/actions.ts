"use server";

import { refresh, updateTag } from "next/cache";
import { hasGuestbookConfig } from "@/lib/env";
import { createGuestbookEntry, incrementVisitorCount, reserveGuestbookSubmission } from "@/lib/guestbook-data";
import { verifyGuestbookTurnstile } from "@/lib/turnstile";
import { guestbookSchema } from "@/lib/validation";
import { getOrCreateVisitorIdentity } from "@/lib/visitor-cookie";

export type GuestbookFormState = {
  status: "idle" | "error" | "success";
  message: string;
  entryId?: string;
  attemptId?: string;
};

export async function submitGuestbookAction(
  _state: GuestbookFormState,
  formData: FormData,
): Promise<GuestbookFormState> {
  const fail = (message: string): GuestbookFormState => ({ status: "error", message, attemptId: crypto.randomUUID() });
  if (!hasGuestbookConfig()) {
    return fail("The guestbook is temporarily unavailable.");
  }

  const parsed = guestbookSchema.safeParse({
    displayName: String(formData.get("displayName") || ""),
    message: String(formData.get("message") || ""),
    company: String(formData.get("company") || ""),
    turnstileToken: String(formData.get("cf-turnstile-response") || ""),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || "Check the guestbook fields.");
  }

  if (!(await verifyGuestbookTurnstile(parsed.data.turnstileToken))) {
    return fail("The anti-spam check expired or failed. Please try again.");
  }

  try {
    const identity = await getOrCreateVisitorIdentity();
    if (identity.isNew) await incrementVisitorCount();
    if (!(await reserveGuestbookSubmission(identity.visitorHash))) {
      return fail("This browser has reached the three-message daily limit.");
    }
    const entry = await createGuestbookEntry(parsed.data.displayName || null, parsed.data.message);
    if (!entry) return fail("The message could not be saved.");
    updateTag("guestbook");
    refresh();
    return { status: "success", message: "Your message is now in the guestbook.", entryId: entry.id, attemptId: crypto.randomUUID() };
  } catch {
    return fail("The message could not be saved. Please try again.");
  }
}
