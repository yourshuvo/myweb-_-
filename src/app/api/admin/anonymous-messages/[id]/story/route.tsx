import { getAnonymousMessageById } from "@/lib/anonymous-messages";
import { requireAdmin } from "@/lib/auth/server";
import { renderAnonymousStoryImage } from "@/lib/story-image-render";
import { anonymousMessageIdSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  }

  const { id: rawId } = await context.params;
  const parsedId = anonymousMessageIdSchema.safeParse(rawId);
  if (!parsedId.success) {
    return Response.json({ error: "Message not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const message = await getAnonymousMessageById(parsedId.data);
  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  return renderAnonymousStoryImage(message, request);
}
