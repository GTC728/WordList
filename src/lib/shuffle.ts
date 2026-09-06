export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const current = next[i]
    const swap = next[j]
    if (current === undefined || swap === undefined) continue
    next[i] = swap
    next[j] = current
  }
  return next
}

export function pickN<T>(items: T[], count: number, rng: () => number = Math.random): T[] {
  return shuffle(items, rng).slice(0, Math.max(0, count))
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
