import type { Metadata } from "next";
import { SolitaireGame } from "@/components/play/solitaire-game";
import { PageShell } from "@/components/retro/page-shell";
import { getPublicProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: "Klondike Solitaire",
  description: "Play draw-one Klondike Solitaire with undo and local statistics.",
  alternates: { canonical: "/play/solitaire" },
  openGraph: { title: "Klondike Solitaire", description: "A local Windows 98 style card game.", url: "/play/solitaire" },
};

export default async function SolitairePage() {
  const profile = await getPublicProfile();
  return (
    <PageShell profile={profile} title="Solitaire">
      <header className="page-heading play-app-heading"><h1>Klondike Solitaire</h1><p>Draw one card at a time. Move every suit from Ace to King to win.</p></header>
      <SolitaireGame />
    </PageShell>
  );
}
