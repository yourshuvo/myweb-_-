import { chessSquare, chessSquareName, type ChessPieceType, type ChessState } from "@/lib/games/chess";

const workerUrl = "/vendor/stockfish/stockfish.js";
const fenPiece: Record<ChessPieceType, string> = { pawn: "p", knight: "n", bishop: "b", rook: "r", queen: "q", king: "k" };

export type StockfishStrength = "quick" | "standard";

export function chessStateToFen(state: ChessState) {
  const board = Array.from({ length: 8 }, (_, row) => {
    let empty = 0;
    let result = "";
    for (let column = 0; column < 8; column += 1) {
      const piece = state.board[row * 8 + column];
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty) result += String(empty);
      empty = 0;
      const symbol = fenPiece[piece.type];
      result += piece.color === "white" ? symbol.toUpperCase() : symbol;
    }
    return result + (empty ? String(empty) : "");
  }).join("/");
  const castling = [
    state.castling.whiteKing ? "K" : "",
    state.castling.whiteQueen ? "Q" : "",
    state.castling.blackKing ? "k" : "",
    state.castling.blackQueen ? "q" : "",
  ].join("") || "-";
  return `${board} ${state.turn === "white" ? "w" : "b"} ${castling} ${state.enPassant === null ? "-" : chessSquareName(state.enPassant)} 0 ${Math.floor(state.moves / 2) + 1}`;
}

export function parseStockfishMove(move: string) {
  const match = /^([a-h][1-8])([a-h][1-8])[qrbn]?$/.exec(move.trim());
  if (!match) return null;
  return { from: chessSquare(match[1]), to: chessSquare(match[2]) };
}

export class StockfishBrowserEngine {
  private worker: Worker;
  private ready: Promise<void>;
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  private pending: { resolve: (move: string) => void; reject: (error: Error) => void; timeout: number } | null = null;

  constructor() {
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker = new Worker(workerUrl);
    this.worker.addEventListener("message", (event: MessageEvent<unknown>) => this.onMessage(event.data));
    this.worker.addEventListener("error", (event) => this.fail(new Error(event.message || "Stockfish worker failed to load.")));
    this.worker.postMessage("uci");
  }

  private onMessage(message: unknown) {
    if (typeof message !== "string") return;
    if (message === "uciok") {
      this.worker.postMessage("isready");
      return;
    }
    if (message === "readyok") {
      this.resolveReady();
      return;
    }
    const bestMove = /^bestmove\s+(\S+)/.exec(message)?.[1];
    if (!bestMove || !this.pending) return;
    window.clearTimeout(this.pending.timeout);
    const { resolve } = this.pending;
    this.pending = null;
    if (bestMove === "(none)") this.fail(new Error("Stockfish did not return a legal move."));
    else resolve(bestMove);
  }

  private fail(error: Error) {
    this.rejectReady(error);
    if (this.pending) {
      window.clearTimeout(this.pending.timeout);
      this.pending.reject(error);
      this.pending = null;
    }
  }

  async bestMove(fen: string, strength: StockfishStrength) {
    await this.ready;
    if (this.pending) throw new Error("Stockfish is already thinking.");
    const settings = strength === "standard" ? { skill: 8, time: 550 } : { skill: 2, time: 180 };
    this.worker.postMessage(`setoption name Skill Level value ${settings.skill}`);
    this.worker.postMessage(`position fen ${fen}`);
    return new Promise<string>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending = null;
        reject(new Error("Stockfish took too long to answer."));
      }, 12_000);
      this.pending = { resolve, reject, timeout };
      this.worker.postMessage(`go movetime ${settings.time}`);
    });
  }

  terminate() {
    if (this.pending) {
      window.clearTimeout(this.pending.timeout);
      this.pending.reject(new Error("Stockfish was stopped."));
    }
    this.pending = null;
    this.worker.postMessage("quit");
    this.worker.terminate();
  }
}
