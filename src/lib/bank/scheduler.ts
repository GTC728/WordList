import { matchPrompt } from '../quiz'
import { pickN } from '../shuffle'
import { blocksForPile, materializeMcq } from './blocks'
import type {
  BankQuestionType,
  BlockStat,
  MatchQuestion,
  Question,
  QuestionBlock,
  WordCard,
} from '../../types'

export const GAME_SIZE = 12
const COOLDOWN_AFTER_CORRECT = 5
const MISS_GAP = 1
const LEECH_STREAK = 2

const MATCH_TYPES = ['native', 'synonym', 'collocation'] as const

function uniquePairBlocks(items: QuestionBlock[]): QuestionBlock[] {
  const usedLeft = new Set<string>()
  const usedRight = new Set<string>()
  const next: QuestionBlock[] = []
  for (const item of items) {
    const pair = item.pair
    if (!pair) continue
    const left = pair.left.toLowerCase()
    const right = pair.right.toLowerCase()
    if (usedLeft.has(left) || usedRight.has(right)) continue
    usedLeft.add(left)
    usedRight.add(right)
    next.push(item)
  }
  return next
}

export function isBlockEligible(stat: BlockStat | undefined, gameIndex: number): boolean {
  if (!stat) return true
  return stat.dueGame <= gameIndex
}

export function scoreBlock(
  block: QuestionBlock,
  stats: Record<string, BlockStat>,
  gameIndex: number,
  noise: number,
): number {
  const stat = stats[block.id]
  if (!stat) return 70 + noise * 25
  let score = 8 + (gameIndex - stat.dueGame) * 6
  if (stat.consecutiveWrong >= LEECH_STREAK) score += 140
  else if (stat.consecutiveWrong === 1) score += 70
  score -= Math.min(24, stat.seen * 2)
  score += noise * 18
  return score
}

function pickWeighted(
  items: QuestionBlock[],
  stats: Record<string, BlockStat>,
  gameIndex: number,
  avoidWord?: string,
): QuestionBlock | undefined {
  if (items.length === 0) return undefined
  const ranked = items
    .map((block) => ({
      block,
      score:
        scoreBlock(block, stats, gameIndex, Math.random()) +
        (avoidWord && block.wordId === avoidWord ? -35 : 0),
    }))
    .sort((a, b) => b.score - a.score)
  const top = ranked.slice(0, Math.min(6, ranked.length))
  return pickN(
    top.map((item) => item.block),
    1,
  )[0]
}

function materializeBoard(
  type: (typeof MATCH_TYPES)[number],
  chosen: QuestionBlock[],
): MatchQuestion | null {
  const clean = uniquePairBlocks(chosen).slice(0, 5)
  if (clean.length < 3) return null
  return {
    type,
    wordIds: clean.map((item) => item.wordId),
    blockIds: clean.map((item) => item.id),
    prompt: matchPrompt(type),
    pairs: clean.map((item) => item.pair!),
  }
}

export function drawBankGame(
  words: WordCard[],
  stats: Record<string, BlockStat>,
  gameIndex: number,
): Question[] {
  const blocks = blocksForPile(words)
  const eligible = blocks.filter((block) => isBlockEligible(stats[block.id], gameIndex))
  const used = new Set<string>()
  const questions: Question[] = []
  let lastWord: string | undefined

  const remaining = (kind?: QuestionBlock['kind'], type?: BankQuestionType) =>
    eligible.filter((block) => {
      if (used.has(block.id)) return false
      if (kind && block.kind !== kind) return false
      if (type && block.type !== type) return false
      return true
    })

  const takeMcq = (type?: Extract<BankQuestionType, 'meaning' | 'form' | 'cloze' | 'family'>) => {
    const pool = remaining('mcq', type)
    const block = pickWeighted(pool, stats, gameIndex, lastWord)
    if (!block) return
    const question = materializeMcq(block, words)
    if (!question) return
    used.add(block.id)
    lastWord = block.wordId
    questions.push(question)
  }

  const takeBoard = (type: (typeof MATCH_TYPES)[number]) => {
    const pool = remaining('pair', type)
    const byWord = new Map<string, QuestionBlock>()
    const ranked = [...pool].sort(
      (a, b) =>
        scoreBlock(b, stats, gameIndex, Math.random()) -
        scoreBlock(a, stats, gameIndex, Math.random()),
    )
    for (const block of ranked) {
      if (!byWord.has(block.wordId)) byWord.set(block.wordId, block)
    }
    const chosen = [...byWord.values()].slice(0, 5)
    const board = materializeBoard(type, chosen)
    if (!board) return
    board.blockIds?.forEach((id) => used.add(id))
    questions.push(board)
    lastWord = undefined
  }

  takeBoard('native')
  takeMcq('meaning')
  takeMcq('form')
  takeBoard('synonym')
  takeMcq('cloze')
  takeMcq('family')
  takeBoard('collocation')
  takeMcq('meaning')
  takeMcq('form')
  takeMcq('cloze')
  takeMcq()
  takeMcq()

  while (questions.length < GAME_SIZE) {
    const before = questions.length
    takeMcq()
    if (questions.length === before) break
  }

  return questions.slice(0, GAME_SIZE)
}

export function nextDueGame(gameIndex: number, correct: boolean, consecutiveWrong: number): number {
  if (correct) return gameIndex + 1 + COOLDOWN_AFTER_CORRECT
  if (consecutiveWrong >= LEECH_STREAK) return gameIndex + 1
  return gameIndex + 1 + MISS_GAP
}

export function applyBlockResult(
  stats: Record<string, BlockStat>,
  blockId: string,
  gameIndex: number,
  correct: boolean,
): BlockStat {
  const prev = stats[blockId]
  const consecutiveWrong = correct ? 0 : (prev?.consecutiveWrong ?? 0) + 1
  return {
    lastGame: gameIndex,
    lastCorrect: correct,
    consecutiveWrong,
    seen: (prev?.seen ?? 0) + 1,
    dueGame: nextDueGame(gameIndex, correct, consecutiveWrong),
  }
}
