import { getAuth } from "@/lib/auth/server";

function unavailable() {
  return Response.json({ error: "Neon Auth is not configured." }, { status: 503 });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = getAuth();
  return auth ? auth.handler().GET(request, context) : unavailable();
}

export async function POST(request: Request, context: RouteContext) {
  const auth = getAuth();
  return auth ? auth.handler().POST(request, context) : unavailable();
}
