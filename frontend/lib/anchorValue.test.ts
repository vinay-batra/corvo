// Vitest unit tests for liveValueFromAnchor (testing-observability report T1).
//
// This is the live portfolio dollar value the user compares against their
// brokerage - pure, deterministic, and previously untested. Run with
// `npx vitest run` (requires `vitest` as a devDependency and, ideally, a
// `"test": "vitest run"` script in frontend/package.json).
import { describe, it, expect } from "vitest";
import { liveValueFromAnchor } from "./anchorValue";

const A = [
  { ticker: "AAPL", weight: 0.5 },
  { ticker: "MSFT", weight: 0.5 },
];

describe("liveValueFromAnchor", () => {
  it("no move => base value, tracked", () => {
    const r = liveValueFromAnchor(10000, A,
      { AAPL: 100, MSFT: 200 }, { AAPL: 100, MSFT: 200 });
    expect(r.tracked).toBe(true);
    expect(r.value).toBeCloseTo(10000, 6);
  });

  it("+10% on both legs => +10% value", () => {
    const r = liveValueFromAnchor(10000, A,
      { AAPL: 100, MSFT: 200 }, { AAPL: 110, MSFT: 220 });
    expect(r.value).toBeCloseTo(11000, 6);
  });

  it("value-weights the legs", () => {
    // AAPL +20%, MSFT flat => 0.5*1.2 + 0.5*1.0 = 1.10
    const r = liveValueFromAnchor(10000, A,
      { AAPL: 100, MSFT: 200 }, { AAPL: 120, MSFT: 200 });
    expect(r.value).toBeCloseTo(11000, 6);
  });

  it("falls back to base when <50% weight covered", () => {
    const r = liveValueFromAnchor(10000, A,
      { AAPL: 100 }, { AAPL: 110 }); // MSFT has no anchor => only 50% covered
    // exactly 0.5 is NOT < 0.5 so this tracks; push below half:
    const A3 = [
      { ticker: "AAPL", weight: 0.3 },
      { ticker: "MSFT", weight: 0.7 },
    ];
    const r2 = liveValueFromAnchor(10000, A3, { AAPL: 100 }, { AAPL: 110 });
    expect(r2.tracked).toBe(false);
    expect(r2.value).toBe(10000);
  });

  it("guards divide-by-zero anchor price", () => {
    const r = liveValueFromAnchor(10000, A,
      { AAPL: 0, MSFT: 200 }, { AAPL: 110, MSFT: 200 }); // AAPL anchor 0 skipped
    expect(Number.isFinite(r.value)).toBe(true);
  });

  it("no anchor => base, untracked", () => {
    const r = liveValueFromAnchor(10000, A, null, { AAPL: 110, MSFT: 220 });
    expect(r).toEqual({ value: 10000, tracked: false });
  });
});
