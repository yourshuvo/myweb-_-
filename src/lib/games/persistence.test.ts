import { describe, expect, it } from "vitest";
import { parseGameStorage, saveGameStorage } from "@/lib/games/persistence";

const isState = (value: unknown): value is { score: number } => Boolean(value && typeof value === "object" && typeof (value as { score?: unknown }).score === "number");
const isStats = (value: unknown): value is { wins: number } => Boolean(value && typeof value === "object" && typeof (value as { wins?: unknown }).wins === "number");
const fallback = { version: 1 as const, state: { score: 0 }, stats: { wins: 0 } };

describe("versioned game storage", () => {
  it("reads current storage and migrates the version zero game key", () => {
    expect(parseGameStorage(JSON.stringify({ version: 1, state: { score: 2 }, stats: { wins: 3 } }), fallback, isState, isStats).state.score).toBe(2);
    expect(parseGameStorage(JSON.stringify({ version: 0, game: { score: 4 }, stats: { wins: 5 } }), fallback, isState, isStats))
      .toEqual({ version: 1, state: { score: 4 }, stats: { wins: 5 } });
  });

  it("fails safely for malformed or future storage", () => {
    expect(parseGameStorage("not json", fallback, isState, isStats)).toBe(fallback);
    expect(parseGameStorage(JSON.stringify({ version: 9, state: { score: 2 }, stats: { wins: 3 } }), fallback, isState, isStats)).toBe(fallback);
  });

  it("falls back to a compact save when browser quota rejects the full value", () => {
    const values = new Map<string, string>();
    const storage = {
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => {
        if (value.length > 80) throw new DOMException("Storage full", "QuotaExceededError");
        values.set(key, value);
      },
    };
    const full = { version: 1 as const, state: { score: 2, history: "x".repeat(100) }, stats: { wins: 3 } };
    const compact = { version: 1 as const, state: { score: 2 }, stats: { wins: 3 } };
    expect(saveGameStorage(storage, "game", full, compact)).toBe("compacted");
    expect(values.get("game")).toBe(JSON.stringify(compact));
  });
});
