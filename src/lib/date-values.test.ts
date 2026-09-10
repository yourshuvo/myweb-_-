import { describe, expect, it } from "vitest";
import { toDate, toIsoDateTime } from "@/lib/date-values";

describe("cached date values", () => {
  it("revives cache-serialized ISO strings", () => {
    const value = "2026-07-20T15:47:00.000Z";
    expect(toDate(value)).toEqual(new Date(value));
    expect(toIsoDateTime(value)).toBe(value);
  });

  it("preserves Date values and optional empty values", () => {
    const value = new Date("2026-07-20T15:47:00.000Z");
    expect(toDate(value)).toBe(value);
    expect(toIsoDateTime(null)).toBeUndefined();
  });
});
