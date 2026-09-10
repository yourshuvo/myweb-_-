import type { Metadata } from "next";
import { SpotifyPlayer } from "@/components/play/spotify-player";
import { PageShell } from "@/components/retro/page-shell";
import { getPublicProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: "Music",
  description: "The owner's featured Spotify playlist, loaded only with visitor consent.",
  alternates: { canonical: "/play/music" },
  openGraph: { title: "Music", description: "A consent-gated featured Spotify playlist.", url: "/play/music" },
};

export default async function MusicPage() {
  const profile = await getPublicProfile();
  return (
    <PageShell profile={profile} title="Media Player">
      <header className="page-heading play-app-heading"><h1>Music</h1><p>The player stays disconnected until you choose to load it for this browser session.</p></header>
      <SpotifyPlayer title={profile.spotifyPlaylistTitle} url={profile.spotifyPlaylistUrl} />
    </PageShell>
  );
}
