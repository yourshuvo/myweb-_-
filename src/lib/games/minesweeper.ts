export type MinesweeperDifficulty = "beginner" | "intermediate";
export type MinesweeperStatus = "ready" | "playing" | "won" | "lost";

export type MinesweeperCell = {
  mine: boolean;
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
};

export type MinesweeperState = {
  version: 1;
  difficulty: MinesweeperDifficulty;
  rows: number;
  columns: number;
  mineCount: number;
  cells: MinesweeperCell[];
  status: MinesweeperStatus;
  elapsedSeconds: number;
  startedAt: number | null;
};

export const minesweeperDifficulties = {
  beginner: { rows: 9, columns: 9, mines: 10 },
  intermediate: { rows: 16, columns: 16, mines: 40 },
} as const;

function indexFor(state: Pick<MinesweeperState, "columns">, row: number, column: number) {
  return row * state.columns + column;
}

function neighbors(state: Pick<MinesweeperState, "rows" | "columns">, index: number) {
  const row = Math.floor(index / state.columns);
  const column = index % state.columns;
  const result: number[] = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (nextRow >= 0 && nextRow < state.rows && nextColumn >= 0 && nextColumn < state.columns) {
        result.push(nextRow * state.columns + nextColumn);
      }
    }
  }
  return result;
}

export function createMinesweeperGame(difficulty: MinesweeperDifficulty = "beginner"): MinesweeperState {
  const config = minesweeperDifficulties[difficulty];
  return {
    version: 1,
    difficulty,
    rows: config.rows,
    columns: config.columns,
    mineCount: config.mines,
    cells: Array.from({ length: config.rows * config.columns }, () => ({ mine: false, adjacent: 0, revealed: false, flagged: false })),
    status: "ready",
    elapsedSeconds: 0,
    startedAt: null,
  };
}

export function placeMines(state: MinesweeperState, safeIndex: number, random: () => number = Math.random) {
  const choices = state.cells.map((_, index) => index).filter((index) => index !== safeIndex);
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [choices[index], choices[swapIndex]] = [choices[swapIndex], choices[index]];
  }
  const mines = new Set(choices.slice(0, state.mineCount));
  return state.cells.map((cell, index) => ({
    ...cell,
    mine: mines.has(index),
    adjacent: neighbors(state, index).filter((neighbor) => mines.has(neighbor)).length,
  }));
}

export function revealMinesweeperCell(
  state: MinesweeperState,
  row: number,
  column: number,
  random: () => number = Math.random,
  now = Date.now(),
) {
  if (row < 0 || row >= state.rows || column < 0 || column >= state.columns || state.status === "won" || state.status === "lost") return state;
  const selectedIndex = indexFor(state, row, column);
  if (state.cells[selectedIndex].flagged || state.cells[selectedIndex].revealed) return state;

  const cells = (state.status === "ready" ? placeMines(state, selectedIndex, random) : state.cells).map((cell) => ({ ...cell }));
  const startedAt = state.startedAt ?? now;
  if (cells[selectedIndex].mine) {
    cells.forEach((cell) => { if (cell.mine) cell.revealed = true; });
    return { ...state, cells, status: "lost" as const, startedAt, elapsedSeconds: Math.min(999, Math.floor((now - startedAt) / 1000)) };
  }

  const queue = [selectedIndex];
  const visited = new Set<number>();
  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const cell = cells[current];
    if (cell.mine || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent === 0) {
      neighbors(state, current).forEach((neighbor) => {
        if (!visited.has(neighbor) && !cells[neighbor].mine) queue.push(neighbor);
      });
    }
  }

  const safeCellsRevealed = cells.filter((cell) => cell.revealed && !cell.mine).length;
  const won = safeCellsRevealed === cells.length - state.mineCount;
  return {
    ...state,
    cells,
    status: won ? "won" as const : "playing" as const,
    startedAt,
    elapsedSeconds: won ? Math.min(999, Math.floor((now - startedAt) / 1000)) : state.elapsedSeconds,
  };
}

export function toggleMinesweeperFlag(state: MinesweeperState, row: number, column: number) {
  if (row < 0 || row >= state.rows || column < 0 || column >= state.columns || state.status === "won" || state.status === "lost") return state;
  const index = indexFor(state, row, column);
  if (state.cells[index].revealed) return state;
  const flaggedCount = state.cells.filter((cell) => cell.flagged).length;
  if (!state.cells[index].flagged && flaggedCount >= state.mineCount) return state;
  const cells = state.cells.map((cell, cellIndex) => cellIndex === index ? { ...cell, flagged: !cell.flagged } : cell);
  return { ...state, cells };
}

export function updateMinesweeperElapsed(state: MinesweeperState, now = Date.now()) {
  if (state.status !== "playing" || !state.startedAt) return state;
  return { ...state, elapsedSeconds: Math.min(999, Math.floor((now - state.startedAt) / 1000)) };
}

export function isMinesweeperState(value: unknown): value is MinesweeperState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<MinesweeperState>;
  return state.version === 1 && (state.difficulty === "beginner" || state.difficulty === "intermediate") &&
    typeof state.rows === "number" && typeof state.columns === "number" && Array.isArray(state.cells) &&
    state.cells.length === state.rows * state.columns && ["ready", "playing", "won", "lost"].includes(String(state.status));
}

export function minesRemaining(state: MinesweeperState) {
  return Math.max(0, state.mineCount - state.cells.filter((cell) => cell.flagged).length);
}
