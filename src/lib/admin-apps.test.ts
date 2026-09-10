import { describe, expect, it } from "vitest";
import { adminApps, adminParentHref, resolveAdminApp } from "@/lib/admin-apps";

describe("admin application registry", () => {
  it("contains the owner applications including the movie catalog", () => {
    expect(adminApps.map((app) => app.label)).toEqual(["Overview", "Posts", "Media", "Albums", "Movies", "Messages", "Profile"]);
  });

  it("maps editors to their parent Explorer folders", () => {
    expect(resolveAdminApp("/admin/posts/new").title).toBe("Post - WordPad");
    expect(resolveAdminApp("/admin/albums/album-id").title).toBe("Album - My Pictures");
    expect(adminParentHref("/admin/posts/post-id")).toBe("/admin/posts");
    expect(adminParentHref("/admin/albums/album-id")).toBe("/admin/albums");
  });
});
