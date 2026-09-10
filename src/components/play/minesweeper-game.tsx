"use client";

import { useEffect, useRef, useState } from "react";
import {
  createMinesweeperGame,
  isMinesweeperState,
  minesRemaining,
  revealMinesweeperCell,
  toggleMinesweeperFlag,
  updateMinesweeperElapsed,
  type MinesweeperDifficulty,
  type MinesweeperState,
} from "@/lib/games/minesweeper";
import { parseGameStorage } from "@/lib/games/persistence";

const storageKey = "w98:minesweeper:v1";
type MinesweeperStats = { bestTimes: Record<MinesweeperDifficulty, number | null> };

const initialStats: MinesweeperStats = { bestTimes: { beginner: null, intermediate: null } };
const isStats = (value: unknown): value is MinesweeperStats => {
  if (!value || typeof value !== "object") return false;
  const bestTimes = (value as { bestTimes?: unknown }).bestTimes;
  if (!bestTimes || typeof bestTimes !== "object") return false;
  return ["beginner", "intermediate"].every((key) => {
    const time = (bestTimes as Record<string, unknown>)[key];
    return time === null || typeof time === "number";
  });
};

function counter(value: number) {
  return String(Math.max(0, Math.min(999, value))).padStart(3, "0");
}

function cellLabel(state: MinesweeperState, index: number) {
  const cell = state.cells[index];
  const row = Math.floor(index / state.columns) + 1;
  const column = index % state.columns + 1;
  if (cell.flagged) return `Row ${row}, column ${column}, flagged`;
  if (!cell.revealed) return `Row ${row}, column ${column}, covered`;
  if (cell.mine) return `Row ${row}, column ${column}, mine`;
  return `Row ${row}, column ${column}, ${cell.adjacent || "no"} adjacent mines`;
}

export function MinesweeperGame({ compact = false }: { compact?: boolean }) {
  const [game, setGame] = useState(() => createMinesweeperGame());
  const [stats, setStats] = useState(initialStats);
  const [hydrated, setHydrated] = useState(false);
  const [focusedCell, setFocusedCell] = useState(0);
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const stored = parseGameStorage(
      window.localStorage.getItem(storageKey),
      { version: 1 as const, state: createMinesweeperGame(), stats: initialStats },
      isMinesweeperState,
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

  useEffect(() => {
    if (game.status !== "playing") return;
    const timer = window.setInterval(() => setGame((current) => updateMinesweeperElapsed(current)), 1_000);
    return () => window.clearInterval(timer);
  }, [game.status]);

  const newGame = (difficulty: MinesweeperDifficulty = game.difficulty) => {
    setGame(createMinesweeperGame(difficulty));
    setFocusedCell(0);
  };

  const reveal = (index: number) => {
    const next = revealMinesweeperCell(game, Math.floor(index / game.columns), index % game.columns);
    setGame(next);
    if (game.status !== "won" && next.status === "won") {
      setStats((current) => {
        const previous = current.bestTimes[next.difficulty];
        const nextBest = previous === null ? next.elapsedSeconds : Math.min(previous, next.elapsedSeconds);
        return { bestTimes: { ...current.bestTimes, [next.difficulty]: nextBest } };
      });
    }
  };

  const flag = (index: number) => {
    setGame((current) => toggleMinesweeperFlag(current, Math.floor(index / current.columns), index % current.columns));
  };

  const focusCell = (index: number) => {
    const normalized = Math.max(0, Math.min(game.cells.length - 1, index));
    setFocusedCell(normalized);
    cellRefs.current[normalized]?.focus();
  };

  const onCellKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const row = Math.floor(index / game.columns);
    const column = index % game.columns;
    if (event.key === "ArrowLeft") { event.preventDefault(); focusCell(row * game.columns + Math.max(0, column - 1)); }
    if (event.key === "ArrowRight") { event.preventDefault(); focusCell(row * game.columns + Math.min(game.columns - 1, column + 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); focusCell(Math.max(0, row - 1) * game.columns + column); }
    if (event.key === "ArrowDown") { event.preventDefault(); focusCell(Math.min(game.rows - 1, row + 1) * game.columns + column); }
    if (event.key.toLowerCase() === "f") { event.preventDefault(); flag(index); }
  };

  const statusText = game.status === "ready" ? "Choose any square to start. The first square is safe."
    : game.status === "playing" ? `${minesRemaining(game)} mines remain.`
      : game.status === "won" ? `You cleared the field in ${game.elapsedSeconds} seconds.`
        : "A mine ended this round. Start a new game to try again.";

  return (
    <section className={`minesweeper-app${compact ? " is-compact" : ""}`} aria-label="Minesweeper game">
      <header className="game-toolbar">
        <label>Difficulty
          <select value={game.difficulty} onChange={(event) => newGame(event.target.value as MinesweeperDifficulty)}>
            <option value="beginner">Beginner 9 x 9</option>
            <option value="intermediate">Intermediate 16 x 16</option>
          </select>
        </label>
        <button className="retro-button" type="button" onClick={() => newGame()}>New game</button>
      </header>

      <div className="mine-counter-panel" aria-label="Game counters">
        <span><small>Mines</small><b>{counter(minesRemaining(game))}</b></span>
        <button type="button" aria-label="Restart Minesweeper" onClick={() => newGame()}>{game.status === "lost" ? ":(" : game.status === "won" ? ":D" : ":)"}</button>
        <span><small>Time</small><b>{counter(game.elapsedSeconds)}</b></span>
      </div>

      <div
        className="mine-board"
        role="grid"
        aria-label={`${game.difficulty} Minesweeper board`}
        style={{ gridTemplateColumns: `repeat(${game.columns}, 1fr)` }}
      >
        {game.cells.map((cell, index) => (
          <button
            key={index}
            ref={(element) => { cellRefs.current[index] = element; }}
            type="button"
            role="gridcell"
            className={`mine-cell${cell.revealed ? " is-revealed" : ""}${cell.mine && cell.revealed ? " is-mine" : ""}`}
            data-adjacent={cell.revealed ? cell.adjacent : undefined}
            aria-label={cellLabel(game, index)}
            tabIndex={focusedCell === index ? 0 : -1}
            onFocus={() => setFocusedCell(index)}
            onClick={() => reveal(index)}
            onContextMenu={(event) => { event.preventDefault(); flag(index); }}
            onKeyDown={(event) => onCellKeyDown(event, index)}
          >
            {cell.flagged ? "F" : cell.revealed && cell.mine ? "*" : cell.revealed && cell.adjacent ? cell.adjacent : ""}
          </button>
        ))}
      </div>

      <p className="game-status" role="status" aria-live="polite">{hydrated ? statusText : "Restoring your last game..."}</p>
      <footer className="game-local-stats">
        <span>Beginner best: {stats.bestTimes.beginner === null ? "none" : `${stats.bestTimes.beginner}s`}</span>
        <span>Intermediate best: {stats.bestTimes.intermediate === null ? "none" : `${stats.bestTimes.intermediate}s`}</span>
      </footer>
      <p className="game-help">Click or press Enter to reveal. Right-click or press F to flag. Arrow keys move across the board.</p>
    </section>
  );
}
