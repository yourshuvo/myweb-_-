import { describe, expect, it } from "vitest";
import { createMinesweeperGame, placeMines, revealMinesweeperCell, toggleMinesweeperFlag } from "@/lib/games/minesweeper";

describe("Minesweeper", () => {
  it("creates the supported board sizes", () => {
    expect(createMinesweeperGame("beginner").cells).toHaveLength(81);
    expect(createMinesweeperGame("intermediate").cells).toHaveLength(256);
    expect(createMinesweeperGame("intermediate").mineCount).toBe(40);
  });

  it("keeps the first revealed cell safe", () => {
    const game = createMinesweeperGame();
    const started = revealMinesweeperCell(game, 4, 4, () => 0.25, 1_000);
    expect(started.cells[40].mine).toBe(false);
    expect(started.cells.filter((cell) => cell.mine)).toHaveLength(10);
    expect(started.status).not.toBe("lost");
  });

  it("calculates adjacent mine counts", () => {
    const game = createMinesweeperGame();
    const cells = placeMines(game, 0, () => 0);
    for (const [index, cell] of cells.entries()) {
      if (cell.mine) continue;
      const row = Math.floor(index / game.columns);
      const column = index % game.columns;
      let count = 0;
      for (let r = Math.max(0, row - 1); r <= Math.min(game.rows - 1, row + 1); r += 1) {
        for (let c = Math.max(0, column - 1); c <= Math.min(game.columns - 1, column + 1); c += 1) {
          if (cells[r * game.columns + c].mine) count += 1;
        }
      }
      expect(cell.adjacent).toBe(count);
    }
  });

  it("supports flags without revealing the cell", () => {
    const game = toggleMinesweeperFlag(createMinesweeperGame(), 0, 0);
    expect(game.cells[0].flagged).toBe(true);
    expect(revealMinesweeperCell(game, 0, 0)).toBe(game);
  });
});
