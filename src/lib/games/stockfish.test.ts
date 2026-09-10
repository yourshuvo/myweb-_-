import { describe, expect, it } from "vitest";
import { createChessGame } from "@/lib/games/chess";
import { chessStateToFen, parseStockfishMove } from "@/lib/games/stockfish";

describe("Stockfish adapter", () => {
  it("serializes the initial board as a valid FEN position", () => {
    expect(chessStateToFen(createChessGame())).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  });

  it("parses normal and promotion UCI moves", () => {
    expect(parseStockfishMove("e7e5")).toEqual({ from: 12, to: 28 });
    expect(parseStockfishMove("a2a1q")).toEqual({ from: 48, to: 56 });
    expect(parseStockfishMove("bestmove e7e5")).toBeNull();
  });
});
