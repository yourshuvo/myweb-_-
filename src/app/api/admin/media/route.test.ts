import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ inserted: [] as unknown[] }));

vi.mock("@/lib/auth/server", () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: "admin" }) }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/db", () => ({
  requireDb: () => ({
    insert: () => ({
      values: (values: unknown) => {
        state.inserted.push(values);
        return { returning: async () => [{ id: "asset-1", ...(values as object) }] };
      },
    }),
  }),
}));

const { POST } = await import("@/app/api/admin/media/route");

/** A byte buffer with a valid PNG header at the requested dimensions. */
function pngHeader(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  const put32 = (value: number, offset: number) => {
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
  };
  put32(width, 16);
  put32(height, 20);
  return bytes;
}

function uploadRequest(content: Uint8Array<ArrayBuffer>, type = "image/png") {
  const body = new FormData();
  body.append("file", new File([content], "photo.png", { type }), "photo.png");
  body.append("altText", "A test photograph");
  body.append("caption", "");
  body.append("takenDate", "");
  body.append("showInPhotoLog", "on");
  return new Request("http://localhost/api/admin/media", { method: "POST", body });
}

function successfulCdn() {
  return Response.json(
    {
      id: "cdn-1",
      filename: "photo.png",
      size: 2048,
      content_type: "image/png",
      url: "https://cdn.hackclub.com/cdn-1/photo.png",
    },
    { status: 201 },
  );
}

describe("POST /api/admin/media", () => {
  beforeEach(() => {
    vi.stubEnv("HACKCLUB_CDN_API_KEY", "test-key");
    state.inserted.length = 0;
  });

  it("stores the image using dimensions read from the file header", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successfulCdn()));

    const response = await POST(uploadRequest(pngHeader(2400, 1350)));

    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(state.inserted[0]).toMatchObject({ width: 2400, height: 1350 });
  });

  it("rejects an unreadable file with JSON instead of crashing", async () => {
    const response = await POST(uploadRequest(new TextEncoder().encode("<html>not an image</html>")));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: "The uploaded file is not a readable image." });
  });

  it("rejects images above the 2400px limit", async () => {
    const response = await POST(uploadRequest(pngHeader(4000, 100)));

    expect(response.status).toBe(422);
  });

  it("returns JSON when the CDN request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const response = await POST(uploadRequest(pngHeader(100, 100)));

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
