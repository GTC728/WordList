import { allWords, getSublistWords } from '../../data/course'
import type { BankQuestionType, ProgressState, QuestionBlock, WordCard } from '../../types'
import { blocksForPile, blocksForWord } from './blocks'
import type { BlockTally } from './tallies'

export type { BlockTally } from './tallies'
export { hitsFromBank, mergeBankTallies, tallyFromStat, wordIdFromBlockId } from './tallies'

export const TYPE_LABEL: Record<BankQuestionType, string> = {
  meaning: '選義',
  form: '選詞',
  cloze: '填空',
  family: '詞族',
  collocation: '搭配',
  synonym: '同義',
  native: '中英',
  spell: '拼字',
}

export const TYPE_ORDER: BankQuestionType[] = [
  'meaning',
  'form',
  'cloze',
  'family',
  'collocation',
  'synonym',
  'native',
  'spell',
]

export { SPELL_AFTER, canSpellWord, isNewWord, wordHitCount } from '../hits'

export type GroupStats = {
  total: number
  seen: number
  unseen: number
  correct: number
  wrong: number
  leech: number
  stable: number
  attempts: number
  accuracy: number | null
}

let allBlocksCache: QuestionBlock[] | null = null

export function allQuestionBlocks(): QuestionBlock[] {
  allBlocksCache ??= blocksForPile(allWords)
  return allBlocksCache
}

export function summarize(blocks: QuestionBlock[], tallies: Record<string, BlockTally>): GroupStats {
  let seen = 0
  let correct = 0
  let wrong = 0
  let leech = 0
  let stable = 0
  for (const block of blocks) {
    const tally = tallies[block.id]
    if (!tally || tally.seen === 0) continue
    seen += 1
    correct += tally.correct
    wrong += tally.wrong
    if (tally.consecutiveWrong >= 2) leech += 1
    else if (tally.lastCorrect === true && tally.wrong === 0) stable += 1
  }
  const total = blocks.length
  const attempts = correct + wrong
  return {
    total,
    seen,
    unseen: total - seen,
    correct,
    wrong,
    leech,
    stable,
    attempts,
    accuracy: attempts > 0 ? correct / attempts : null,
  }
}

export function formatAccuracy(value: number | null): string {
  if (value === null) return '—'
  return `${Math.round(value * 100)}%`
}

export function sublistBlocks(sublist: number): QuestionBlock[] {
  return blocksForPile(getSublistWords(sublist))
}

export function wordBlocks(word: WordCard): QuestionBlock[] {
  return blocksForWord(word)
}

export function practiceGameCount(bank: ProgressState['bank']): number {
  return Object.entries(bank).reduce((sum, [key, scope]) => {
    if (key === 'endless' || key.startsWith('full:')) return sum
    return sum + (scope.gameIndex ?? 0)
  }, 0)
}

export function weakestWords(
  blocks: QuestionBlock[],
  tallies: Record<string, BlockTally>,
  resolveWord: (id: string) => WordCard | undefined,
  limit = 8,
): { word: WordCard; stats: GroupStats }[] {
  const grouped = new Map<string, QuestionBlock[]>()
  for (const block of blocks) {
    const list = grouped.get(block.wordId)
    if (list) list.push(block)
    else grouped.set(block.wordId, [block])
  }
  const ranked: { word: WordCard; stats: GroupStats }[] = []
  for (const [wordId, wordBlocks] of grouped) {
    const word = resolveWord(wordId)
    if (!word) continue
    const stats = summarize(wordBlocks, tallies)
    if (stats.seen === 0 || stats.wrong === 0) continue
    ranked.push({ word, stats })
  }
  ranked.sort((a, b) => {
    if (b.stats.wrong !== a.stats.wrong) return b.stats.wrong - a.stats.wrong
    return (a.stats.accuracy ?? 1) - (b.stats.accuracy ?? 1)
  })
  return ranked.slice(0, limit)
}

export function blockStatus(tally: BlockTally | undefined): string {
  if (!tally || tally.seen === 0) return '未做'
  if (tally.consecutiveWrong >= 2) return '連錯'
  if (tally.lastCorrect === false) return '上次錯'
  if (tally.lastCorrect === true && tally.wrong === 0) return '全對'
  if (tally.lastCorrect === true) return '上次對'
  return `做過 ${tally.seen}`
}

export type BlockView = {
  id: string
  shortId: string
  type: BankQuestionType
  typeLabel: string
  format: '選擇' | '配對' | '打字'
  subtype: string
  stem: string
  answer: string
}

function clip(text: string, max = 88): string {
  const one = text.replace(/\s+/g, ' ').trim()
  if (one.length <= max) return one
  return `${one.slice(0, max - 1)}…`
}

function pairSubtype(type: BankQuestionType): string {
  if (type === 'collocation') return '搭配配對'
  if (type === 'synonym') return '同義配對'
  if (type === 'native') return '中英配對'
  return TYPE_LABEL[type]
}

function mcqSubtype(block: QuestionBlock): string {
  const hint = block.hint ?? ''
  if (block.type === 'meaning') {
    if (hint.includes('英文')) return '英文釋義'
    if (hint.includes('較短')) return '短義'
    if (hint.includes('詞族')) return '詞族意思'
    if ((block.prompt ?? '').includes('這句')) return '例句意思'
    return '中文意思'
  }
  if (block.type === 'form') {
    if (hint.includes('例句')) return '例句形式'
    if (hint.includes('接近')) return '近義選詞'
    if (hint.includes('headword') || hint.includes('英文 headword')) return '短義選詞'
    if (hint.includes('學術詞')) return '英義選詞'
    return '中譯選詞'
  }
  if (block.type === 'cloze') {
    if (hint.includes('詞族')) return '詞族填空'
    if (hint.includes('搭配')) return '搭配填空'
    if (hint.includes('同義')) return '同義填空'
    return '語境填空'
  }
  if (block.type === 'family') {
    const role = /「(.+?)」/.exec(hint)?.[1]
    return role ? `詞族 · ${role}` : '詞族形式'
  }
  return hint || TYPE_LABEL[block.type]
}

export function describeBlock(block: QuestionBlock): BlockView {
  const index = block.id.split(':').at(-1) ?? '0'
  const shortId = `${block.type}-${index}`
  if (block.kind === 'pair' && block.pair) {
    return {
      id: block.id,
      shortId,
      type: block.type,
      typeLabel: TYPE_LABEL[block.type],
      format: '配對',
      subtype: pairSubtype(block.type),
      stem: block.pair.left,
      answer: block.pair.right,
    }
  }
  if (block.kind === 'type' || block.type === 'spell') {
    return {
      id: block.id,
      shortId,
      type: block.type,
      typeLabel: TYPE_LABEL[block.type],
      format: '打字',
      subtype: block.hint?.includes('英文釋義') ? '看英義拼寫' : '看中文拼寫',
      stem: clip(block.prompt ?? ''),
      answer: clip(block.answer ?? '', 64),
    }
  }
  return {
    id: block.id,
    shortId,
    type: block.type,
    typeLabel: TYPE_LABEL[block.type],
    format: '選擇',
    subtype: mcqSubtype(block),
    stem: clip(block.prompt ?? ''),
    answer: clip(block.answer ?? '', 64),
  }
}

export function blockPreview(block: QuestionBlock): string {
  const view = describeBlock(block)
  return `${view.subtype} · ${view.stem}`
}

export function formatSeenAgo(at: number | undefined): string {
  if (!at) return '很久沒練'
  const hours = Math.max(1, Math.round((Date.now() - at) / 3_600_000))
  if (hours < 24) return `${hours} 小時沒練`
  const days = Math.round(hours / 24)
  return `${days} 天沒練`
}
