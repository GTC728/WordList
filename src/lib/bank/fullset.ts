import { matchPrompt } from '../quiz'
import { shuffle } from '../shuffle'
import { blocksForPile, materializeMcq } from './blocks'
import type { FullItem, Question, QuestionBlock, WordCard } from '../../types'

const BOARD_SIZE = 4
const MATCH_TYPES = ['native', 'synonym', 'collocation'] as const

function uniquePairs(items: QuestionBlock[]): QuestionBlock[] {
  const usedLeft = new Set<string>()
  const usedRight = new Set<string>()
  const next: QuestionBlock[] = []
  for (const item of items) {
    const pair = item.pair
    if (!item.kind || item.kind !== 'pair' || !pair) continue
    const left = pair.left.toLowerCase()
    const right = pair.right.toLowerCase()
    if (usedLeft.has(left) || usedRight.has(right)) continue
    usedLeft.add(left)
    usedRight.add(right)
    next.push(item)
  }
  return next
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size))
  return groups
}

export function countFullItems(words: WordCard[]): { questions: number; blocks: number } {
  const order = buildFullOrder(words)
  const blocks = order.reduce((sum, item) => sum + (item.k === 'mcq' ? 1 : item.ids.length), 0)
  return { questions: order.length, blocks }
}

export function buildFullOrder(words: WordCard[]): FullItem[] {
  const blocks = blocksForPile(words)
  const items: FullItem[] = []

  for (const block of blocks) {
    if (block.kind === 'mcq') items.push({ k: 'mcq', id: block.id })
  }

  for (const type of MATCH_TYPES) {
    const pairs = uniquePairs(blocks.filter((block) => block.kind === 'pair' && block.type === type))
    for (const group of chunk(pairs, BOARD_SIZE)) {
      if (group.length === 0) continue
      items.push({ k: 'board', type, ids: group.map((item) => item.id) })
    }
  }

  return shuffle(items)
}

export function materializeFullItem(item: FullItem, words: WordCard[]): Question | null {
  const blocks = blocksForPile(words)
  const byId = new Map(blocks.map((block) => [block.id, block]))

  if (item.k === 'mcq') {
    const block = byId.get(item.id)
    if (!block) return null
    if (block.kind === 'mcq') return materializeMcq(block, words)
    if (block.kind === 'pair' && block.pair) {
      return {
        type: block.type === 'synonym' || block.type === 'native' ? block.type : 'collocation',
        wordIds: [block.wordId],
        blockIds: [block.id],
        prompt: matchPrompt(block.type === 'synonym' || block.type === 'native' ? block.type : 'collocation'),
        pairs: [block.pair],
      }
    }
    return null
  }

  const chosen = item.ids.map((id) => byId.get(id)).filter((block): block is QuestionBlock => Boolean(block?.pair))
  if (chosen.length < 2) return null
  return {
    type: item.type,
    wordIds: chosen.map((block) => block.wordId),
    blockIds: chosen.map((block) => block.id),
    prompt: matchPrompt(item.type),
    pairs: chosen.map((block) => block.pair!),
  }
}
