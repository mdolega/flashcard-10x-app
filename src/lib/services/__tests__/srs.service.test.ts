import { describe, it, expect } from "vitest";
import { calculate_sm2_next, compute_next_review_at, type Sm2NextParams } from "@/lib/services/srs.service";

describe("srs.service - calculate_sm2_next", () => {
  const base: Omit<Sm2NextParams, "grade"> = {
    prev_easiness: 2.5,
    prev_repetition: 0,
    prev_interval_days: 0,
  };

  it("throws for invalid grade", () => {
    // @ts-expect-error testing runtime guard
    expect(() => calculate_sm2_next({ ...base, grade: -1 })).toThrowError(/grade must be between 0 and 5/);
    // @ts-expect-error testing runtime guard
    expect(() => calculate_sm2_next({ ...base, grade: 6 })).toThrowError(/grade must be between 0 and 5/);
  });

  it("resets repetition and sets short interval when grade < 3", () => {
    const res = calculate_sm2_next({ ...base, grade: 2 });
    expect(res.repetition).toBe(0);
    expect(res.interval_days).toBe(1);
    expect(res.easiness).toBeGreaterThanOrEqual(1.3);
  });

  it("progresses repetition and sets interval = 1 for first successful review (grade>=3)", () => {
    const res = calculate_sm2_next({ ...base, prev_repetition: 0, prev_interval_days: 0, grade: 4 });
    expect(res.repetition).toBe(1);
    expect(res.interval_days).toBe(1);
  });

  it("sets interval = 6 for second successful review", () => {
    const res = calculate_sm2_next({ ...base, prev_repetition: 1, prev_interval_days: 1, grade: 4 });
    expect(res.repetition).toBe(2);
    expect(res.interval_days).toBe(6);
  });

  it("scales interval by easiness for subsequent reviews", () => {
    const res = calculate_sm2_next({ ...base, prev_repetition: 3, prev_interval_days: 6, grade: 5 });
    expect(res.repetition).toBe(4);
    expect(res.interval_days).toBeGreaterThanOrEqual(1);
  });
});

describe("srs.service - compute_next_review_at", () => {
  it("throws for invalid interval_days", () => {
    // @ts-expect-error testing runtime guard
    expect(() => compute_next_review_at(-1)).toThrowError(/non-negative/);
    // @ts-expect-error testing runtime guard
    expect(() => compute_next_review_at(NaN)).toThrowError(/non-negative/);
  });

  it("adds interval days to provided date in UTC", () => {
    const now = new Date("2024-01-10T00:00:00.000Z");
    const d = compute_next_review_at(5, now);
    expect(d.toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });
});
