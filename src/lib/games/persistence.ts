export type GameStorageEnvelope<TState, TStats> = {
  version: 1;
  state: TState;
  stats: TStats;
};

export function parseGameStorage<TState, TStats>(
  raw: string | null,
  fallback: GameStorageEnvelope<TState, TStats>,
  isState: (value: unknown) => value is TState,
  isStats: (value: unknown) => value is TStats,
): GameStorageEnvelope<TState, TStats> {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const candidateState = value.version === 0 ? value.game : value.state;
    if ((value.version !== 0 && value.version !== 1) || !isState(candidateState) || !isStats(value.stats)) {
      return fallback;
    }
    return { version: 1, state: candidateState, stats: value.stats };
  } catch {
    return fallback;
  }
}

export function saveGameStorage<TState, TStats>(
  storage: Pick<Storage, "setItem" | "removeItem">,
  key: string,
  value: GameStorageEnvelope<TState, TStats>,
  compactValue: GameStorageEnvelope<TState, TStats>,
): "saved" | "compacted" | "unavailable" {
  try {
    storage.setItem(key, JSON.stringify(value));
    return "saved";
  } catch {
    try {
      storage.removeItem(key);
      storage.setItem(key, JSON.stringify(compactValue));
      return "compacted";
    } catch {
      return "unavailable";
    }
  }
}
