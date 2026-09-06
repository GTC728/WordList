import type { AccentPreset, BankScopeState, FullRunState, ProgressState, SrsCard, ThemeMode } from '../types'
import { applyBlockResult } from './bank/scheduler'
import { persistEnvelope, readLocalEnvelope, toEnvelope } from './persist'
import { createSrs, isDue, reviewSrs } from './srs'

export function emptyProgress(): ProgressState {
  return {
    completedLessons: [],
    lessonScores: {},
    srs: {},
    bank: {},
    full: {},
    settings: { speech: true, theme: 'dark', accent: 'green' },
  }
}

export function normalizeProgress(parsed: Partial<ProgressState> | null | undefined): ProgressState {
  const theme = parsed?.settings?.theme
  const accent = parsed?.settings?.accent
  return {
    ...emptyProgress(),
    ...parsed,
    settings: {
      speech: parsed?.settings?.speech !== false,
      theme: theme === 'light' || theme === 'system' || theme === 'dark' ? theme : 'dark',
      accent: accent === 'blue' || accent === 'purple' || accent === 'green' ? accent : 'green',
    },
    completedLessons: parsed?.completedLessons ?? [],
    lessonScores: parsed?.lessonScores ?? {},
    srs: parsed?.srs ?? {},
    bank: parsed?.bank ?? {},
    full: parsed?.full ?? {},
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

export function setAppearance(
  state: ProgressState,
  theme: ThemeMode,
  accent: AccentPreset,
): ProgressState {
  const next = { ...state, settings: { ...state.settings, theme, accent } }
  saveProgress(next)
  return next
}

export function startFullRun(state: ProgressState, scopeId: string, order: FullRunState['order']): ProgressState {
  const run: FullRunState = { order, cursor: 0, answers: [], updatedAt: Date.now() }
  const next = { ...state, full: { ...state.full, [scopeId]: run } }
  saveProgress(next)
  return next
}

export function answerFullItem(state: ProgressState, scopeId: string, correct: boolean): ProgressState {
  const current = state.full[scopeId]
  if (!current) return state
  const answers = [...current.answers, correct]
  const cursor = current.cursor + 1
  const done = cursor >= current.order.length
  const run: FullRunState = {
    ...current,
    cursor,
    answers,
    updatedAt: Date.now(),
    finished: done
      ? { correct: answers.filter(Boolean).length, total: answers.length, at: Date.now() }
      : current.finished,
  }
  let nextState: ProgressState = { ...state, full: { ...state.full, [scopeId]: run } }
  if (done) {
    const results = current.order.flatMap((item, index) => {
      const ok = answers[index]
      const ids = item.k === 'mcq' ? [item.id] : item.ids
      return ids.map((blockId) => ({ blockId, correct: ok }))
    })
    nextState = applyBankGame(nextState, `full:${scopeId}`, results)
  } else {
    saveProgress(nextState)
  }
  return nextState
}

export function clearFullRun(state: ProgressState, scopeId: string): ProgressState {
  const full = { ...state.full }
  delete full[scopeId]
  const next = { ...state, full }
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
