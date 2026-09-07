import { useEffect } from 'react'
import type { WordCard } from '../types'
import { speak } from '../lib/speech'
import { SpeakButton } from './ui'

export function WordIntro({
  word,
  speech,
  onContinue,
}: {
  word: WordCard
  speech: boolean
  onContinue: () => void
}) {
  useEffect(() => {
    speak(word.headword, speech)
  }, [word.headword, speech])

  return (
    <section className="word-intro">
      <div className="prompt-row">
        <h2 className="prompt word-intro-head">{word.headword}</h2>
        <SpeakButton text={word.headword} enabled={speech} />
      </div>
      <p className="example">{word.example.en}</p>
      <button type="button" className="primary" onClick={onContinue}>
        開始
      </button>
    </section>
  )
}
