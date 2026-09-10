import { describe, expect, it } from "vitest";
import {
  autoMoveSolitaireCard,
  canMoveSolitaireCards,
  createSolitaireGame,
  drawSolitaireStock,
  moveSolitaireCards,
  type SolitaireCard,
  undoSolitaireMove,
} from "@/lib/games/solitaire";

const card = (suit: SolitaireCard["suit"], rank: number): SolitaireCard => ({ id: `${suit}-${rank}`, suit, rank, faceUp: true });

describe("Klondike Solitaire", () => {
  it("deals seven tableau piles and 24 stock cards", () => {
    const game = createSolitaireGame(() => 0.4);
    expect(game.tableau.map((pile) => pile.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(game.stock).toHaveLength(24);
    expect(game.tableau.every((pile) => pile.at(-1)?.faceUp)).toBe(true);
  });

  it("draws one card and recycles the waste", () => {
    let game = createSolitaireGame(() => 0.2);
    game = drawSolitaireStock(game);
    expect(game.stock).toHaveLength(23);
    expect(game.waste).toHaveLength(1);
    const recycleState = { ...game, stock: [], waste: [card("clubs", 1), card("hearts", 2)] };
    const recycled = drawSolitaireStock(recycleState);
    expect(recycled.stock).toHaveLength(2);
    expect(recycled.stock.every((item) => !item.faceUp)).toBe(true);
  });

  it("validates alternating descending tableau moves", () => {
    const game = createSolitaireGame(() => 0.3);
    game.tableau = [[card("spades", 8)], [card("hearts", 7)], [], [], [], [], []];
    const selection = { source: "tableau" as const, pile: 1, index: 0 };
    expect(canMoveSolitaireCards(game, selection, { destination: "tableau", pile: 0 })).toBe(true);
    expect(canMoveSolitaireCards(game, selection, { destination: "tableau", pile: 2 })).toBe(false);
  });

  it("moves aces to foundations and supports undo", () => {
    const game = createSolitaireGame(() => 0.1);
    game.waste = [card("hearts", 1)];
    const moved = autoMoveSolitaireCard(game, { source: "waste" });
    expect(moved.foundations.hearts).toHaveLength(1);
    expect(moved.moves).toBe(1);
    const undone = undoSolitaireMove(moved);
    expect(undone.waste.at(-1)?.rank).toBe(1);
    expect(undone.foundations.hearts).toHaveLength(0);
  });

  it("rejects illegal foundation moves", () => {
    const game = createSolitaireGame(() => 0.1);
    game.waste = [card("clubs", 2)];
    expect(moveSolitaireCards(game, { source: "waste" }, { destination: "foundation", suit: "clubs" })).toBe(game);
  });

  it("detects a win after the final legal foundation move", () => {
    const game = createSolitaireGame(() => 0.1);
    game.stock = [];
    game.tableau = [[], [], [], [], [], [], []];
    game.foundations = {
      clubs: Array.from({ length: 13 }, (_, index) => card("clubs", index + 1)),
      diamonds: Array.from({ length: 13 }, (_, index) => card("diamonds", index + 1)),
      hearts: Array.from({ length: 13 }, (_, index) => card("hearts", index + 1)),
      spades: Array.from({ length: 12 }, (_, index) => card("spades", index + 1)),
    };
    game.waste = [card("spades", 13)];
    const won = moveSolitaireCards(game, { source: "waste" }, { destination: "foundation", suit: "spades" });
    expect(won.status).toBe("won");
  });
});
