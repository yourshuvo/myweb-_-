import { describe, expect, it } from "vitest";
import { imageCompressionOptions, MAX_COMPRESSED_MEGABYTES, MAX_IMAGE_DIMENSION } from "@/lib/image";

describe("browser image compression", () => {
  it("stays below the server and Vercel payload budgets", () => {
    expect(MAX_COMPRESSED_MEGABYTES).toBeLessThan(4);
    expect(MAX_IMAGE_DIMENSION).toBe(2400);
  });
  it("keeps PNGs and converts other accepted files to JPEG", () => {
    expect(imageCompressionOptions("image/png").fileType).toBe("image/png");
    expect(imageCompressionOptions("image/webp").fileType).toBe("image/jpeg");
  });
});
