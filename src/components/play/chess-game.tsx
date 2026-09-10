"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyChessMove,
  chessSquareName,
  compactChessState,
  createChessGame,
  generateLegalChessMoves,
  isChessKingInCheck,
  isChessState,
  undoChessTurn,
  type ChessColor,
  type ChessPiece,
  type ChessState,
} from "@/lib/games/chess";
import { parseGameStorage, saveGameStorage } from "@/lib/games/persistence";
import { chessStateToFen, parseStockfishMove, StockfishBrowserEngine, type StockfishStrength } from "@/lib/games/stockfish";

const storageKey = "w98:chess:v1";
type ChessStats = { games: number; wins: number; losses: number; draws: number };
const initialStats: ChessStats = { games: 1, wins: 0, losses: 0, draws: 0 };

const isStats = (value: unknown): value is ChessStats => Boolean(
  value && typeof value === "object" &&
  typeof (value as ChessStats).games === "number" &&
  typeof (value as ChessStats).wins === "number" &&
  typeof (value as ChessStats).losses === "number" &&
  typeof (value as ChessStats).draws === "number",
);

const glyphs: Record<ChessColor, Record<ChessPiece["type"], string>> = {
  white: { king: "\u2654", queen: "\u2655", rook: "\u2656", bishop: "\u2657", knight: "\u2658", pawn: "\u2659" },
  black: { king: "\u265A", queen: "\u265B", rook: "\u265C", bishop: "\u265D", knight: "\u265E", pawn: "\u265F" },
};

function pieceLabel(piece: ChessPiece | null, square: number) {
  return `${chessSquareName(square)}, ${piece ? `${piece.color} ${piece.type}` : "empty"}`;
}

function updateStatsForResult(stats: ChessStats, game: ChessState) {
  if (game.status === "stalemate") return { ...stats, draws: stats.draws + 1 };
  if (game.status === "checkmate" && game.winner === game.humanColor) return { ...stats, wins: stats.wins + 1 };
  if (game.status === "checkmate") return { ...stats, losses: stats.losses + 1 };
  return stats;
}

export function ChessGame({ compact = false }: { compact?: boolean }) {
  const stockfish = useRef<StockfishBrowserEngine | null>(null);
  const [game, setGame] = useState<ChessState>(() => createChessGame());
  const [stats, setStats] = useState(initialStats);
  const [strength, setStrength] = useState<StockfishStrength>("standard");
  const [selected, setSelected] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [engineError, setEngineError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [retry, setRetry] = useState(0);
  const computerThinking = hydrated && game.status === "playing" && game.turn !== game.humanColor;

  useEffect(() => {
    const stored = parseGameStorage(
      window.localStorage.getItem(storageKey),
      { version: 1 as const, state: createChessGame(), stats: initialStats },
      isChessState,
      isStats,
    );
    const frame = window.requestAnimationFrame(() => {
      setGame(compactChessState(stored.state));
      setStats(stored.stats);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state = compactChessState(game);
    const result = saveGameStorage(
      window.localStorage,
      storageKey,
      { version: 1, state, stats },
      { version: 1, state: { ...state, history: [] }, stats },
    );
    const message = result === "saved" ? "" : result === "compacted"
      ? "The active game was saved, but older undo history was cleared to free browser storage."
      : "Browser storage is full. You can keep playing, but this game may not survive a reload.";
    const frame = window.requestAnimationFrame(() => setStorageWarning(message));
    return () => window.cancelAnimationFrame(frame);
  }, [game, hydrated, stats]);

  useEffect(() => {
    if (!computerThinking) return;
    let cancelled = false;
    const engine = stockfish.current || new StockfishBrowserEngine();
    stockfish.current = engine;
    engine.bestMove(chessStateToFen(game), strength).then((uciMove) => {
      if (cancelled) return;
      const move = parseStockfishMove(uciMove);
      if (!move) throw new Error("Stockfish returned an unreadable move.");
      setGame((current) => {
        if (current.status !== "playing" || current.turn === current.humanColor) return current;
        const next = applyChessMove(current, move);
        if (next === current) return current;
        if (next.status !== "playing") setStats((currentStats) => updateStatsForResult(currentStats, next));
        return next;
      });
    }).catch((error: unknown) => {
      if (cancelled) return;
      engine.terminate();
      stockfish.current = null;
      setEngineError(error instanceof Error ? error.message : "Stockfish could not start.");
    });
    return () => { cancelled = true; };
  }, [computerThinking, game, retry, strength]);

  useEffect(() => () => stockfish.current?.terminate(), []);

  const legalMoves = useMemo(() => generateLegalChessMoves(game), [game]);
  const legalTargets = useMemo(() => new Set(legalMoves.filter((move) => move.from === selected).map((move) => move.to)), [legalMoves, selected]);
  const visualSquares = useMemo(() => {
    const squares = Array.from({ length: 64 }, (_, square) => square);
    return game.humanColor === "white" ? squares : squares.reverse();
  }, [game.humanColor]);

  const newGame = (humanColor: ChessColor = game.humanColor) => {
    setGame(createChessGame(humanColor));
    setSelected(null);
    setEngineError("");
    setStats((current) => ({ ...current, games: current.games + 1 }));
  };

  const chooseSquare = (square: number) => {
    if (computerThinking || game.status !== "playing") return;
    const piece = game.board[square];
    if (selected !== null && legalTargets.has(square)) {
      const next = applyChessMove(game, { from: selected, to: square });
      setGame(next);
      if (next.status !== "playing") setStats((current) => updateStatsForResult(current, next));
      setSelected(null);
      return;
    }
    setSelected(piece?.color === game.humanColor && game.turn === game.humanColor ? square : null);
  };

  const onBoardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-chess-square]"));
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 63 : Math.max(0, Math.min(63, current + (event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" ? -8 : 8)));
    buttons[next]?.focus();
  };

  if (!hydrated) return <div className="game-loading" role="status">Restoring your saved My AI Chess game...</div>;

  const inCheck = game.status === "playing" && isChessKingInCheck(game, game.turn);
  const status = game.status === "checkmate"
    ? game.winner === game.humanColor ? "Checkmate. You beat My AI Chess!" : "Checkmate. My AI Chess wins this game."
    : game.status === "stalemate" ? "Stalemate. This game is a draw."
      : computerThinking ? `Stockfish is thinking as ${game.turn}.`
        : `${inCheck ? "Check. " : ""}Your move as ${game.humanColor}.`;

  return (
    <section className={`chess-app${compact ? " is-compact" : ""}`} aria-label="My AI Chess game">
      <header className="game-toolbar chess-toolbar">
        <div className="chess-toolbar__controls">
          <label>Play as
            <select value={game.humanColor} disabled={computerThinking} onChange={(event) => newGame(event.target.value as ChessColor)}>
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </label>
          <label>AI model
            <select value={strength} disabled={computerThinking} onChange={(event) => setStrength(event.target.value as StockfishStrength)}>
              <option value="quick">Quick</option>
              <option value="standard">Standard</option>
            </select>
          </label>
        </div>
        <div className="chess-toolbar__buttons">
          <button className="retro-button" type="button" onClick={() => newGame()}>New game</button>
          <button className="retro-button" type="button" disabled={computerThinking || !game.history.length} onClick={() => { setGame((current) => undoChessTurn(current)); setSelected(null); }}>Undo turn</button>
        </div>
      </header>

      <div className="chess-model-banner"><span aria-hidden="true">CPU</span><div><strong>Stockfish 18 Lite</strong><small>{strength === "standard" ? "Standard local WebAssembly model" : "Quick local WebAssembly model"}</small></div></div>

      <div className="chess-board" role="grid" aria-label={`Chess board, you are playing ${game.humanColor}`} onKeyDown={onBoardKeyDown}>
        {visualSquares.map((square, visualIndex) => {
          const piece = game.board[square];
          const row = Math.floor(square / 8);
          const column = square % 8;
          const target = legalTargets.has(square);
          const last = game.lastMove?.from === square || game.lastMove?.to === square;
          return (
            <button
              data-chess-square={square}
              type="button"
              role="gridcell"
              key={square}
              className={`chess-square ${(row + column) % 2 ? "is-dark" : "is-light"}${selected === square ? " is-selected" : ""}${target ? " is-target" : ""}${last ? " is-last" : ""}`}
              aria-label={`${pieceLabel(piece, square)}${target ? ", legal destination" : ""}`}
              aria-selected={selected === square}
              tabIndex={visualIndex === 0 ? 0 : -1}
              onClick={() => chooseSquare(square)}
            >
              {piece && <span className={`chess-piece is-${piece.color}`} aria-hidden="true">{glyphs[piece.color][piece.type]}</span>}
              {(column === (game.humanColor === "white" ? 0 : 7)) && <small className="chess-rank" aria-hidden="true">{8 - row}</small>}
              {(row === (game.humanColor === "white" ? 7 : 0)) && <small className="chess-file" aria-hidden="true">{String.fromCharCode(97 + column)}</small>}
            </button>
          );
        })}
      </div>

      <p className={`game-status${engineError ? " is-error" : ""}`} role="status" aria-live="polite">{engineError ? <>Stockfish error: {engineError} <button className="retro-button" type="button" onClick={() => { setEngineError(""); setRetry((value) => value + 1); }}>Retry</button></> : status}</p>
      {storageWarning && <p className="game-status is-error" role="status">{storageWarning}</p>}
      <footer className="game-local-stats"><span>Games: {stats.games}</span><span>Wins: {stats.wins}</span><span>Losses: {stats.losses}</span><span>Draws: {stats.draws}</span></footer>
      <p className="game-help">Select a piece, then a marked square. Arrow keys move across the board and Enter selects. Castling and en passant work normally; pawns promote to a queen.</p>
      <p className="stockfish-credit">Engine: <a href="https://github.com/nmrugg/stockfish.js" rel="noreferrer" target="_blank">Stockfish.js 18</a>, distributed under GPLv3.</p>
    </section>
  );
}
