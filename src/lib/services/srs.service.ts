export type Sm2Grade = 0 | 1 | 2 | 3 | 4 | 5;

export interface Sm2State {
  easiness: number;
  repetition: number;
  interval_days: number;
}

export interface Sm2NextParams {
  prev_easiness: number;
  prev_repetition: number;
  prev_interval_days: number;
  grade: Sm2Grade;
}

export const calculate_sm2_next = ({
  prev_easiness,
  prev_repetition,
  prev_interval_days,
  grade,
}: Sm2NextParams): Sm2State => {
  if (grade < 0 || grade > 5) {
    throw new Error("grade must be between 0 and 5");
  }

  // If grade < 3, reset repetition and schedule short interval
  if (grade < 3) {
    const updatedEasiness = Math.max(1.3, prev_easiness + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));

    return {
      easiness: Number(updatedEasiness.toFixed(2)),
      repetition: 0,
      interval_days: 1,
    };
  }

  // grade >= 3
  const nextRepetition = prev_repetition + 1;
  const updatedEasiness = Math.max(1.3, prev_easiness + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));

  let nextIntervalDays: number;
  if (nextRepetition === 1) {
    nextIntervalDays = 1;
  } else if (nextRepetition === 2) {
    nextIntervalDays = 6;
  } else {
    nextIntervalDays = Math.max(1, Math.floor(prev_interval_days * updatedEasiness));
  }

  return {
    easiness: Number(updatedEasiness.toFixed(2)),
    repetition: nextRepetition,
    interval_days: nextIntervalDays,
  };
};

export const compute_next_review_at = (interval_days: number, now: Date = new Date()): Date => {
  if (!Number.isFinite(interval_days) || interval_days < 0) {
    throw new Error("interval_days must be a non-negative finite number");
  }

  const result = new Date(now);
  result.setUTCDate(result.getUTCDate() + interval_days);
  return result;
};
