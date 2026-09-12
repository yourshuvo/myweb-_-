import type { Metadata } from "next";
import { PageShell } from "@/components/retro/page-shell";
import { getPublicProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How this personal site uses browser storage, third-party services, and public submissions.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const profile = await getPublicProfile();
  return (
    <PageShell profile={profile} title="Privacy.txt - Notepad">
      <article className="privacy-note">
        <header><p className="eyebrow">PRIVACY.TXT</p><h1>What this site stores</h1><p>This is a small personal website. It keeps only the information needed for publishing, the guestbook, and optional entertainment features.</p></header>
        <section><h2>Visitor counter cookie</h2><p>A signed HttpOnly cookie helps count a browser once. It lasts up to 365 days, contains no raw IP address, and is not used for advertising.</p></section>
        <section><h2>Local game storage</h2><p>Minesweeper, Solitaire, and My AI Chess save active games, best times, and statistics in localStorage on your device. Chess loads Stockfish as a local WebAssembly worker. No game moves reach Neon or another server. Clearing site data removes saved games.</p></section>
        <section><h2>Guestbook</h2><p>Guestbook messages and optional display names are public and stored in Neon. Submissions are limited per browser using a one-way visitor hash rather than any stored identity.</p></section>
        <section><h2>Private anonymous messages</h2><p>The anonymous message form stores only the message in Neon. It does not ask for a name, email address, social account, or location. The signed visitor cookie is converted into a one-way hash for a separate three-message-per-day limit.</p></section>
        <section><h2>Spotify</h2><p>The Spotify script and player do not load until you choose to load them for the current browser session. After consent, Spotify may set cookies or collect device information under Spotify&apos;s own policies. This site does not receive Spotify account or listening data.</p></section>
        <section><h2>Movie data</h2><p>Published movie suggestions use titles, summaries, and poster images supplied by TMDB. Posters load from TMDB&apos;s image service. This site does not send visitor identities or viewing activity to TMDB.</p></section>
        <section><h2>Uploaded content</h2><p>Published posts, profile details, photos, and visible guestbook messages are stored for public display. Anonymous messages remain private to the owner dashboard. Images are delivered through the Hack Club CDN.</p></section>
        {profile.contactEmail && <section><h2>Questions</h2><p>Email <a href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a> with a privacy question or a request about a guestbook entry.</p></section>}
      </article>
    </PageShell>
  );
}
