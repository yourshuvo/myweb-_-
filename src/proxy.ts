import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parseArchiveSelection } from "@/lib/archive";
import { publicArchiveFolderExists, publicPhotoExists } from "@/lib/archive-existence";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hardNotFound(request: NextRequest) {
  return NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 });
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/archive" || request.nextUrl.pathname.startsWith("/archive/")) {
    const segments = request.nextUrl.pathname.split("/").filter(Boolean).slice(1);
    const selection = parseArchiveSelection(segments);
    if (!selection || !(await publicArchiveFolderExists(selection))) return hardNotFound(request);
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/photos/albums" || request.nextUrl.pathname.startsWith("/photos/albums/")) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/photos/")) {
    const id = request.nextUrl.pathname.split("/").filter(Boolean)[1] || "";
    if (!uuidPattern.test(id) || !(await publicPhotoExists(id))) return hardNotFound(request);
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/archive/:path*", "/photos/:id"],
};
