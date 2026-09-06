import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ProgressState } from '../types'
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
  setSpeech,
} from './progress'

type ProgressContextValue = {
  progress: ProgressState
  complete: (
    lessonKey: string,
    correct: number,
    total: number,
    wordResults: { wordId: string; correct: boolean }[],
  ) => void
  review: (wordResults: { wordId: string; correct: boolean }[]) => void
  queueReview: (wordIds: string[]) => void
  toggleSpeech: (value: boolean) => void
  finishBank: (scopeId: string, results: { blockId: string; correct: boolean }[]) => void
  replace: (next: ProgressState) => void
  reset: () => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())

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
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      complete: (lessonKey, correct, total, wordResults) => {
        setProgress(completeLesson(progress, lessonKey, correct, total, wordResults))
      },
      review: (wordResults) => {
        setProgress(applyReview(progress, wordResults))
      },
      queueReview: (wordIds) => {
        setProgress(addToReview(progress, wordIds))
      },
      toggleSpeech: (speech) => {
        setProgress(setSpeech(progress, speech))
      },
      finishBank: (scopeId, results) => {
        setProgress(applyBankGame(progress, scopeId, results))
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
