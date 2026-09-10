"use client";

import { useEffect, useState } from "react";
import {
  autoMoveSolitaireCard,
  canMoveSolitaireCards,
  createSolitaireGame,
  drawSolitaireStock,
  isSolitaireState,
  moveSolitaireCards,
  selectedSolitaireCards,
  solitaireCardColor,
  solitaireSuits,
  undoSolitaireMove,
  type SolitaireCard,
  type SolitaireDestination,
  type SolitaireSelection,
  type SolitaireState,
  type SolitaireSuit,
} from "@/lib/games/solitaire";
import { parseGameStorage } from "@/lib/games/persistence";

const storageKey = "w98:solitaire:v1";
type SolitaireStats = { games: number; wins: number; bestMoves: number | null };
const initialStats: SolitaireStats = { games: 1, wins: 0, bestMoves: null };
const isStats = (value: unknown): value is SolitaireStats => Boolean(
  value && typeof value === "object" &&
  typeof (value as SolitaireStats).games === "number" &&
  typeof (value as SolitaireStats).wins === "number" &&
  ((value as SolitaireStats).bestMoves === null || typeof (value as SolitaireStats).bestMoves === "number"),
);

const suitSymbol: Record<SolitaireSuit, string> = { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" };
const rankLabel = (rank: number) => rank === 1 ? "A" : rank === 11 ? "J" : rank === 12 ? "Q" : rank === 13 ? "K" : String(rank);

function cardLabel(card: SolitaireCard) {
  const ranks = ["", "Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King"];
  return `${ranks[card.rank]} of ${card.suit}`;
}

function selectionMatches(selection: SolitaireSelection | null, source: SolitaireSelection) {
  if (!selection || selection.source !== source.source) return false;
  if (selection.source === "waste") return true;
  if (selection.source === "foundation" && source.source === "foundation") return selection.suit === source.suit;
  return selection.source === "tableau" && source.source === "tableau" && selection.pile === source.pile && selection.index === source.index;
}

function PlayingCard({ card, selected, style, onClick, onDoubleClick }: {
  card: SolitaireCard;
  selected?: boolean;
  style?: React.CSSProperties;
  onClick: () => void;
  onDoubleClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`playing-card is-${solitaireCardColor(card)}${card.faceUp ? " is-face-up" : " is-face-down"}${selected ? " is-selected" : ""}`}
      style={style}
      aria-label={card.faceUp ? cardLabel(card) : "Face-down card"}
      aria-pressed={selected}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {card.faceUp ? <><span>{rankLabel(card.rank)}</span><b>{suitSymbol[card.suit]}</b></> : <span className="card-back" aria-hidden="true">98</span>}
    </button>
  );
}

export function SolitaireGame({ compact = false }: { compact?: boolean }) {
  const [game, setGame] = useState<SolitaireState>(() => createSolitaireGame(() => 0.5));
  const [stats, setStats] = useState(initialStats);
  const [selection, setSelection] = useState<SolitaireSelection | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = parseGameStorage(
      window.localStorage.getItem(storageKey),
      { version: 1 as const, state: createSolitaireGame(), stats: initialStats },
      isSolitaireState,
      isStats,
    );
    const frame = window.requestAnimationFrame(() => {
      setGame(stored.state);
      setStats(stored.stats);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, state: game, stats }));
  }, [game, hydrated, stats]);

  const newGame = () => {
    setGame(createSolitaireGame());
    setSelection(null);
    setStats((current) => ({ ...current, games: current.games + 1 }));
  };

  const chooseSource = (source: SolitaireSelection) => {
    if (!selectedSolitaireCards(game, source).length) return;
    setSelection((current) => selectionMatches(current, source) ? null : source);
  };

  const moveTo = (destination: SolitaireDestination) => {
    if (!selection) return;
    if (!canMoveSolitaireCards(game, selection, destination)) return;
    const next = moveSolitaireCards(game, selection, destination);
    setGame(next);
    if (game.status !== "won" && next.status === "won") {
      setStats((current) => ({ ...current, wins: current.wins + 1, bestMoves: current.bestMoves === null ? next.moves : Math.min(current.bestMoves, next.moves) }));
    }
    setSelection(null);
  };

  const autoMove = (source: SolitaireSelection) => {
    const next = autoMoveSolitaireCard(game, source);
    setGame(next);
    if (game.status !== "won" && next.status === "won") {
      setStats((current) => ({ ...current, wins: current.wins + 1, bestMoves: current.bestMoves === null ? next.moves : Math.min(current.bestMoves, next.moves) }));
    }
    setSelection(null);
  };

  const onBoardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" ? -7 : 7;
    buttons[Math.max(0, Math.min(buttons.length - 1, current + delta))]?.focus();
  };

  if (!hydrated) return <div className="game-loading" role="status">Restoring your saved Solitaire game...</div>;

  const wasteTop = game.waste.at(-1);
  return (
    <section className={`solitaire-app${compact ? " is-compact" : ""}`} aria-label="Klondike Solitaire game">
      <header className="game-toolbar solitaire-toolbar">
        <div>
          <button className="retro-button" type="button" onClick={newGame}>New game</button>
          <button className="retro-button" type="button" disabled={!game.history.length} onClick={() => { setGame((current) => undoSolitaireMove(current)); setSelection(null); }}>Undo</button>
        </div>
        <span>Moves: <b>{game.moves}</b></span>
      </header>

      <div className="solitaire-board" onKeyDown={onBoardKeyDown}>
        <div className="solitaire-top-row">
          <div className="solitaire-deck-area">
            <button className={`card-slot stock-slot${game.stock.length ? " has-cards" : ""}`} type="button" onClick={() => { setGame((current) => drawSolitaireStock(current)); setSelection(null); }} aria-label={game.stock.length ? `Draw from stock, ${game.stock.length} cards remain` : "Recycle waste into stock"}>
              {game.stock.length ? <span aria-hidden="true">98</span> : <span aria-hidden="true">↻</span>}
            </button>
            <div className="waste-slot card-slot">
              {wasteTop && <PlayingCard card={wasteTop} selected={selectionMatches(selection, { source: "waste" })} onClick={() => chooseSource({ source: "waste" })} onDoubleClick={() => autoMove({ source: "waste" })} />}
            </div>
          </div>
          <div className="foundation-row" aria-label="Foundations">
            {solitaireSuits.map((suit) => {
              const top = game.foundations[suit].at(-1);
              const source = { source: "foundation" as const, suit };
              return (
                <div className="foundation-slot card-slot" key={suit}>
                  {top ? <PlayingCard card={top} selected={selectionMatches(selection, source)} onClick={() => selection ? moveTo({ destination: "foundation", suit }) : chooseSource(source)} />
                    : <button type="button" aria-label={`Empty ${suit} foundation`} onClick={() => moveTo({ destination: "foundation", suit })}>{suitSymbol[suit]}</button>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="tableau" aria-label="Tableau">
          {game.tableau.map((pile, pileIndex) => (
            <div className="tableau-pile card-slot" key={pileIndex} style={{ minHeight: `${Math.max(150, 104 + pile.length * 24)}px` }}>
              {!pile.length && <button className="empty-tableau" type="button" aria-label={`Empty tableau pile ${pileIndex + 1}`} onClick={() => moveTo({ destination: "tableau", pile: pileIndex })}>K</button>}
              {pile.map((card, cardIndex) => {
                const source = { source: "tableau" as const, pile: pileIndex, index: cardIndex };
                return <PlayingCard key={card.id} card={card} selected={selectionMatches(selection, source)} style={{ top: `${cardIndex * (compact ? 17 : 24)}px` }} onClick={() => selection && canMoveSolitaireCards(game, selection, { destination: "tableau", pile: pileIndex }) ? moveTo({ destination: "tableau", pile: pileIndex }) : chooseSource(source)} onDoubleClick={() => autoMove(source)} />;
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="game-status" role="status" aria-live="polite">{game.status === "won" ? `You won in ${game.moves} moves.` : selection ? `Selected ${cardLabel(selectedSolitaireCards(game, selection)[0])}. Choose a destination.` : "Select a card, then select a legal destination."}</p>
      <footer className="game-local-stats"><span>Games: {stats.games}</span><span>Wins: {stats.wins}</span><span>Best: {stats.bestMoves === null ? "none" : `${stats.bestMoves} moves`}</span></footer>
      <p className="game-help">Every move works with click, touch, or keyboard. Double-click a single card to send it to a legal foundation.</p>
    </section>
  );
}
