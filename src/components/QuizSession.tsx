import { useState } from 'react'
import { MatchBoard } from './MatchBoard'
import { ProgressBar, SpeakButton } from './ui'
import { SpellForm } from './SpellForm'
import { StarButton } from './StarButton'
import { WordBody } from './WordBody'
import { WordIntro } from './WordIntro'
import { getWord } from '../data/course'
import { isNewWord } from '../lib/hits'
import { answersMatch, isMatchQuestion, isTypeQuestion, questionBlockIds, questionWordIds } from '../lib/quiz'
import type { Question, WordCard } from '../types'

export type ItemResult = { question: Question; correct: boolean }

export function QuizSession({
  questions,
  speech,
  onFinished,
  wordHits = {},
}: {
  questions: Question[]
  speech: boolean
  onFinished: (results: ItemResult[]) => void
  wordHits?: Record<string, number>
}) {
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<ItemResult[]>([])
  const [picked, setPicked] = useState<string | null>(null)
  const [seenIntro, setSeenIntro] = useState<string[]>([])
  const question = questions[index]
  const answered = results.length > index

  if (!question) return <p>沒有題目。</p>

  const introId =
    !isMatchQuestion(question) &&
    isNewWord(question.wordId, wordHits) &&
    !seenIntro.includes(question.wordId)
      ? question.wordId
      : null
  const introWord = introId ? getWord(introId) : undefined

  function commit(correct: boolean) {
    if (answered) return
    setResults((current) => [...current, { question, correct }])
  }

  function next() {
    if (index + 1 >= questions.length) {
      onFinished(results)
      return
    }
    setPicked(null)
    setIndex((value) => value + 1)
  }

  const last = results[index]
  const showFeedback = answered

  return (
    <div className="lesson">
      <div className="lesson-top">
        <ProgressBar value={index} max={questions.length} />
        <span className="count">
          {index + 1}/{questions.length}
        </span>
      </div>

      {introWord ? (
        <WordIntro
          word={introWord}
          speech={speech}
          onContinue={() => {
            setSeenIntro((current) =>
              current.includes(introWord.id) ? current : [...current, introWord.id],
            )
          }}
        />
      ) : isMatchQuestion(question) ? (
        <>
          <p className="hint">{question.prompt}</p>
          <MatchBoard
            pairs={question.pairs}
            disabled={answered}
            onDone={(perfect) => commit(perfect)}
          />
        </>
      ) : isTypeQuestion(question) ? (
        <>
          <p className="hint">{question.hint}</p>
          <div className="prompt-row">
            <h2 className="prompt">{question.prompt}</h2>
          </div>
          <SpellForm
            key={index}
            disabled={answered}
            onSubmit={(value) => commit(answersMatch(value, question.answer))}
          />
        </>
      ) : (
        <>
          <p className="hint">{question.hint}</p>
          <div className="prompt-row">
            <h2 className="prompt">{question.prompt}</h2>
            {question.speak && <SpeakButton text={question.speak} enabled={speech} />}
          </div>
          <div className="options">
            {question.options.map((option) => {
              const isAnswer = option === question.answer
              const isPick = option === picked
              let cls = 'opt'
              if (picked) {
                if (isAnswer) cls += ' opt-ok'
                else if (isPick) cls += ' opt-bad'
              }
              return (
                <button
                  key={option}
                  type="button"
                  className={cls}
                  disabled={Boolean(picked)}
                  onClick={() => {
                    if (picked) return
                    setPicked(option)
                    commit(option === question.answer)
                  }}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </>
      )}

      {!introWord && showFeedback && last && (
        <section className={`feedback ${last.correct ? 'ok' : 'bad'}`}>
          {isMatchQuestion(question) ? (
            <p>{last.correct ? '全對' : '配錯'}</p>
          ) : (
            <p>{last.correct ? '正確' : `答案：${question.answer}`}</p>
          )}
          {questionWordIds(question).map((id) => {
            const word = getWord(id)
            return word ? <WordBody key={id} word={word} speech={speech} /> : null
          })}
          <div className="feedback-tools">
            <StarButton blockIds={questionBlockIds(question)} />
          </div>
          <button type="button" className="primary" onClick={next}>
            {index + 1 >= questions.length ? '看結果' : '下一題'}
          </button>
        </section>
      )}
    </div>
  )
}

export function scoreWordResults(results: ItemResult[]): { wordId: string; correct: boolean }[] {
  const scores = new Map<string, { hit: number; total: number }>()
  for (const item of results) {
    for (const wordId of questionWordIds(item.question)) {
      const current = scores.get(wordId) ?? { hit: 0, total: 0 }
      current.total += 1
      if (item.correct) current.hit += 1
      scores.set(wordId, current)
    }
  }
  return [...scores.entries()].map(([wordId, score]) => ({
    wordId,
    correct: score.hit === score.total,
  }))
}

export function ResultList({ words, speech }: { words: WordCard[]; speech: boolean }) {
  return (
    <ul className="result-list">
      {words.map((word) => (
        <li key={word.id}>
          <WordBody word={word} speech={speech} />
        </li>
      ))}
    </ul>
  )
}
