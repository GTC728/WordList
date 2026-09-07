import metaJson from './courses/awl/meta.json'
import type { CourseMeta } from '../types'

export const courseMeta = metaJson as CourseMeta
export const WORDS_PER_LESSON = 10
export const COURSE_ID = 'awl'

export function getLessonCount(sublist: number): number {
  const meta = courseMeta.sublists.find((item) => item.n === sublist)
  return meta?.lessonCount ?? 0
}

export function totalLessons(): number {
  return courseMeta.sublists.reduce((sum, item) => sum + item.lessonCount, 0)
}

export function lessonId(sublist: number, lessonIndex: number): string {
  return `${COURSE_ID}-${sublist}-${lessonIndex}`
}

export function parseLessonId(id: string): { sublist: number; lessonIndex: number } | null {
  const match = /^awl-(\d+)-(\d+)$/.exec(id)
  if (!match) return null
  return { sublist: Number(match[1]), lessonIndex: Number(match[2]) }
}

export function lessonScopeId(sublist: number, lessonIndex: number): string {
  return `awl-lesson-${sublist}-${lessonIndex}`
}

export function sublistScopeId(sublist: number): string {
  return `awl-sub-${sublist}`
}
