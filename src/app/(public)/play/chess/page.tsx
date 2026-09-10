import type { Metadata } from "next";
import { ChessGame } from "@/components/play/chess-game";
import { PageShell } from "@/components/retro/page-shell";
import { getPublicProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: "My AI Chess",
  description: "Play Stockfish 18 privately in a Windows 98 style chess application.",
  alternates: { canonical: "/play/chess" },
  openGraph: { title: "My AI Chess", description: "Play Stockfish 18 privately in your browser.", url: "/play/chess" },
};

export default async function ChessPage() {
  const profile = await getPublicProfile();
  return (
    <PageShell profile={profile} title="My AI Chess">
      <header className="page-heading play-app-heading">
        <p className="eyebrow">ENTERTAINMENT / LOCAL AI</p>
        <h1>My AI Chess</h1>
        <p>Play White or Black against Stockfish 18. The engine and saved game stay entirely in this browser.</p>
      </header>
      <ChessGame />
    </PageShell>
  );
}
