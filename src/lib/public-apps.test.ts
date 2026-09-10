import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { iconPath, parentHref, resolvePublicApp, type W98IconName } from "@/lib/public-apps";

const publicIcons: W98IconName[] = [
  "address-book",
  "camera",
  "chess",
  "computer",
  "folder",
  "folder-open",
  "media-player",
  "minesweeper",
  "notepad-file",
  "paint",
  "pictures",
  "solitaire",
  "user-computer",
];

describe("public application registry", () => {
  it("matches route-backed document variants", () => {
    expect(resolvePublicApp("/updates/a-day-out").id).toBe("update");
    expect(resolvePublicApp("/photos/albums/summer").id).toBe("album");
    expect(resolvePublicApp("/photos/photo-id").id).toBe("photo");
    expect(resolvePublicApp("/archive/2026/07").id).toBe("archive");
    expect(resolvePublicApp("/play/chess").id).toBe("chess");
    expect(resolvePublicApp("/ask").id).toBe("ask");
    expect(resolvePublicApp("/movies").id).toBe("movies");
  });

  it("returns functional parent folders", () => {
    expect(parentHref("/updates/a-day-out")).toBe("/updates");
    expect(parentHref("/photos/albums/summer")).toBe("/photos/albums");
    expect(parentHref("/archive/2026/07")).toBe("/archive/2026");
    expect(parentHref("/play/minesweeper")).toBe("/play");
    expect(parentHref("/ask")).toBe("/guestbook");
  });

  it("ships exact 16px and 32px raster frames for every public icon", async () => {
    for (const icon of publicIcons) {
      for (const size of [16, 32] as const) {
        const file = path.join(process.cwd(), "public", iconPath(icon, size).slice(1));
        const metadata = await sharp(file).metadata();
        expect({ icon, size, width: metadata.width, height: metadata.height }).toEqual({ icon, size, width: size, height: size });
      }
    }
  });
});
