import { describe, it, expect } from "vitest";
import { shuffleArray, shuffleOptionsKeepLast } from "@/lib/shuffle";

const OTHER = "אחר — פרט";

describe("shuffleArray", () => {
  it("returns a permutation: same members, same length", () => {
    const input = ["a", "b", "c", "d"];
    for (let i = 0; i < 50; i++) {
      const out = shuffleArray(input);
      expect(out).toHaveLength(input.length);
      expect([...out].sort()).toEqual([...input].sort());
    }
  });

  it("does not mutate its input (opener options are module-singleton constants)", () => {
    const input = ["a", "b", "c", "d"];
    const snapshot = [...input];
    shuffleArray(input);
    expect(input).toEqual(snapshot);
  });

  it("actually varies the order across runs", () => {
    // P(100 identical shuffles of 4 elements) = (1/24)^99 — a failure here
    // means the shuffle is broken, not bad luck.
    const input = ["a", "b", "c", "d"];
    const orders = new Set<string>();
    for (let i = 0; i < 100; i++) orders.add(shuffleArray(input).join("|"));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("handles empty and single-element arrays", () => {
    expect(shuffleArray([])).toEqual([]);
    expect(shuffleArray(["only"])).toEqual(["only"]);
  });
});

describe("shuffleOptionsKeepLast", () => {
  it("keeps the free-text option pinned last, wherever the AI placed it", () => {
    const input = ["עמדה א", OTHER, "עמדה ב", "עמדה ג"];
    for (let i = 0; i < 50; i++) {
      const out = shuffleOptionsKeepLast(input, OTHER);
      expect(out[out.length - 1]).toBe(OTHER);
      expect(out).toHaveLength(input.length);
      expect([...out].sort()).toEqual([...input].sort());
    }
  });

  it("just shuffles when the pinned option is absent", () => {
    const input = ["עמדה א", "עמדה ב", "עמדה ג"];
    const out = shuffleOptionsKeepLast(input, OTHER);
    expect(out).toHaveLength(3);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it("does not mutate its input", () => {
    const input = ["עמדה א", "עמדה ב", OTHER];
    const snapshot = [...input];
    shuffleOptionsKeepLast(input, OTHER);
    expect(input).toEqual(snapshot);
  });
});
