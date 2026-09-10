import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { hasTmdbConfig } from "@/lib/env";
import { searchTmdbMovies, TmdbRequestError } from "@/lib/tmdb";
import { tmdbSearchSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!hasTmdbConfig()) {
    return NextResponse.json({ error: "TMDB is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const url = new URL(request.url);
  const parsed = tmdbSearchSchema.safeParse({ query: url.searchParams.get("q") || "" });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Enter a movie title." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const results = await searchTmdbMovies(parsed.data.query);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof TmdbRequestError ? error.message : "The movie search could not be completed.";
    const status = error instanceof TmdbRequestError && error.status === 401 ? 503 : 502;
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
