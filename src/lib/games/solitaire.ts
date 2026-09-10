export const solitaireSuits = ["clubs", "diamonds", "hearts", "spades"] as const;
export type SolitaireSuit = (typeof solitaireSuits)[number];
export type SolitaireColor = "red" | "black";

export type SolitaireCard = {
  id: string;
  suit: SolitaireSuit;
  rank: number;
  faceUp: boolean;
};

export type SolitaireSnapshot = {
  stock: SolitaireCard[];
  waste: SolitaireCard[];
  tableau: SolitaireCard[][];
  foundations: Record<SolitaireSuit, SolitaireCard[]>;
  status: "playing" | "won";
  moves: number;
};

export type SolitaireState = SolitaireSnapshot & {
  version: 1;
  history: SolitaireSnapshot[];
};

export type SolitaireSelection =
  | { source: "waste" }
  | { source: "tableau"; pile: number; index: number }
  | { source: "foundation"; suit: SolitaireSuit };

export type SolitaireDestination =
  | { destination: "tableau"; pile: number }
  | { destination: "foundation"; suit: SolitaireSuit };

export function solitaireCardColor(card: Pick<SolitaireCard, "suit">): SolitaireColor {
  return card.suit === "diamonds" || card.suit === "hearts" ? "red" : "black";
}

export function createSolitaireDeck() {
  return solitaireSuits.flatMap((suit) => Array.from({ length: 13 }, (_, index) => ({
    id: `${suit}-${index + 1}`,
    suit,
    rank: index + 1,
    faceUp: false,
  })));
}

export function shuffleSolitaireDeck(deck: SolitaireCard[], random: () => number = Math.random) {
  const shuffled = deck.map((card) => ({ ...card }));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function createSolitaireGame(random: () => number = Math.random): SolitaireState {
  const deck = shuffleSolitaireDeck(createSolitaireDeck(), random);
  let cursor = 0;
  const tableau = Array.from({ length: 7 }, (_, pile) => {
    const cards = deck.slice(cursor, cursor + pile + 1).map((card, index) => ({ ...card, faceUp: index === pile }));
    cursor += pile + 1;
    return cards;
  });
  return {
    version: 1,
    stock: deck.slice(cursor).map((card) => ({ ...card, faceUp: false })),
    waste: [],
    tableau,
    foundations: { clubs: [], diamonds: [], hearts: [], spades: [] },
    status: "playing",
    moves: 0,
    history: [],
  };
}

function snapshot(state: SolitaireState): SolitaireSnapshot {
  return {
    stock: state.stock.map((card) => ({ ...card })),
    waste: state.waste.map((card) => ({ ...card })),
    tableau: state.tableau.map((pile) => pile.map((card) => ({ ...card }))),
    foundations: Object.fromEntries(solitaireSuits.map((suit) => [suit, state.foundations[suit].map((card) => ({ ...card }))])) as Record<SolitaireSuit, SolitaireCard[]>,
    status: state.status,
    moves: state.moves,
  };
}

function withHistory(state: SolitaireState, next: Omit<SolitaireSnapshot, "status" | "moves">) {
  const status = solitaireSuits.every((suit) => next.foundations[suit].length === 13) ? "won" as const : "playing" as const;
  return {
    version: 1 as const,
    ...next,
    status,
    moves: state.moves + 1,
    history: [...state.history.slice(-99), snapshot(state)],
  };
}

export function drawSolitaireStock(state: SolitaireState) {
  if (state.status === "won") return state;
  if (state.stock.length) {
    const stock = state.stock.map((card) => ({ ...card }));
    const card = stock.pop()!;
    return withHistory(state, {
      stock,
      waste: [...state.waste, { ...card, faceUp: true }],
      tableau: state.tableau.map((pile) => pile.map((item) => ({ ...item }))),
      foundations: Object.fromEntries(solitaireSuits.map((suit) => [suit, state.foundations[suit].map((item) => ({ ...item }))])) as Record<SolitaireSuit, SolitaireCard[]>,
    });
  }
  if (!state.waste.length) return state;
  return withHistory(state, {
    stock: [...state.waste].reverse().map((card) => ({ ...card, faceUp: false })),
    waste: [],
    tableau: state.tableau.map((pile) => pile.map((item) => ({ ...item }))),
    foundations: Object.fromEntries(solitaireSuits.map((suit) => [suit, state.foundations[suit].map((item) => ({ ...item }))])) as Record<SolitaireSuit, SolitaireCard[]>,
  });
}

export function isValidTableauStack(cards: SolitaireCard[]) {
  if (!cards.length || cards.some((card) => !card.faceUp)) return false;
  return cards.every((card, index) => index === 0 || (
    cards[index - 1].rank === card.rank + 1 && solitaireCardColor(cards[index - 1]) !== solitaireCardColor(card)
  ));
}

export function selectedSolitaireCards(state: SolitaireState, selection: SolitaireSelection) {
  if (selection.source === "waste") {
    const card = state.waste.at(-1);
    return card ? [card] : [];
  }
  if (selection.source === "foundation") {
    const card = state.foundations[selection.suit].at(-1);
    return card ? [card] : [];
  }
  const cards = state.tableau[selection.pile]?.slice(selection.index) || [];
  return isValidTableauStack(cards) ? cards : [];
}

function canPlaceOnTableau(card: SolitaireCard, pile: SolitaireCard[]) {
  const top = pile.at(-1);
  if (!top) return card.rank === 13;
  return top.faceUp && top.rank === card.rank + 1 && solitaireCardColor(top) !== solitaireCardColor(card);
}

function canPlaceOnFoundation(card: SolitaireCard, pile: SolitaireCard[], suit: SolitaireSuit) {
  const top = pile.at(-1);
  return card.suit === suit && (top ? top.rank + 1 === card.rank : card.rank === 1);
}

export function canMoveSolitaireCards(state: SolitaireState, selection: SolitaireSelection, destination: SolitaireDestination) {
  const cards = selectedSolitaireCards(state, selection);
  if (!cards.length) return false;
  if (destination.destination === "foundation") {
    if (cards.length !== 1 || (selection.source === "foundation" && selection.suit === destination.suit)) return false;
    return canPlaceOnFoundation(cards[0], state.foundations[destination.suit], destination.suit);
  }
  if (selection.source === "tableau" && selection.pile === destination.pile) return false;
  return canPlaceOnTableau(cards[0], state.tableau[destination.pile] || []);
}

export function moveSolitaireCards(state: SolitaireState, selection: SolitaireSelection, destination: SolitaireDestination) {
  if (state.status === "won" || !canMoveSolitaireCards(state, selection, destination)) return state;
  const cards = selectedSolitaireCards(state, selection).map((card) => ({ ...card }));
  const stock = state.stock.map((card) => ({ ...card }));
  const waste = state.waste.map((card) => ({ ...card }));
  const tableau = state.tableau.map((pile) => pile.map((card) => ({ ...card })));
  const foundations = Object.fromEntries(solitaireSuits.map((suit) => [suit, state.foundations[suit].map((card) => ({ ...card }))])) as Record<SolitaireSuit, SolitaireCard[]>;

  if (selection.source === "waste") waste.pop();
  if (selection.source === "foundation") foundations[selection.suit].pop();
  if (selection.source === "tableau") {
    tableau[selection.pile].splice(selection.index);
    const exposed = tableau[selection.pile].at(-1);
    if (exposed && !exposed.faceUp) exposed.faceUp = true;
  }

  if (destination.destination === "foundation") foundations[destination.suit].push(...cards.map((card) => ({ ...card, faceUp: true })));
  else tableau[destination.pile].push(...cards.map((card) => ({ ...card, faceUp: true })));
  return withHistory(state, { stock, waste, tableau, foundations });
}

export function autoMoveSolitaireCard(state: SolitaireState, selection: SolitaireSelection) {
  const card = selectedSolitaireCards(state, selection);
  if (card.length !== 1) return state;
  return moveSolitaireCards(state, selection, { destination: "foundation", suit: card[0].suit });
}

export function undoSolitaireMove(state: SolitaireState) {
  const previous = state.history.at(-1);
  if (!previous) return state;
  return { version: 1 as const, ...previous, history: state.history.slice(0, -1) };
}

export function isSolitaireState(value: unknown): value is SolitaireState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<SolitaireState>;
  return state.version === 1 && Array.isArray(state.stock) && Array.isArray(state.waste) &&
    Array.isArray(state.tableau) && state.tableau.length === 7 && Boolean(state.foundations) &&
    Array.isArray(state.history) && (state.status === "playing" || state.status === "won");
}
