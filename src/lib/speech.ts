export function speak(text: string, enabled: boolean): void {
  if (!enabled || !text || typeof window === 'undefined') return
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-GB'
  utterance.rate = 0.92
  window.speechSynthesis.speak(utterance)
}
