import { allWords } from '../../data/course'
import { matchPrompt } from '../quiz'
import { shuffle } from '../shuffle'
import type { ProgressState, Question, QuestionBlock } from '../../types'
import { materializeMcq, materializeSpell } from './blocks'
import { allQuestionBlocks, mergeBankTallies, type BlockTally } from './stats'

export type DrillKind = 'wrong' | 'starred' | 'stale'

export const DRILL_SESSION = 12
/** Skip items practiced in the last few hours so 舊題 is actually old. */
const STALE_GAP_MS = 6 * 60 * 60 * 1000

export const DRILL_META: Record<DrillKind, { eyebrow: string; title: string; lede: string }> = {
  wrong: {
    eyebrow: '重溫',
    title: '錯題',
    lede: '上次答錯的題。這次對了就會離開清單。',
  },
  starred: {
    eyebrow: '重溫',
    title: '星號',
    lede: '標記過的題。可在這裡重溫或取消。',
  },
  stale: {
    eyebrow: '重溫',
    title: '舊題',
    lede: '做過之後最久沒碰到的題。剛練完的幾小時內不會排進來。',
  },
}

export function isDrillKind(value: string | undefined): value is DrillKind {
  return value === 'wrong' || value === 'starred' || value === 'stale'
}

export type DrillItem = {
  block: QuestionBlock
  tally?: BlockTally
  starredAt?: number
}

export function drillItems(kind: DrillKind, progress: ProgressState): DrillItem[] {
  const byId = new Map(allQuestionBlocks().map((block) => [block.id, block]))
  const tallies = mergeBankTallies(progress.bank)
  const stars = progress.stars ?? {}

  if (kind === 'starred') {
    return Object.entries(stars)
      .sort((a, b) => b[1] - a[1])
      .flatMap(([id, starredAt]) => {
        const block = byId.get(id)
        return block ? [{ block, tally: tallies[id], starredAt }] : []
      })
  }

  if (kind === 'wrong') {
    return [...byId.values()]
      .filter((block) => {
        const tally = tallies[block.id]
        return Boolean(tally && tally.seen > 0 && tally.lastCorrect === false)
      })
      .map((block) => ({ block, tally: tallies[block.id], starredAt: stars[block.id] }))
      .sort((a, b) => (b.tally?.wrong ?? 0) - (a.tally?.wrong ?? 0))
  }

  const now = Date.now()
  return [...byId.values()]
    .filter((block) => {
      const tally = tallies[block.id]
      if (!tally || tally.seen <= 0) return false
      const at = tally.lastSeenAt ?? 0
      return now - at >= STALE_GAP_MS
    })
    .map((block) => ({ block, tally: tallies[block.id], starredAt: stars[block.id] }))
    .sort((a, b) => (a.tally?.lastSeenAt ?? 0) - (b.tally?.lastSeenAt ?? 0))
}

export function drillCounts(progress: ProgressState): Record<DrillKind, number> {
  const byId = new Map(allQuestionBlocks().map((block) => [block.id, block]))
  const tallies = mergeBankTallies(progress.bank)
  const now = Date.now()
  let wrong = 0
  let stale = 0
  for (const block of byId.values()) {
    const tally = tallies[block.id]
    if (!tally || tally.seen <= 0) continue
    if (tally.lastCorrect === false) wrong += 1
    if (now - (tally.lastSeenAt ?? 0) >= STALE_GAP_MS) stale += 1
  }
  const starred = Object.keys(progress.stars ?? {}).filter((id) => byId.has(id)).length
  return { wrong, starred, stale }
}

export function materializeBlock(block: QuestionBlock): Question | null {
  if (block.kind === 'mcq') return materializeMcq(block, allWords)
  if (block.kind === 'type') return materializeSpell(block)
  if (!block.pair) return null
  const type = block.type === 'synonym' || block.type === 'native' ? block.type : 'collocation'
  return {
    type,
    wordIds: [block.wordId],
    blockIds: [block.id],
    prompt: matchPrompt(type),
    pairs: [block.pair],
  }
}

export function drillQuestions(kind: DrillKind, progress: ProgressState, limit = DRILL_SESSION): Question[] {
  const items = drillItems(kind, progress)
  const pool = kind === 'starred' ? shuffle(items) : items
  return pool
    .slice(0, limit)
    .map((item) => materializeBlock(item.block))
    .filter((question): question is Question => Boolean(question))
}
