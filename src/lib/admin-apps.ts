import type { W98IconName } from "@/lib/public-apps";

export type AdminAppId = "overview" | "posts" | "media" | "albums" | "movies" | "messages" | "profile";

export type AdminAppDefinition = {
  id: AdminAppId;
  href: string;
  label: string;
  title: string;
  icon: W98IconName;
};

export const adminApps = [
  { id: "overview", href: "/admin", label: "Overview", title: "Control Panel", icon: "computer" },
  { id: "posts", href: "/admin/posts", label: "Posts", title: "Posts - Windows Explorer", icon: "notepad-file" },
  { id: "media", href: "/admin/media", label: "Media", title: "Media Library - My Pictures", icon: "camera" },
  { id: "albums", href: "/admin/albums", label: "Albums", title: "Albums - My Pictures", icon: "pictures" },
  { id: "movies", href: "/admin/movies", label: "Movies", title: "Movie Suggestions", icon: "media-player" },
  { id: "messages", href: "/admin/guestbook", label: "Messages", title: "Messages", icon: "address-book" },
  { id: "profile", href: "/admin/profile", label: "Profile", title: "Profile - System Properties", icon: "user-computer" },
] as const satisfies readonly AdminAppDefinition[];

export function resolveAdminApp(pathname: string): AdminAppDefinition {
  const postsApp = adminApps.find((app) => app.id === "posts")!;
  const albumsApp = adminApps.find((app) => app.id === "albums")!;
  if (pathname.startsWith("/admin/posts/") && pathname !== "/admin/posts") {
    return { ...postsApp, href: pathname, label: pathname.endsWith("/new") ? "New Post" : "Edit Post", title: "Post - WordPad" };
  }
  if (pathname.startsWith("/admin/albums/") && pathname !== "/admin/albums") {
    return { ...albumsApp, href: pathname, label: pathname.endsWith("/new") ? "New Album" : "Edit Album", title: "Album - My Pictures" };
  }
  return adminApps.find((app) => app.href === pathname) || adminApps[0];
}

export function adminParentHref(pathname: string) {
  if (pathname.startsWith("/admin/posts/")) return "/admin/posts";
  if (pathname.startsWith("/admin/albums/")) return "/admin/albums";
  return "/admin";
}
