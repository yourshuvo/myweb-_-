export type W98IconName =
  | "address-book"
  | "camera"
  | "chess"
  | "computer"
  | "folder"
  | "folder-open"
  | "media-player"
  | "minesweeper"
  | "notepad-file"
  | "paint"
  | "pictures"
  | "solitaire"
  | "user-computer";

export type PublicAppId =
  | "home"
  | "updates"
  | "update"
  | "photos"
  | "photo"
  | "albums"
  | "album"
  | "archive"
  | "guestbook"
  | "ask"
  | "movies"
  | "play"
  | "music"
  | "minesweeper"
  | "solitaire"
  | "chess"
  | "about"
  | "privacy";

export type PublicAppGroup = "documents" | "programs" | "system";

export type PublicAppDefinition = {
  id: PublicAppId;
  href: string;
  title: string;
  mobileLabel: string;
  icon: W98IconName;
  group: PublicAppGroup;
  desktopShortcut?: boolean;
  windowClass?: string;
};

const iconFiles: Record<W98IconName, string> = {
  "address-book": "w98_address_book",
  camera: "w98_camera",
  chess: "w98_chess",
  computer: "w98_computer",
  folder: "w98_directory_closed",
  "folder-open": "w98_directory_open",
  "media-player": "w98_media_player",
  minesweeper: "w98_minesweeper",
  "notepad-file": "w98_notepad_file",
  paint: "w98_paint",
  pictures: "w98_directory_pictures",
  solitaire: "w98_game_solitaire",
  "user-computer": "w98_user_computer",
};

export const publicApps = [
  { id: "home", href: "/", title: "Welcome.txt", mobileLabel: "Home", icon: "computer", group: "system", windowClass: "win98-window--welcome" },
  { id: "updates", href: "/updates", title: "Life Updates - Windows Explorer", mobileLabel: "Updates", icon: "notepad-file", group: "documents", desktopShortcut: true, windowClass: "win98-window--explorer" },
  { id: "photos", href: "/photos", title: "My Pictures - Windows Explorer", mobileLabel: "Photos", icon: "camera", group: "documents", desktopShortcut: true, windowClass: "win98-window--explorer" },
  { id: "albums", href: "/photos/albums", title: "Photo Albums - Windows Explorer", mobileLabel: "Albums", icon: "pictures", group: "documents" },
  { id: "archive", href: "/archive", title: "Archive - Windows Explorer", mobileLabel: "Archive", icon: "folder-open", group: "documents", desktopShortcut: true, windowClass: "win98-window--explorer" },
  { id: "guestbook", href: "/guestbook", title: "Guestbook - Internet Explorer", mobileLabel: "Guestbook", icon: "address-book", group: "documents", desktopShortcut: true, windowClass: "win98-window--browser" },
  { id: "ask", href: "/ask", title: "Private Message - Internet Explorer", mobileLabel: "Private Message", icon: "address-book", group: "documents", windowClass: "win98-window--browser" },
  { id: "movies", href: "/movies", title: "Movie Suggestions - Windows Explorer", mobileLabel: "Movies", icon: "media-player", group: "documents", desktopShortcut: true, windowClass: "win98-window--movies" },
  { id: "play", href: "/play", title: "Games - Windows Explorer", mobileLabel: "Play", icon: "folder", group: "programs", windowClass: "win98-window--games" },
  { id: "music", href: "/play/music", title: "Media Player", mobileLabel: "Music", icon: "media-player", group: "programs", windowClass: "win98-window--program" },
  { id: "minesweeper", href: "/play/minesweeper", title: "Minesweeper", mobileLabel: "Minesweeper", icon: "minesweeper", group: "programs", windowClass: "win98-window--program" },
  { id: "solitaire", href: "/play/solitaire", title: "Solitaire", mobileLabel: "Solitaire", icon: "solitaire", group: "programs", windowClass: "win98-window--game-wide" },
  { id: "chess", href: "/play/chess", title: "My AI Chess", mobileLabel: "Chess", icon: "chess", group: "programs", windowClass: "win98-window--game-wide" },
  { id: "about", href: "/about", title: "About Me - System Properties", mobileLabel: "About", icon: "user-computer", group: "system", desktopShortcut: true, windowClass: "win98-window--properties" },
  { id: "privacy", href: "/privacy", title: "Privacy.txt - Notepad", mobileLabel: "Privacy", icon: "notepad-file", group: "system", windowClass: "win98-window--document" },
] as const satisfies readonly PublicAppDefinition[];

const fallbackApp = publicApps[0];

export function iconPath(icon: W98IconName, size: 16 | 32) {
  return `/icons/w98/${iconFiles[icon]}-${size}.png`;
}

export function resolvePublicApp(pathname: string): PublicAppDefinition {
  if (/^\/updates\/[^/]+$/.test(pathname)) {
    return { id: "update", href: pathname, title: "Update - WordPad", mobileLabel: "Update", icon: "notepad-file", group: "documents", windowClass: "win98-window--document win98-window--reader" };
  }
  if (/^\/photos\/albums\/[^/]+$/.test(pathname)) {
    return { id: "album", href: pathname, title: "Photo Album - Windows Explorer", mobileLabel: "Album", icon: "pictures", group: "documents", windowClass: "win98-window--explorer" };
  }
  if (/^\/photos\/[^/]+$/.test(pathname)) {
    return { id: "photo", href: pathname, title: "Photo - Imaging", mobileLabel: "Photo", icon: "paint", group: "documents", windowClass: "win98-window--viewer" };
  }
  if (pathname.startsWith("/archive/")) {
    return { ...publicApps.find((app) => app.id === "archive")!, href: pathname };
  }

  const exact = publicApps.find((app) => app.href === pathname);
  return exact || fallbackApp;
}

export function parentHref(pathname: string) {
  if (/^\/updates\/[^/]+$/.test(pathname)) return "/updates";
  if (/^\/photos\/albums\/[^/]+$/.test(pathname)) return "/photos/albums";
  if (/^\/photos\/[^/]+$/.test(pathname)) return "/photos";
  if (pathname.startsWith("/archive/")) {
    const parts = pathname.split("/").filter(Boolean);
    return parts.length > 2 ? `/${parts.slice(0, -1).join("/")}` : "/archive";
  }
  if (pathname.startsWith("/play/")) return "/play";
  if (pathname === "/ask") return "/guestbook";
  if (pathname === "/photos/albums") return "/photos";
  return "/";
}

export const desktopShortcutApps = publicApps.filter((app) => "desktopShortcut" in app && app.desktopShortcut);
export const startMenuApps = publicApps.filter((app) => app.id !== "home");
