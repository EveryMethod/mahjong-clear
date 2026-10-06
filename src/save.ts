import { LEVEL_COUNT } from "./session";

export type Progress = {
  unlocked: number;
  bestStars: number[];
  bestScores: number[];
  seenTutorial: boolean;
  muted: boolean;
};

const KEY = "sanzhidie-v1";

function blank(): Progress {
  return {
    unlocked: 1,
    bestStars: Array.from({ length: LEVEL_COUNT }, () => 0),
    bestScores: Array.from({ length: LEVEL_COUNT }, () => 0),
    seenTutorial: false,
    muted: false,
  };
}

export function loadProgress(): Progress {
  const fallback = blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      unlocked: clampLevel(parsed.unlocked ?? 1),
      bestStars: padCounts(parsed.bestStars),
      bestScores: padCounts(parsed.bestScores),
      seenTutorial: Boolean(parsed.seenTutorial),
      muted: Boolean(parsed.muted),
    };
  } catch {
    return fallback;
  }
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(KEY, JSON.stringify(progress));
}

export function recordWin(
  progress: Progress,
  level: number,
  stars: number,
  score: number,
): Progress {
  const next: Progress = {
    ...progress,
    bestStars: [...progress.bestStars],
    bestScores: [...progress.bestScores],
    unlocked: Math.max(progress.unlocked, Math.min(LEVEL_COUNT, level + 1)),
  };
  const index = level - 1;
  if (stars > next.bestStars[index]) {
    next.bestStars[index] = stars;
  }
  if (score > next.bestScores[index]) {
    next.bestScores[index] = score;
  }
  return next;
}

export function totalScore(progress: Progress): number {
  return progress.bestScores.reduce((sum, value) => sum + value, 0);
}

function clampLevel(value: number): number {
  if (value < 1) {
    return 1;
  }
  if (value > LEVEL_COUNT) {
    return LEVEL_COUNT;
  }
  return value;
}

function padCounts(values: number[] | undefined): number[] {
  const padded = Array.from({ length: LEVEL_COUNT }, () => 0);
  if (!values) {
    return padded;
  }
  for (let index = 0; index < LEVEL_COUNT; index++) {
    padded[index] = values[index] ?? 0;
  }
  return padded;
}
