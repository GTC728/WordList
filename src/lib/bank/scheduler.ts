import { matchPrompt } from '../quiz'
import { pickN } from '../shuffle'
import { blocksForPile, materializeMcq, materializeSpell, nativeMeaningQuestion } from './blocks'
import { canSpellWord, isNewWord } from '../hits'
import { LEECH_STREAK } from './result'
import type {
  BankQuestionType,
  BlockStat,
  MatchQuestion,
  Question,
  QuestionBlock,
  WordCard,
} from '../../types'

export const GAME_SIZE = 12
const NEW_WORD_CAP = 4

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
  wordHits: Record<string, number> = {},
): Question[] {
  const blocks = blocksForPile(words)
  const used = new Set<string>()
  const questions: Question[] = []
  const met = new Set<string>()
  let lastWord: string | undefined

  const known = (wordId: string) => !isNewWord(wordId, wordHits) || met.has(wordId)

  const remaining = (kind?: QuestionBlock['kind'], type?: BankQuestionType) =>
    blocks.filter((block) => {
      if (used.has(block.id)) return false
      if (!isBlockEligible(stats[block.id], gameIndex)) return false
      if (kind && block.kind !== kind) return false
      if (type && block.type !== type) return false
      if (block.type === 'spell' && !canSpellWord(block.wordId, wordHits)) return false
      if (!known(block.wordId)) return false
      return true
    })

  const takeMeaning = (word: WordCard) => {
    const question = nativeMeaningQuestion(word, words)
    if (!question) return false
    used.add(question.blockId ?? `${word.id}:meaning:0`)
    met.add(word.id)
    lastWord = word.id
    questions.push(question)
    return true
  }

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

  const takeSpell = () => {
    const pool = remaining('type', 'spell')
    const block = pickWeighted(pool, stats, gameIndex, lastWord)
    if (!block) return
    const question = materializeSpell(block)
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

  const fresh = words.filter((word) => isNewWord(word.id, wordHits))
  const welcome = pickN(fresh, Math.min(NEW_WORD_CAP, fresh.length))
  for (const word of welcome) {
    if (questions.length >= GAME_SIZE) break
    takeMeaning(word)
  }

  takeBoard('native')
  takeMcq('meaning')
  takeMcq('form')
  takeBoard('synonym')
  takeMcq('cloze')
  takeMcq('family')
  takeSpell()
  takeBoard('collocation')
  takeMcq('meaning')
  takeMcq('form')
  takeMcq('cloze')
  takeSpell()
  takeMcq()
  takeMcq()

  while (questions.length < GAME_SIZE) {
    const before = questions.length
    const leftover = fresh.filter((word) => !met.has(word.id))
    if (leftover.length > 0 && questions.length < GAME_SIZE) {
      takeMeaning(leftover[0]!)
      if (questions.length > before) continue
    }
    takeMcq()
    takeSpell()
    if (questions.length === before) break
  }

  return questions.slice(0, GAME_SIZE)
}
