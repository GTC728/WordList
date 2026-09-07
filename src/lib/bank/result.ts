import type { BlockStat } from '../../types'

export const COOLDOWN_AFTER_CORRECT = 5
export const MISS_GAP = 1
export const LEECH_STREAK = 2

export function nextDueGame(gameIndex: number, correct: boolean, consecutiveWrong: number): number {
  if (correct) return gameIndex + 1 + COOLDOWN_AFTER_CORRECT
  if (consecutiveWrong >= LEECH_STREAK) return gameIndex + 1
  return gameIndex + 1 + MISS_GAP
}

function countsOf(stat: BlockStat | undefined): { seen: number; correct: number; wrong: number } {
  if (!stat) return { seen: 0, correct: 0, wrong: 0 }
  if (typeof stat.correct === 'number' && typeof stat.wrong === 'number') {
    return { seen: stat.seen, correct: stat.correct, wrong: stat.wrong }
  }
  const wrong = Math.min(stat.seen, stat.consecutiveWrong || (stat.lastCorrect === false ? 1 : 0))
  return { seen: stat.seen, correct: Math.max(0, stat.seen - wrong), wrong }
}

export function applyBlockResult(
  stats: Record<string, BlockStat>,
  blockId: string,
  gameIndex: number,
  correct: boolean,
): BlockStat {
  const prev = stats[blockId]
  const prevCounts = countsOf(prev)
  const consecutiveWrong = correct ? 0 : (prev?.consecutiveWrong ?? 0) + 1
  return {
    lastGame: gameIndex,
    lastCorrect: correct,
    consecutiveWrong,
    seen: prevCounts.seen + 1,
    dueGame: nextDueGame(gameIndex, correct, consecutiveWrong),
    correct: prevCounts.correct + (correct ? 1 : 0),
    wrong: prevCounts.wrong + (correct ? 0 : 1),
    lastSeenAt: Date.now(),
  }
}
