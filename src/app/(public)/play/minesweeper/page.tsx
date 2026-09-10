import type { Metadata } from "next";
import { MinesweeperGame } from "@/components/play/minesweeper-game";
import { PageShell } from "@/components/retro/page-shell";
import { getPublicProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: "Minesweeper",
  description: "Play accessible beginner or intermediate Minesweeper with local best times.",
  alternates: { canonical: "/play/minesweeper" },
  openGraph: { title: "Minesweeper", description: "A Windows 98 style Minesweeper game.", url: "/play/minesweeper" },
};

export default async function MinesweeperPage() {
  const profile = await getPublicProfile();
  return (
    <PageShell profile={profile} title="Minesweeper">
      <header className="page-heading play-app-heading"><h1>Minesweeper</h1><p>Clear every safe square. Your active board and best times stay in this browser.</p></header>
      <MinesweeperGame />
    </PageShell>
  );
}
