import type { BlockStat, ProgressState } from '../../types'

export type BlockTally = {
  seen: number
  correct: number
  wrong: number
  lastCorrect: boolean | null
  consecutiveWrong: number
  lastSeenAt?: number
}

export function wordIdFromBlockId(blockId: string): string {
  const cut = blockId.indexOf(':')
  return cut === -1 ? blockId : blockId.slice(0, cut)
}

export function tallyFromStat(stat: BlockStat | undefined): BlockTally {
  if (!stat) {
    return { seen: 0, correct: 0, wrong: 0, lastCorrect: null, consecutiveWrong: 0 }
  }
  const lastSeenAt = typeof stat.lastSeenAt === 'number' ? stat.lastSeenAt : undefined
  if (typeof stat.correct === 'number' && typeof stat.wrong === 'number') {
    return {
      seen: stat.seen,
      correct: stat.correct,
      wrong: stat.wrong,
      lastCorrect: stat.lastCorrect,
      consecutiveWrong: stat.consecutiveWrong,
      lastSeenAt,
    }
  }
  const wrong = Math.min(stat.seen, stat.consecutiveWrong || (stat.lastCorrect === false ? 1 : 0))
  return {
    seen: stat.seen,
    correct: Math.max(0, stat.seen - wrong),
    wrong,
    lastCorrect: stat.lastCorrect,
    consecutiveWrong: stat.consecutiveWrong,
    lastSeenAt,
  }
}

export function mergeBankTallies(bank: ProgressState['bank']): Record<string, BlockTally> {
  const out: Record<string, BlockTally> = {}
  for (const scope of Object.values(bank)) {
    for (const [id, stat] of Object.entries(scope.stats)) {
      const add = tallyFromStat(stat)
      const prev = out[id]
      if (!prev) {
        out[id] = { ...add }
        continue
      }
      const addAt = add.lastSeenAt ?? 0
      const prevAt = prev.lastSeenAt ?? 0
      out[id] = {
        seen: prev.seen + add.seen,
        correct: prev.correct + add.correct,
        wrong: prev.wrong + add.wrong,
        lastCorrect: addAt >= prevAt ? (add.lastCorrect ?? prev.lastCorrect) : prev.lastCorrect,
        consecutiveWrong: Math.max(prev.consecutiveWrong, add.consecutiveWrong),
        lastSeenAt: addAt || prevAt ? Math.max(addAt, prevAt) : undefined,
      }
    }
  }
  return out
}

export function hitsFromBank(bank: ProgressState['bank'] | undefined): Record<string, number> {
  const tallies = mergeBankTallies(bank ?? {})
  const byWord: Record<string, number> = {}
  for (const [id, tally] of Object.entries(tallies)) {
    if (!tally.seen) continue
    const wordId = wordIdFromBlockId(id)
    byWord[wordId] = (byWord[wordId] ?? 0) + tally.seen
  }
  return byWord
}
