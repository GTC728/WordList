import synonymsJson from './courses/awl/synonyms.json'
import sub01 from './courses/awl/sublist-01.json'
import sub02 from './courses/awl/sublist-02.json'
import sub03 from './courses/awl/sublist-03.json'
import sub04 from './courses/awl/sublist-04.json'
import sub05 from './courses/awl/sublist-05.json'
import sub06 from './courses/awl/sublist-06.json'
import sub07 from './courses/awl/sublist-07.json'
import sub08 from './courses/awl/sublist-08.json'
import sub09 from './courses/awl/sublist-09.json'
import sub10 from './courses/awl/sublist-10.json'
import type { WordCard } from '../types'
import { WORDS_PER_LESSON } from './meta'

export {
  COURSE_ID,
  WORDS_PER_LESSON,
  courseMeta,
  getLessonCount,
  lessonId,
  lessonScopeId,
  parseLessonId,
  sublistScopeId,
  totalLessons,
} from './meta'

const ROLE_ORDER = ['動詞', '名詞', '形容詞', '副詞']

function sortFamily(card: WordCard): WordCard {
  const family = [...card.family].sort((a, b) => {
    const ai = ROLE_ORDER.indexOf(a.role)
    const bi = ROLE_ORDER.indexOf(b.role)
    return (ai === -1 ? 9 : ai) - (bi === -1 ? 9 : bi)
  })
  return { ...card, family }
}

const lists = [sub01, sub02, sub03, sub04, sub05, sub06, sub07, sub08, sub09, sub10] as WordCard[][]

export const allWords: WordCard[] = lists.flat().map(sortFamily)

const byId = new Map(allWords.map((word) => [word.id, word]))

export function getWord(id: string): WordCard | undefined {
  return byId.get(id)
}

export function getSublistWords(sublist: number): WordCard[] {
  return allWords.filter((word) => word.sublist === sublist)
}

export function getLessonWords(sublist: number, lessonIndex: number): WordCard[] {
  const words = getSublistWords(sublist)
  const start = lessonIndex * WORDS_PER_LESSON
  return words.slice(start, start + WORDS_PER_LESSON)
}

const synonymMap = synonymsJson as Record<string, string[]>

export function getSynonyms(wordId: string): string[] {
  return synonymMap[wordId] ?? []
}

export function getScopeWords(scopeId: string): WordCard[] {
  if (scopeId === 'awl-all') return allWords
  const lesson = /^awl-lesson-(\d+)-(\d+)$/.exec(scopeId)
  if (lesson) return getLessonWords(Number(lesson[1]), Number(lesson[2]))
  const sub = /^awl-sub-(\d+)$/.exec(scopeId)
  if (sub) return getSublistWords(Number(sub[1]))
  return []
}

export function describeScope(scopeId: string): { title: string; detail: string; backTo: string } {
  if (scopeId === 'awl-all') {
    return {
      title: '全部',
      detail: '從全部單詞的題塊裡抽題。答對的題塊五局之內不會再出。',
      backTo: '/practice',
    }
  }
  const lesson = /^awl-lesson-(\d+)-(\d+)$/.exec(scopeId)
  if (lesson) {
    const sublist = Number(lesson[1])
    const index = Number(lesson[2])
    return {
      title: `${sublist} · ${index + 1}`,
      detail: '這一堆 10 個 headword，從各詞自己的題塊裡抽題。',
      backTo: `/course/awl/sublist/${sublist}`,
    }
  }
  const sub = /^awl-sub-(\d+)$/.exec(scopeId)
  if (sub) {
    return {
      title: String(sub[1]),
      detail: '這一堆是整層詞，適合混著練。',
      backTo: `/course/awl/sublist/${sub[1]}`,
    }
  }
  return { title: '練習', detail: '', backTo: '/practice' }
}
