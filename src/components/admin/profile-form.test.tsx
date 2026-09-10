// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileForm } from "@/components/admin/profile-form";
import type { MediaAsset } from "@/db/schema";
import type { PublicProfile } from "@/lib/data";

const saveProfileAction = vi.fn();
const compressImage = vi.fn();

vi.mock("@/app/admin/actions", () => ({
  saveProfileAction: (...args: unknown[]) => saveProfileAction(...args),
}));

vi.mock("browser-image-compression", () => ({
  default: (...args: unknown[]) => compressImage(...args),
}));

const existingAsset: MediaAsset = {
  id: "11111111-1111-4111-8111-111111111111",
  cdnId: "existing",
  url: "https://cdn.hackclub.com/existing/profile.jpg",
  filename: "profile.jpg",
  mimeType: "image/jpeg",
  byteSize: 1200,
  width: 800,
  height: 800,
  altText: "Portrait of Owner",
  caption: "",
  takenDate: null,
  showInPhotoLog: false,
  createdAt: new Date("2026-07-01T00:00:00Z"),
};

const profile: PublicProfile = {
  displayName: "Owner",
  siteTitle: "Owner's site",
  biography: "",
  contactEmail: "",
  socialLinks: {},
  avatarMediaId: existingAsset.id,
  avatarUrl: existingAsset.url,
  spotifyPlaylistTitle: "",
  spotifyPlaylistUrl: "",
  onboarded: true,
};

describe("ProfileForm profile image upload", () => {
  beforeEach(() => {
    saveProfileAction.mockReset();
    compressImage.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:profile-preview"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps the saved profile image selected", () => {
    render(<ProfileForm profile={profile} media={[existingAsset]} onboarding={false} />);

    expect((screen.getByLabelText("Current image") as HTMLSelectElement).value).toBe(existingAsset.id);
    expect((screen.getByAltText("Profile image preview") as HTMLImageElement).src).toBe(existingAsset.url);
  });

  it("uploads an optimized image to the CDN and selects the returned asset", async () => {
    const source = new File(["source"], "new-profile.png", { type: "image/png" });
    const optimized = new File(["optimized"], "new-profile.png", { type: "image/png" });
    const uploadedAsset = {
      id: "22222222-2222-4222-8222-222222222222",
      url: "https://cdn.hackclub.com/uploaded/new-profile.png",
      filename: "new-profile.png",
      altText: "Owner smiling",
    };
    compressImage.mockResolvedValue(optimized);
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ asset: uploadedAsset }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));

    render(<ProfileForm profile={profile} media={[existingAsset]} onboarding={false} />);
    fireEvent.change(screen.getByLabelText("Choose profile image"), { target: { files: [source] } });
    fireEvent.change(screen.getByPlaceholderText("Portrait of..."), { target: { value: "Owner smiling" } });
    fireEvent.click(screen.getByRole("button", { name: "Upload to CDN" }));

    await waitFor(() => expect(screen.getByText(/Uploaded to Hack Club CDN and selected/i)).toBeTruthy());
    expect(compressImage).toHaveBeenCalledWith(source, expect.objectContaining({ maxWidthOrHeight: 2400 }));
    expect(fetch).toHaveBeenCalledWith("/api/admin/media", expect.objectContaining({ method: "POST" }));
    const request = vi.mocked(fetch).mock.calls[0][1];
    const body = request?.body as FormData;
    expect(body.get("file")).toBeInstanceOf(File);
    expect((body.get("file") as File).name).toBe(optimized.name);
    expect((body.get("file") as File).type).toBe(optimized.type);
    expect(body.get("altText")).toBe("Owner smiling");
    expect(body.get("showInPhotoLog")).toBeNull();
    expect((screen.getByLabelText("Current image") as HTMLSelectElement).value).toBe(uploadedAsset.id);
    expect((screen.getByAltText("Profile image preview") as HTMLImageElement).src).toBe(uploadedAsset.url);
  });
});
