import { NextResponse } from "next/server";
import { hasVisitorTrackingConfig } from "@/lib/env";
import { getVisitorCount, incrementVisitorCount } from "@/lib/guestbook-data";
import { getOrCreateVisitorIdentity } from "@/lib/visitor-cookie";

export const dynamic = "force-dynamic";

export async function POST() {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  if (!hasVisitorTrackingConfig()) {
    return NextResponse.json({ total: null }, { status: 503, headers });
  }

  try {
    const identity = await getOrCreateVisitorIdentity();
    const total = identity.isNew ? await incrementVisitorCount() : await getVisitorCount();
    return NextResponse.json({ total }, { headers });
  } catch {
    return NextResponse.json({ total: null }, { status: 503, headers });
  }
}
