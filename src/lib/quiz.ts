import type { Collocation, MatchQuestion, McqQuestion, Question, WordCard } from '../types'
import { escapeRegExp, pickN, shuffle } from './shuffle'

const LESSON_LENGTH = 12

function distractors(correct: WordCard, pool: WordCard[], count: number): WordCard[] {
  const others = pool.filter((word) => word.id !== correct.id)
  return pickN(others, count)
}

export function uniqueOptions(answer: string, extras: string[]): string[] {
  const seen = new Set<string>([answer.toLowerCase()])
  const options = [answer]
  for (const extra of extras) {
    const key = extra.toLowerCase()
    if (seen.has(key) || extra.trim() === '') continue
    seen.add(key)
    options.push(extra)
    if (options.length >= 4) break
  }
  return shuffle(options)
}

export function toCloze(sentence: string, blank: string): string {
  const pattern = new RegExp(`\\b${escapeRegExp(blank)}\\b`, 'i')
  if (pattern.test(sentence)) {
    return sentence.replace(pattern, '______')
  }
  const idx = sentence.toLowerCase().indexOf(blank.toLowerCase())
  if (idx >= 0) {
    return `${sentence.slice(0, idx)}______${sentence.slice(idx + blank.length)}`
  }
  return sentence
}

function meaningQuestion(word: WordCard, pool: WordCard[]): McqQuestion {
  const options = uniqueOptions(
    word.glossZh,
    distractors(word, pool, 8).map((item) => item.glossZh),
  )
  return {
    type: 'meaning',
    wordId: word.id,
    prompt: word.headword,
    hint: '選出中文意思',
    speak: word.headword,
    options,
    answer: word.glossZh,
  }
}

function formQuestion(word: WordCard, pool: WordCard[]): McqQuestion {
  const options = uniqueOptions(
    word.headword,
    distractors(word, pool, 8).map((item) => item.headword),
  )
  return {
    type: 'form',
    wordId: word.id,
    prompt: word.glossZh,
    hint: word.glossEn,
    options,
    answer: word.headword,
  }
}

function clozeQuestion(word: WordCard, pool: WordCard[]): McqQuestion {
  const answer = word.example.blank
  const options = uniqueOptions(
    answer,
    distractors(word, pool, 8).map((item) => item.example.blank || item.headword),
  )
  return {
    type: 'cloze',
    wordId: word.id,
    prompt: toCloze(word.example.en, answer),
    hint: '語境填空',
    speak: word.example.en,
    options,
    answer,
  }
}

function familyQuestion(word: WordCard, pool: WordCard[]): McqQuestion | null {
  const quiz = word.familyQuiz
  if (!quiz) return null
  const familyForms = word.family.map((item) => item.form)
  const extras = familyForms.filter((form) => form.toLowerCase() !== quiz.blank.toLowerCase())
  if (extras.length === 0) {
    extras.push(
      ...distractors(word, pool, 3).map((item) => item.headword),
    )
  }
  while (extras.length < 3) {
    const filler = distractors(word, pool, 1)[0]
    if (!filler) break
    extras.push(filler.headword)
  }
  return {
    type: 'family',
    wordId: word.id,
    prompt: quiz.sentence.includes('{blank}')
      ? quiz.sentence.replaceAll('{blank}', '______')
      : toCloze(quiz.sentence, quiz.blank),
    hint: `詞族：選「${quiz.role}」形式`,
    options: uniqueOptions(quiz.blank, extras),
    answer: quiz.blank,
  }
}

function uniquePairs(pairs: Collocation[]): Collocation[] {
  const usedLeft = new Set<string>()
  const usedRight = new Set<string>()
  const next: Collocation[] = []
  for (const pair of pairs) {
    const left = pair.left.trim()
    const right = pair.right.trim()
    if (!left || !right) continue
    if (usedLeft.has(left.toLowerCase()) || usedRight.has(right.toLowerCase())) continue
    usedLeft.add(left.toLowerCase())
    usedRight.add(right.toLowerCase())
    next.push({ left, right })
  }
  return next
}

function collocationQuestion(words: WordCard[]): MatchQuestion | null {
  const pairs = uniquePairs(words.flatMap((word) => word.collocations))
  if (pairs.length < 3) return null
  const chosen = pickN(pairs, Math.min(5, pairs.length))
  const wordIds = words
    .filter((word) =>
      word.collocations.some((col) =>
        chosen.some((pair) => pair.left === col.left && pair.right === col.right),
      ),
    )
    .map((word) => word.id)
  return {
    type: 'collocation',
    wordIds,
    prompt: '配對學術搭配',
    pairs: chosen,
  }
}

export function buildLessonQuestions(words: WordCard[]): Question[] {
  if (words.length === 0) return []
  const order = shuffle(words)
  const questions: Question[] = []
  const used = new Set<string>()

  const take = (
    count: number,
    kind: string,
    make: (word: WordCard) => Question | null,
  ) => {
    let added = 0
    for (const word of order) {
      if (questions.length >= LESSON_LENGTH) break
      const key = `${kind}-${word.id}`
      if (used.has(key)) continue
      const question = make(word)
      if (!question) continue
      questions.push(question)
      used.add(key)
      added += 1
      if (added >= count) break
    }
  }

  take(3, 'meaning', (word) => meaningQuestion(word, words))
  take(3, 'form', (word) => formQuestion(word, words))
  take(3, 'cloze', (word) => clozeQuestion(word, words))
  take(2, 'family', (word) => familyQuestion(word, words))

  const matching = collocationQuestion(words)
  if (matching && questions.length < LESSON_LENGTH) {
    questions.push(matching)
  }

  for (const word of order) {
    if (questions.length >= LESSON_LENGTH) break
    questions.push(meaningQuestion(word, words))
  }

  return shuffle(questions).slice(0, LESSON_LENGTH)
}

export function buildReviewQuestions(words: WordCard[]): Question[] {
  const unique = [...new Map(words.map((word) => [word.id, word])).values()]
  const subset = pickN(unique, Math.min(8, unique.length))
  const questions: Question[] = []
  for (const word of subset) {
    questions.push(meaningQuestion(word, unique))
    if (questions.length >= 8) break
    questions.push(clozeQuestion(word, unique))
    if (questions.length >= 8) break
  }
  return questions.slice(0, 8)
}

export function questionWordIds(question: Question): string[] {
  if (isMatchQuestion(question)) return question.wordIds
  return [question.wordId]
}

export function isMatchQuestion(
  question: Question,
): question is Extract<Question, { pairs: unknown }> {
  return question.type === 'collocation' || question.type === 'synonym' || question.type === 'native'
}

export function questionBlockIds(question: Question): string[] {
  if (isMatchQuestion(question)) return question.blockIds ?? []
  return question.blockId ? [question.blockId] : []
}

export function matchPrompt(type: 'collocation' | 'synonym' | 'native'): string {
  if (type === 'synonym') return '配對同義詞'
  if (type === 'native') return '配對中文意思'
  return '配對學術搭配'
}
