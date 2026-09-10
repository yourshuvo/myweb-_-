import type { Metadata } from "next";
import Link from "next/link";
import { W98Icon } from "@/components/desktop/w98-icon";
import { PageShell } from "@/components/retro/page-shell";
import { getPublicProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: "Play",
  description: "Music, Minesweeper, Klondike Solitaire, and Stockfish Chess in a Windows 98 entertainment folder.",
  alternates: { canonical: "/play" },
  openGraph: { title: "Windows 98 Entertainment Pack", description: "Music and three private browser games.", url: "/play" },
};

export default async function PlayPage() {
  const profile = await getPublicProfile();
  return (
    <PageShell profile={profile} title="Games - Windows Explorer">
      <header className="page-heading play-heading">
        <h1>Entertainment Pack</h1>
        <p>Listen to the featured playlist or keep a game going in this browser.</p>
      </header>
      <div className="play-hub">
        <Link className="play-hub__feature" href="/play/music">
          <span><W98Icon icon="media-player" size={32} /></span>
          <div><small>Spotify player</small><h2>Music</h2><p>Loads only after you choose to connect to Spotify.</p></div>
        </Link>
        <div className="play-hub__games">
          <Link href="/play/minesweeper"><W98Icon icon="minesweeper" size={32} /><div><h2>Minesweeper</h2><p>Clear 9 x 9 or 16 x 16 fields.</p></div></Link>
          <Link href="/play/solitaire"><W98Icon icon="solitaire" size={32} /><div><h2>Solitaire</h2><p>Play draw-one Klondike with undo.</p></div></Link>
          <Link href="/play/chess"><W98Icon icon="chess" size={32} /><div><h2>My AI Chess</h2><p>Challenge Stockfish 18 in your browser.</p></div></Link>
        </div>
      </div>
      <p className="play-storage-note">Game progress and scores stay in this browser. Nothing from the games is sent to the site database.</p>
    </PageShell>
  );
}
