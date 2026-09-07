export const SPELL_AFTER = 5

export function wordHitCount(wordId: string, hits: Record<string, number> | undefined): number {
  return hits?.[wordId] ?? 0
}

export function isNewWord(wordId: string, hits: Record<string, number> | undefined): boolean {
  return wordHitCount(wordId, hits) <= 0
}

export function canSpellWord(wordId: string, hits: Record<string, number> | undefined): boolean {
  return wordHitCount(wordId, hits) >= SPELL_AFTER
}
