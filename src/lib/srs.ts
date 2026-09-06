import type { SrsCard } from '../types'

const DAY = 24 * 60 * 60 * 1000

export function startOfDay(at = Date.now()): number {
  const date = new Date(at)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function createSrs(wordId: string, due = Date.now()): SrsCard {
  return {
    wordId,
    ease: 2.5,
    interval: 0,
    reps: 0,
    due,
  }
}

export function reviewSrs(card: SrsCard, correct: boolean, now = Date.now()): SrsCard {
  if (!correct) {
    return {
      ...card,
      reps: 0,
      interval: 1,
      ease: Math.max(1.3, card.ease - 0.2),
      due: now + DAY,
    }
  }

  const ease = Math.min(3.2, card.ease + 0.1)
  let interval = 1
  if (card.reps === 0) interval = 1
  else if (card.reps === 1) interval = 3
  else interval = Math.max(4, Math.round(card.interval * ease))

  return {
    ...card,
    ease,
    interval,
    reps: card.reps + 1,
    due: now + interval * DAY,
  }
}

export function isDue(card: SrsCard, now = Date.now()): boolean {
  return card.due <= now
}
