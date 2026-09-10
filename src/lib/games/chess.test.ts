import { describe, expect, it } from "vitest";
import {
  applyChessMove,
  chessSquare,
  compactChessState,
  createChessGame,
  generateLegalChessMoves,
  isChessKingInCheck,
  undoChessTurn,
} from "@/lib/games/chess";

function play(state: ReturnType<typeof createChessGame>, from: string, to: string) {
  return applyChessMove(state, { from: chessSquare(from), to: chessSquare(to) });
}

describe("local chess engine", () => {
  it("starts with the standard twenty legal moves", () => {
    expect(generateLegalChessMoves(createChessGame())).toHaveLength(20);
  });

  it("supports en passant and removes the captured pawn", () => {
    let game = createChessGame();
    game = play(game, "e2", "e4");
    game = play(game, "a7", "a6");
    game = play(game, "e4", "e5");
    game = play(game, "d7", "d5");
    game = play(game, "e5", "d6");
    expect(game.board[chessSquare("d5")]).toBeNull();
    expect(game.board[chessSquare("d6")]).toMatchObject({ color: "white", type: "pawn" });
  });

  it("detects Fool's Mate as checkmate", () => {
    let game = createChessGame();
    game = play(game, "f2", "f3");
    game = play(game, "e7", "e5");
    game = play(game, "g2", "g4");
    game = play(game, "d8", "h4");
    expect(game.status).toBe("checkmate");
    expect(game.winner).toBe("black");
    expect(isChessKingInCheck(game, "white")).toBe(true);
  });

  it("can undo a complete human and engine turn", () => {
    const afterHuman = play(createChessGame(), "e2", "e4");
    const afterEngine = play(afterHuman, "e7", "e5");
    const undone = undoChessTurn(afterEngine);
    expect(undone.moves).toBe(0);
    expect(undone.turn).toBe("white");
  });

  it("stores flat snapshots instead of recursively copying history", () => {
    let game = createChessGame();
    for (const [from, to] of [["e2", "e4"], ["e7", "e5"], ["g1", "f3"], ["b8", "c6"]]) {
      game = play(game, from, to);
    }
    const compact = compactChessState(game);
    expect(compact.history).toHaveLength(4);
    expect(compact.history.every((snapshot) => !("history" in snapshot))).toBe(true);
    expect(JSON.stringify(compact).length).toBeLessThan(20_000);
  });
});
