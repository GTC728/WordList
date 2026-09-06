import type { BankScopeState, ProgressState, SrsCard } from '../types'
import { applyBlockResult } from './bank/scheduler'
import { persistEnvelope, readLocalEnvelope, toEnvelope } from './persist'
import { createSrs, isDue, reviewSrs } from './srs'

export function emptyProgress(): ProgressState {
  return {
    completedLessons: [],
    lessonScores: {},
    srs: {},
    bank: {},
    settings: { speech: true },
  }
}

export function normalizeProgress(parsed: Partial<ProgressState> | null | undefined): ProgressState {
  return {
    ...emptyProgress(),
    ...parsed,
    settings: { speech: parsed?.settings?.speech !== false },
    completedLessons: parsed?.completedLessons ?? [],
    lessonScores: parsed?.lessonScores ?? {},
    srs: parsed?.srs ?? {},
    bank: parsed?.bank ?? {},
  }
}

export function loadProgress(): ProgressState {
  const envelope = readLocalEnvelope()
  if (!envelope) return emptyProgress()
  const progress = normalizeProgress(envelope.progress)
  if (envelope.savedAt === 0) {
    void persistEnvelope(toEnvelope(progress))
  }
  return progress
}

export function saveProgress(state: ProgressState): void {
  void persistEnvelope(toEnvelope(state))
}

export function resetProgress(): ProgressState {
  const next = emptyProgress()
  void persistEnvelope(toEnvelope(next), { lastExportAt: null })
  return next
}

export function completeLesson(
  state: ProgressState,
  lessonKey: string,
  correct: number,
  total: number,
  wordResults: { wordId: string; correct: boolean }[],
): ProgressState {
  const srs = { ...state.srs }
  for (const result of wordResults) {
    const current = srs[result.wordId] ?? createSrs(result.wordId)
    srs[result.wordId] = reviewSrs(current, result.correct)
  }

  const completed = state.completedLessons.includes(lessonKey)
    ? state.completedLessons
    : [...state.completedLessons, lessonKey]

  const next: ProgressState = {
    ...state,
    completedLessons: completed,
    lessonScores: {
      ...state.lessonScores,
      [lessonKey]: { correct, total, at: Date.now() },
    },
    srs,
  }
  saveProgress(next)
  return next
}

export function addToReview(state: ProgressState, wordIds: string[]): ProgressState {
  const srs = { ...state.srs }
  const now = Date.now()
  for (const wordId of wordIds) {
    const current = srs[wordId] ?? createSrs(wordId, now)
    srs[wordId] = { ...current, due: now }
  }
  const next = { ...state, srs }
  saveProgress(next)
  return next
}

export function applyReview(
  state: ProgressState,
  wordResults: { wordId: string; correct: boolean }[],
): ProgressState {
  const srs = { ...state.srs }
  for (const result of wordResults) {
    const current = srs[result.wordId] ?? createSrs(result.wordId)
    srs[result.wordId] = reviewSrs(current, result.correct)
  }
  const next = { ...state, srs }
  saveProgress(next)
  return next
}

export function dueCards(state: ProgressState, now = Date.now()): SrsCard[] {
  return Object.values(state.srs).filter((card) => isDue(card, now))
}

export function setSpeech(state: ProgressState, speech: boolean): ProgressState {
  const next = { ...state, settings: { ...state.settings, speech } }
  saveProgress(next)
  return next
}

export function applyBankGame(
  state: ProgressState,
  scopeId: string,
  results: { blockId: string; correct: boolean }[],
): ProgressState {
  const scope: BankScopeState = state.bank[scopeId] ?? { gameIndex: 0, stats: {} }
  const gameIndex = scope.gameIndex
  const stats = { ...scope.stats }
  for (const result of results) {
    stats[result.blockId] = applyBlockResult(stats, result.blockId, gameIndex, result.correct)
  }
  const next: ProgressState = {
    ...state,
    bank: {
      ...state.bank,
      [scopeId]: {
        gameIndex: gameIndex + 1,
        stats,
      },
    },
  }
  saveProgress(next)
  return next
}

export function bankScope(state: ProgressState, scopeId: string): BankScopeState {
  return state.bank[scopeId] ?? { gameIndex: 0, stats: {} }
}

export function isLessonUnlocked(
  completedLessons: string[],
  sublist: number,
  lessonIndex: number,
): boolean {
  if (lessonIndex <= 0) return true
  return completedLessons.includes(`awl-${sublist}-${lessonIndex - 1}`)
}
