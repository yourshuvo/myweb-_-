export type ChessColor = "white" | "black";
export type ChessPieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";

export type ChessPiece = {
  color: ChessColor;
  type: ChessPieceType;
};

export type ChessMove = {
  from: number;
  to: number;
  promotion?: "queen";
  castle?: "king" | "queen";
  enPassant?: boolean;
};

export type ChessCastlingRights = {
  whiteKing: boolean;
  whiteQueen: boolean;
  blackKing: boolean;
  blackQueen: boolean;
};

export type ChessSnapshot = {
  board: Array<ChessPiece | null>;
  turn: ChessColor;
  humanColor: ChessColor;
  status: "playing" | "checkmate" | "stalemate";
  winner: ChessColor | null;
  castling: ChessCastlingRights;
  enPassant: number | null;
  moves: number;
  lastMove: ChessMove | null;
};

export type ChessState = ChessSnapshot & {
  version: 1;
  history: ChessSnapshot[];
};

const backRank: ChessPieceType[] = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];

const rowOf = (square: number) => Math.floor(square / 8);
const columnOf = (square: number) => square % 8;
const inside = (row: number, column: number) => row >= 0 && row < 8 && column >= 0 && column < 8;
const indexOf = (row: number, column: number) => row * 8 + column;
export const oppositeChessColor = (color: ChessColor): ChessColor => color === "white" ? "black" : "white";

function cloneBoard(board: Array<ChessPiece | null>) {
  return board.map((piece) => piece ? { ...piece } : null);
}

function cloneSnapshot(state: ChessSnapshot): ChessSnapshot {
  return {
    board: cloneBoard(state.board),
    turn: state.turn,
    humanColor: state.humanColor,
    status: state.status,
    winner: state.winner,
    castling: { ...state.castling },
    enPassant: state.enPassant,
    moves: state.moves,
    lastMove: state.lastMove ? { ...state.lastMove } : null,
  };
}

export function compactChessState(state: ChessState): ChessState {
  return {
    version: 1,
    ...cloneSnapshot(state),
    history: state.history.slice(-80).map(cloneSnapshot),
  };
}

export function createChessGame(humanColor: ChessColor = "white"): ChessState {
  const board: Array<ChessPiece | null> = Array.from({ length: 64 }, () => null);
  backRank.forEach((type, column) => {
    board[column] = { color: "black", type };
    board[8 + column] = { color: "black", type: "pawn" };
    board[48 + column] = { color: "white", type: "pawn" };
    board[56 + column] = { color: "white", type };
  });
  return {
    version: 1,
    board,
    turn: "white",
    humanColor,
    status: "playing",
    winner: null,
    castling: { whiteKing: true, whiteQueen: true, blackKing: true, blackQueen: true },
    enPassant: null,
    moves: 0,
    lastMove: null,
    history: [],
  };
}

export function chessSquare(name: string) {
  if (!/^[a-h][1-8]$/.test(name)) return -1;
  return (8 - Number(name[1])) * 8 + name.charCodeAt(0) - 97;
}

export function chessSquareName(square: number) {
  return `${String.fromCharCode(97 + columnOf(square))}${8 - rowOf(square)}`;
}

function isSquareAttacked(board: Array<ChessPiece | null>, target: number, byColor: ChessColor) {
  const targetRow = rowOf(target);
  const targetColumn = columnOf(target);
  const pawnDirection = byColor === "white" ? -1 : 1;

  for (let square = 0; square < 64; square += 1) {
    const piece = board[square];
    if (!piece || piece.color !== byColor) continue;
    const row = rowOf(square);
    const column = columnOf(square);
    if (piece.type === "pawn" && row + pawnDirection === targetRow && Math.abs(column - targetColumn) === 1) return true;
    if (piece.type === "knight" && [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].some(([dr, dc]) => row + dr === targetRow && column + dc === targetColumn)) return true;
    if (piece.type === "king" && Math.max(Math.abs(row - targetRow), Math.abs(column - targetColumn)) === 1) return true;

    const directions = piece.type === "bishop" ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : piece.type === "rook" ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
        : piece.type === "queen" ? [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]] : [];
    for (const [dr, dc] of directions) {
      let nextRow = row + dr;
      let nextColumn = column + dc;
      while (inside(nextRow, nextColumn)) {
        const next = indexOf(nextRow, nextColumn);
        if (next === target) return true;
        if (board[next]) break;
        nextRow += dr;
        nextColumn += dc;
      }
    }
  }
  return false;
}

export function isChessKingInCheck(state: Pick<ChessState, "board">, color: ChessColor) {
  const king = state.board.findIndex((piece) => piece?.color === color && piece.type === "king");
  return king >= 0 && isSquareAttacked(state.board, king, oppositeChessColor(color));
}

function addSlidingMoves(state: ChessState, from: number, color: ChessColor, directions: number[][], moves: ChessMove[]) {
  const row = rowOf(from);
  const column = columnOf(from);
  for (const [dr, dc] of directions) {
    let nextRow = row + dr;
    let nextColumn = column + dc;
    while (inside(nextRow, nextColumn)) {
      const to = indexOf(nextRow, nextColumn);
      const target = state.board[to];
      if (!target) moves.push({ from, to });
      else {
        if (target.color !== color) moves.push({ from, to });
        break;
      }
      nextRow += dr;
      nextColumn += dc;
    }
  }
}

function pseudoMoves(state: ChessState, color: ChessColor) {
  const moves: ChessMove[] = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = state.board[from];
    if (!piece || piece.color !== color) continue;
    const row = rowOf(from);
    const column = columnOf(from);

    if (piece.type === "pawn") {
      const direction = color === "white" ? -1 : 1;
      const startRow = color === "white" ? 6 : 1;
      const promotionRow = color === "white" ? 0 : 7;
      const nextRow = row + direction;
      if (inside(nextRow, column) && !state.board[indexOf(nextRow, column)]) {
        const to = indexOf(nextRow, column);
        moves.push({ from, to, ...(nextRow === promotionRow ? { promotion: "queen" as const } : {}) });
        const doubleRow = row + direction * 2;
        if (row === startRow && !state.board[indexOf(doubleRow, column)]) moves.push({ from, to: indexOf(doubleRow, column) });
      }
      for (const dc of [-1, 1]) {
        if (!inside(nextRow, column + dc)) continue;
        const to = indexOf(nextRow, column + dc);
        const target = state.board[to];
        if (target && target.color !== color) moves.push({ from, to, ...(nextRow === promotionRow ? { promotion: "queen" as const } : {}) });
        else if (to === state.enPassant) moves.push({ from, to, enPassant: true });
      }
    }

    if (piece.type === "knight") {
      for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
        if (!inside(row + dr, column + dc)) continue;
        const to = indexOf(row + dr, column + dc);
        if (state.board[to]?.color !== color) moves.push({ from, to });
      }
    }
    if (piece.type === "bishop") addSlidingMoves(state, from, color, [[-1, -1], [-1, 1], [1, -1], [1, 1]], moves);
    if (piece.type === "rook") addSlidingMoves(state, from, color, [[-1, 0], [1, 0], [0, -1], [0, 1]], moves);
    if (piece.type === "queen") addSlidingMoves(state, from, color, [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]], moves);

    if (piece.type === "king") {
      for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
        if ((!dr && !dc) || !inside(row + dr, column + dc)) continue;
        const to = indexOf(row + dr, column + dc);
        if (state.board[to]?.color !== color) moves.push({ from, to });
      }
      const homeRow = color === "white" ? 7 : 0;
      const opponent = oppositeChessColor(color);
      const kingSide = color === "white" ? state.castling.whiteKing : state.castling.blackKing;
      const queenSide = color === "white" ? state.castling.whiteQueen : state.castling.blackQueen;
      if (row === homeRow && column === 4 && !isSquareAttacked(state.board, from, opponent)) {
        const rookKing = state.board[indexOf(homeRow, 7)];
        if (kingSide && rookKing?.type === "rook" && rookKing.color === color && !state.board[indexOf(homeRow, 5)] && !state.board[indexOf(homeRow, 6)] && !isSquareAttacked(state.board, indexOf(homeRow, 5), opponent) && !isSquareAttacked(state.board, indexOf(homeRow, 6), opponent)) moves.push({ from, to: indexOf(homeRow, 6), castle: "king" });
        const rookQueen = state.board[indexOf(homeRow, 0)];
        if (queenSide && rookQueen?.type === "rook" && rookQueen.color === color && !state.board[indexOf(homeRow, 1)] && !state.board[indexOf(homeRow, 2)] && !state.board[indexOf(homeRow, 3)] && !isSquareAttacked(state.board, indexOf(homeRow, 3), opponent) && !isSquareAttacked(state.board, indexOf(homeRow, 2), opponent)) moves.push({ from, to: indexOf(homeRow, 2), castle: "queen" });
      }
    }
  }
  return moves;
}

function boardAfterMove(board: Array<ChessPiece | null>, move: ChessMove) {
  const next = cloneBoard(board);
  const piece = next[move.from];
  if (!piece) return next;
  next[move.from] = null;
  if (move.enPassant) next[move.to + (piece.color === "white" ? 8 : -8)] = null;
  next[move.to] = move.promotion ? { color: piece.color, type: move.promotion } : piece;
  if (move.castle) {
    const row = rowOf(move.from);
    const rookFrom = indexOf(row, move.castle === "king" ? 7 : 0);
    const rookTo = indexOf(row, move.castle === "king" ? 5 : 3);
    next[rookTo] = next[rookFrom];
    next[rookFrom] = null;
  }
  return next;
}

export function generateLegalChessMoves(state: ChessState, color: ChessColor = state.turn) {
  if (state.status !== "playing") return [];
  return pseudoMoves(state, color).filter((move) => !isChessKingInCheck({ board: boardAfterMove(state.board, move) }, color));
}

function nextCastlingRights(state: ChessState, move: ChessMove, piece: ChessPiece) {
  const rights = { ...state.castling };
  if (piece.type === "king") {
    if (piece.color === "white") rights.whiteKing = rights.whiteQueen = false;
    else rights.blackKing = rights.blackQueen = false;
  }
  const disableRook = (square: number) => {
    if (square === 63) rights.whiteKing = false;
    if (square === 56) rights.whiteQueen = false;
    if (square === 7) rights.blackKing = false;
    if (square === 0) rights.blackQueen = false;
  };
  if (piece.type === "rook") disableRook(move.from);
  if (state.board[move.to]?.type === "rook") disableRook(move.to);
  return rights;
}

function advanceChessState(state: ChessState, move: ChessMove, keepHistory: boolean) {
  const piece = state.board[move.from]!;
  const turn = oppositeChessColor(state.turn);
  const next: ChessState = {
    version: 1,
    board: boardAfterMove(state.board, move),
    turn,
    humanColor: state.humanColor,
    status: "playing",
    winner: null,
    castling: nextCastlingRights(state, move, piece),
    enPassant: piece.type === "pawn" && Math.abs(move.to - move.from) === 16 ? (move.from + move.to) / 2 : null,
    moves: state.moves + 1,
    lastMove: { ...move },
    history: keepHistory ? [...state.history.slice(-79).map(cloneSnapshot), cloneSnapshot(state)] : [],
  };
  const replies = generateLegalChessMoves(next);
  if (!replies.length) {
    if (isChessKingInCheck(next, turn)) {
      next.status = "checkmate";
      next.winner = state.turn;
    } else next.status = "stalemate";
  }
  return next;
}

export function applyChessMove(state: ChessState, requested: Pick<ChessMove, "from" | "to">) {
  const move = generateLegalChessMoves(state).find((candidate) => candidate.from === requested.from && candidate.to === requested.to);
  return move ? advanceChessState(state, move, true) : state;
}

export function undoChessTurn(state: ChessState) {
  if (!state.history.length) return state;
  const history = state.history.slice();
  let previous = history.pop()!;
  if (previous.turn !== state.humanColor && history.length) previous = history.pop()!;
  return { version: 1 as const, ...cloneSnapshot(previous), history };
}

export function isChessState(value: unknown): value is ChessState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<ChessState>;
  return state.version === 1 && Array.isArray(state.board) && state.board.length === 64 &&
    state.board.every((piece) => piece === null || (typeof piece === "object" && (piece as ChessPiece).color && (piece as ChessPiece).type)) &&
    (state.turn === "white" || state.turn === "black") && (state.humanColor === "white" || state.humanColor === "black") &&
    (state.status === "playing" || state.status === "checkmate" || state.status === "stalemate") &&
    typeof state.moves === "number" && Array.isArray(state.history) && Boolean(state.castling);
}
