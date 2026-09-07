import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AccentPreset, ProgressState, ThemeMode } from '../types'
import type { ProgressEnvelope } from './persist'
import { applyTheme } from './theme'
import { startSyncLoop } from './sync'
import {
  hydrateEnvelope,
  persistEnvelope,
  pickNewest,
  readLocalEnvelope,
  requestPersistentStorage,
} from './persist'
import {
  addToReview,
  applyBankGame,
  applyReview,
  completeLesson,
  loadProgress,
  normalizeProgress,
  resetProgress,
  setAppearance,
  setSpeech,
  toggleStars,
} from './progress'

type ProgressContextValue = {
  progress: ProgressState
  complete: (
    lessonKey: string,
    correct: number,
    total: number,
    wordResults: { wordId: string; correct: boolean }[],
    hitWordIds?: string[],
  ) => void
  review: (wordResults: { wordId: string; correct: boolean }[], hitWordIds?: string[]) => void
  queueReview: (wordIds: string[]) => void
  toggleSpeech: (value: boolean) => void
  setTheme: (theme: ThemeMode, accent: AccentPreset) => void
  finishBank: (scopeId: string, results: { blockId: string; correct: boolean }[]) => void
  toggleStars: (blockIds: string[]) => void
  replace: (next: ProgressState) => void
  reset: () => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())

  useEffect(() => applyTheme(progress.settings.theme, progress.settings.accent), [progress.settings.theme, progress.settings.accent])

  useEffect(() => startSyncLoop(), [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await requestPersistentStorage()
      const best = await hydrateEnvelope()
      if (cancelled) return
      const localNow = readLocalEnvelope()
      const winner = pickNewest(best, localNow)
      if (!winner) return
      const next = normalizeProgress(winner.progress)
      await persistEnvelope({ ...winner, progress: next })
      if (cancelled) return
      const latest = readLocalEnvelope()
      const apply = pickNewest(winner, latest)
      if (apply) setProgress(normalizeProgress(apply.progress))
    })()
    const onRemote = (event: Event) => {
      const envelope = (event as CustomEvent<ProgressEnvelope>).detail
      if (envelope?.progress) setProgress(normalizeProgress(envelope.progress))
    }
    window.addEventListener('wordlist-remote-progress', onRemote)
    return () => {
      cancelled = true
      window.removeEventListener('wordlist-remote-progress', onRemote)
    }
  }, [])

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      complete: (lessonKey, correct, total, wordResults, hitWordIds) => {
        setProgress(completeLesson(progress, lessonKey, correct, total, wordResults, hitWordIds))
      },
      review: (wordResults, hitWordIds) => {
        setProgress(applyReview(progress, wordResults, hitWordIds))
      },
      queueReview: (wordIds) => {
        setProgress(addToReview(progress, wordIds))
      },
      toggleSpeech: (speech) => {
        setProgress(setSpeech(progress, speech))
      },
      setTheme: (theme, accent) => {
        setProgress(setAppearance(progress, theme, accent))
      },
      finishBank: (scopeId, results) => {
        setProgress(applyBankGame(progress, scopeId, results))
      },
      toggleStars: (blockIds) => {
        setProgress((current) => toggleStars(current, blockIds))
      },
      replace: (next) => {
        setProgress(next)
      },
      reset: () => {
        setProgress(resetProgress())
      },
    }),
    [progress],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('ProgressProvider missing')
  return ctx
}
