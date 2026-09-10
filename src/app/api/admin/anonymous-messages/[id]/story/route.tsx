import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getAnonymousMessageById } from "@/lib/anonymous-messages";
import { requireAdmin } from "@/lib/auth/server";
import { siteUrl } from "@/lib/env";
import {
  anonymousStoryFilename,
  STORY_IMAGE_HEIGHT,
  STORY_IMAGE_WIDTH,
  storyFontSizeForLength,
  storyLineHeight,
} from "@/lib/story-image";
import { anonymousMessageIdSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const fontPromise = readFile(join(process.cwd(), "src", "app", "fonts", "W95FA.otf"));

export async function GET(
  _request: Request,
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

  const font = await fontPromise;
  const fontSize = storyFontSizeForLength(message.message.length);
  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          flexDirection: "column",
          background: "#008080",
          color: "#000000",
          fontFamily: "W95FA",
        }}
      >
        <div style={{ position: "absolute", top: 286, left: 82, width: 916, height: 1090, display: "flex", flexDirection: "column", background: "#c0c0c0", borderTop: "6px solid #ffffff", borderLeft: "6px solid #ffffff", borderRight: "6px solid #000000", borderBottom: "6px solid #000000", padding: 7 }}>
          <div style={{ height: 74, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 13px", color: "#ffffff", background: "#000080", fontSize: 31 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ display: "flex", width: 38, height: 38, flexWrap: "wrap", gap: 3, padding: 3, background: "#ffffff" }}>
                <div style={{ width: 14, height: 14, background: "#008080" }} />
                <div style={{ width: 14, height: 14, background: "#000080" }} />
                <div style={{ width: 14, height: 14, background: "#000080" }} />
                <div style={{ width: 14, height: 14, background: "#008080" }} />
              </div>
              <span>Anonymous Message</span>
            </div>
            <div style={{ width: 44, height: 42, display: "flex", alignItems: "center", justifyContent: "center", color: "#000000", background: "#c0c0c0", borderTop: "4px solid #ffffff", borderLeft: "4px solid #ffffff", borderRight: "4px solid #000000", borderBottom: "4px solid #000000", fontSize: 30 }}>×</div>
          </div>
          <div style={{ margin: "18px 17px 0", height: 868, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "50px 62px", background: "#ffffff", borderTop: "5px solid #808080", borderLeft: "5px solid #808080", borderRight: "5px solid #ffffff", borderBottom: "5px solid #ffffff", textAlign: "center", fontSize, lineHeight: `${storyLineHeight(fontSize)}px`, overflow: "hidden", wordBreak: "break-word" }}>
            {message.message}
          </div>
          <div style={{ margin: "17px 17px 0", height: 78, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 25 }}>
            <span>Private message</span>
            <span>{new URL(siteUrl()).hostname}/ask</span>
          </div>
        </div>
      </div>
    ),
    {
      width: STORY_IMAGE_WIDTH,
      height: STORY_IMAGE_HEIGHT,
      fonts: [{ name: "W95FA", data: font, weight: 400, style: "normal" }],
    },
  );
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Content-Disposition", `attachment; filename="${anonymousStoryFilename(message.id)}"`);
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
