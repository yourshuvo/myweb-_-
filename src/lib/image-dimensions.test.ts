import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { readImageDimensions } from "@/lib/image-dimensions";

function render(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: 12, g: 34, b: 56 } } });
}

/** Builds a minimal VP8X (extended) WebP header, which sharp rarely emits on its own. */
function webpVp8x(width: number, height: number) {
  const bytes = new Uint8Array(30);
  const write = (text: string, offset: number) => {
    for (let index = 0; index < text.length; index += 1) bytes[offset + index] = text.charCodeAt(index);
  };
  const put24 = (value: number, offset: number) => {
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >> 8) & 0xff;
    bytes[offset + 2] = (value >> 16) & 0xff;
  };
  write("RIFF", 0);
  write("WEBP", 8);
  write("VP8X", 12);
  bytes[16] = 10; // chunk size
  put24(width - 1, 24);
  put24(height - 1, 27);
  return bytes;
}

describe("readImageDimensions", () => {
  it("reads PNG dimensions from the IHDR header", async () => {
    const buffer = await render(2400, 1350).png().toBuffer();
    expect(readImageDimensions(buffer)).toEqual({ width: 2400, height: 1350 });
  });

  it("reads JPEG dimensions from the frame header", async () => {
    const buffer = await render(640, 480).jpeg().toBuffer();
    expect(readImageDimensions(buffer)).toEqual({ width: 640, height: 480 });
  });

  it("reads lossy WebP dimensions", async () => {
    const buffer = await render(800, 600).webp().toBuffer();
    expect(readImageDimensions(buffer)).toEqual({ width: 800, height: 600 });
  });

  it("reads lossless WebP dimensions", async () => {
    const buffer = await render(321, 123).webp({ lossless: true }).toBuffer();
    expect(readImageDimensions(buffer)).toEqual({ width: 321, height: 123 });
  });

  it("reads extended (VP8X) WebP dimensions", () => {
    expect(readImageDimensions(webpVp8x(1234, 567))).toEqual({ width: 1234, height: 567 });
  });

  it("returns null for data that is not an image header", () => {
    expect(readImageDimensions(new Uint8Array(64))).toBeNull();
    expect(readImageDimensions(new TextEncoder().encode("<!DOCTYPE html><html></html>"))).toBeNull();
  });

  it("returns null for buffers too short to hold a header", () => {
    expect(readImageDimensions(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });
});
