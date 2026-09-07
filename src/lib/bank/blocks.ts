import { getSynonyms } from '../../data/course'
import { toCloze, uniqueOptions } from '../quiz'
import type {
  BankQuestionType,
  DistractorField,
  McqQuestion,
  QuestionBlock,
  TypeQuestion,
  WordCard,
} from '../../types'

const PER_TYPE = 5

function cap(blocks: QuestionBlock[], type: BankQuestionType): QuestionBlock[] {
  return blocks.filter((item) => item.type === type).slice(0, PER_TYPE)
}

function glossParts(gloss: string): string[] {
  return gloss
    .split(/[；;、]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function uniquePairs(items: QuestionBlock[]): QuestionBlock[] {
  const seen = new Set<string>()
  const next: QuestionBlock[] = []
  for (const item of items) {
    if (item.kind !== 'pair' || !item.pair) continue
    const key = `${item.pair.left.toLowerCase()}::${item.pair.right.toLowerCase()}`
    if (seen.has(key) || item.pair.left.toLowerCase() === item.pair.right.toLowerCase()) continue
    seen.add(key)
    next.push(item)
  }
  return next
}

function buildForWord(word: WordCard): QuestionBlock[] {
  const id = word.id
  const synonyms = getSynonyms(id).filter(
    (item) => item.toLowerCase() !== word.headword.toLowerCase(),
  )
  const familyForms = word.family.map((item) => item.form)
  const noun = word.family.find((item) => item.role === '名詞')
  const adj = word.family.find((item) => item.role === '形容詞')
  const parts = glossParts(word.glossZh)
  const raw: QuestionBlock[] = []

  const mcq = (
    type: BankQuestionType,
    index: number,
    fields: Omit<QuestionBlock, 'id' | 'type' | 'wordId' | 'kind'>,
  ) => {
    raw.push({
      id: `${id}:${type}:${index}`,
      type,
      wordId: id,
      kind: 'mcq',
      ...fields,
    })
  }

  const typed = (
    type: BankQuestionType,
    index: number,
    fields: Omit<QuestionBlock, 'id' | 'type' | 'wordId' | 'kind'>,
  ) => {
    raw.push({
      id: `${id}:${type}:${index}`,
      type,
      wordId: id,
      kind: 'type',
      ...fields,
    })
  }

  const pair = (
    type: BankQuestionType,
    index: number,
    left: string,
    right: string,
  ) => {
    raw.push({
      id: `${id}:${type}:${index}`,
      type,
      wordId: id,
      kind: 'pair',
      pair: { left, right },
    })
  }

  mcq('meaning', 0, {
    prompt: word.headword,
    hint: '選出中文意思',
    speak: word.headword,
    answer: word.glossZh,
    distractorField: 'glossZh',
  })
  if (parts[0] && parts[0] !== word.glossZh) {
    mcq('meaning', 1, {
      prompt: word.headword,
      hint: '選出較短的中文意思',
      speak: word.headword,
      answer: parts[0],
      distractorField: 'glossZh',
    })
  }
  mcq('meaning', 2, {
    prompt: word.headword,
    hint: '選出英文釋義',
    speak: word.headword,
    answer: word.glossEn,
    distractorField: 'glossEn',
  })
  if (noun && noun.form !== word.headword) {
    mcq('meaning', 3, {
      prompt: noun.form,
      hint: '這個詞族形式是什麼意思？',
      speak: noun.form,
      answer: word.glossZh,
      distractorField: 'glossZh',
    })
  }
  mcq('meaning', 4, {
    prompt: `這句在談哪個意思？\n${word.example.en}`,
    hint: '選出中文意思',
    speak: word.example.en,
    answer: word.glossZh,
    distractorField: 'glossZh',
  })

  mcq('form', 0, {
    prompt: word.glossZh,
    hint: word.glossEn,
    answer: word.headword,
    distractorField: 'headword',
  })
  mcq('form', 1, {
    prompt: word.glossEn,
    hint: '選出對應的學術詞',
    answer: word.headword,
    distractorField: 'headword',
  })
  if (word.example.blank && word.example.blank.toLowerCase() !== word.headword.toLowerCase()) {
    mcq('form', 2, {
      prompt: word.glossZh,
      hint: '選出例句裡實際出現的形式',
      answer: word.example.blank,
      distractorField: 'blank',
    })
  }
  if (synonyms[0]) {
    mcq('form', 3, {
      prompt: synonyms[0],
      hint: '哪個 AWL 詞與它最接近？',
      speak: synonyms[0],
      answer: word.headword,
      distractorField: 'headword',
    })
  }
  if (parts[0]) {
    mcq('form', 4, {
      prompt: parts[0],
      hint: '選出英文 headword',
      answer: word.headword,
      distractorField: 'headword',
    })
  }

  mcq('cloze', 0, {
    prompt: toCloze(word.example.en, word.example.blank),
    hint: '語境填空',
    speak: word.example.en,
    answer: word.example.blank,
    distractorField: 'blank',
  })
  if (word.familyQuiz) {
    const quiz = word.familyQuiz
    mcq('cloze', 1, {
      prompt: quiz.sentence.includes('{blank}')
        ? quiz.sentence.replaceAll('{blank}', '______')
        : toCloze(quiz.sentence, quiz.blank),
      hint: '詞族句填空',
      answer: quiz.blank,
      distractorField: 'blank',
    })
  }
  word.collocations.slice(0, 2).forEach((item, index) => {
    const sentence = `The paper ${item.left} ${item.right} in the results chapter.`
    mcq('cloze', 2 + index, {
      prompt: toCloze(sentence, item.right),
      hint: '搭配填空',
      answer: item.right,
      distractorField: 'blank',
    })
  })
  if (synonyms[0]) {
    mcq('cloze', 4, {
      prompt: `In this paper the authors ${word.headword} the data; they also ${'______'} the same set.`,
      hint: '填入接近的同義詞',
      speak: word.headword,
      answer: synonyms[0],
      distractorField: 'synonym',
    })
  }

  if (word.familyQuiz) {
    const quiz = word.familyQuiz
    mcq('family', 0, {
      prompt: quiz.sentence.includes('{blank}')
        ? quiz.sentence.replaceAll('{blank}', '______')
        : toCloze(quiz.sentence, quiz.blank),
      hint: `詞族：選「${quiz.role}」形式`,
      answer: quiz.blank,
      optionPool: familyForms,
    })
  }
  word.family.forEach((item, index) => {
    if (item.form === word.familyQuiz?.blank) return
    mcq('family', index + 1, {
      prompt: word.headword,
      hint: `選出這個詞族的「${item.role}」`,
      speak: word.headword,
      answer: item.form,
      optionPool: familyForms,
    })
  })

  word.collocations.forEach((item, index) => {
    pair('collocation', index, item.left, item.right)
  })
  if (noun) {
    pair('collocation', word.collocations.length, 'academic', noun.form)
  }

  synonyms.forEach((item, index) => {
    pair('synonym', index, word.headword, item)
  })
  if (noun && synonyms[0] && noun.form !== word.headword) {
    pair('synonym', synonyms.length, noun.form, synonyms[0])
  }

  pair('native', 0, word.headword, word.glossZh)
  if (parts[0] && parts[0] !== word.glossZh) {
    pair('native', 1, word.headword, parts[0])
  }
  if (noun && noun.form !== word.headword) {
    pair('native', 2, noun.form, word.glossZh)
  }
  if (adj && adj.form !== word.headword) {
    pair('native', 3, adj.form, word.glossZh)
  }
  if (word.example.blank.toLowerCase() !== word.headword.toLowerCase()) {
    pair('native', 4, word.example.blank, word.glossZh)
  }

  typed('spell', 0, {
    prompt: word.glossZh,
    hint: '打出英文拼法',
    answer: word.headword,
  })
  typed('spell', 1, {
    prompt: word.glossEn,
    hint: '看英文釋義，打出拼法',
    answer: word.headword,
  })

  const types: BankQuestionType[] = [
    'meaning',
    'form',
    'cloze',
    'family',
    'collocation',
    'synonym',
    'native',
    'spell',
  ]
  return types.flatMap((type) => {
    const group = raw.filter((item) => item.type === type)
    const pairs = type === 'collocation' || type === 'synonym' || type === 'native'
      ? uniquePairs(group)
      : group
    return cap(pairs, type)
  })
}

const cache = new Map<string, QuestionBlock[]>()

export function blocksForWord(word: WordCard): QuestionBlock[] {
  const hit = cache.get(word.id)
  if (hit) return hit
  const built = buildForWord(word)
  cache.set(word.id, built)
  return built
}

export function blocksForPile(words: WordCard[]): QuestionBlock[] {
  return words.flatMap((word) => blocksForWord(word))
}

function fieldValue(word: WordCard, field: DistractorField): string {
  if (field === 'glossZh') return word.glossZh
  if (field === 'glossEn') return word.glossEn
  if (field === 'headword') return word.headword
  if (field === 'blank') return word.example.blank
  return getSynonyms(word.id)[0] ?? word.headword
}

export function materializeMcq(block: QuestionBlock, pile: WordCard[]): McqQuestion | null {
  if (block.kind !== 'mcq' || !block.answer || !block.prompt) return null
  if (
    block.type !== 'meaning' &&
    block.type !== 'form' &&
    block.type !== 'cloze' &&
    block.type !== 'family'
  ) {
    return null
  }
  let extras: string[] = []
  if (block.optionPool && block.optionPool.length > 0) {
    extras = block.optionPool.filter(
      (item) => item.toLowerCase() !== block.answer!.toLowerCase(),
    )
  } else {
    const field = block.distractorField ?? 'glossZh'
    extras = pile
      .filter((word) => word.id !== block.wordId)
      .map((word) => fieldValue(word, field))
  }
  const options = uniqueOptions(block.answer, extras)
  if (options.length < 2) return null
  return {
    type: block.type,
    wordId: block.wordId,
    blockId: block.id,
    prompt: block.prompt,
    hint: block.hint,
    speak: block.speak,
    options,
    answer: block.answer,
  }
}

export function materializeSpell(block: QuestionBlock): TypeQuestion | null {
  if (block.kind !== 'type' || block.type !== 'spell' || !block.answer || !block.prompt) return null
  return {
    type: 'spell',
    wordId: block.wordId,
    blockId: block.id,
    prompt: block.prompt,
    hint: block.hint,
    speak: block.speak,
    answer: block.answer,
  }
}

export function nativeMeaningQuestion(word: WordCard, pile: WordCard[]): McqQuestion | null {
  const block = blocksForWord(word).find((item) => item.id === `${word.id}:meaning:0`)
  return block ? materializeMcq(block, pile) : null
}
