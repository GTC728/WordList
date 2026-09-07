import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Fold } from '../components/Fold'
import { ArtBlock } from '../components/ModeCard'
import { MatchBoard } from '../components/MatchBoard'
import { SpellForm } from '../components/SpellForm'
import { StarButton } from '../components/StarButton'
import { BackLink, SpeakButton } from '../components/ui'
import { WordBody } from '../components/WordBody'
import { WordIntro } from '../components/WordIntro'
import { getScopeWords, getWord } from '../data/course'
import { catalogFullItems, fullItemKey, materializeFullItem } from '../lib/bank/fullset'
import { isNewWord } from '../lib/hits'
import { useProgress } from '../lib/ProgressContext'
import {
  answersMatch,
  isMatchQuestion,
  isTypeQuestion,
  questionBlockIds,
  questionWordIds,
} from '../lib/quiz'
import type { FullItem, Question, WordCard } from '../types'

type Draw = { item: FullItem; question: Question }

function drawQuestion(items: FullItem[], words: WordCard[], avoid?: string): Draw | null {
  if (items.length === 0) return null
  const pool = avoid ? items.filter((item) => fullItemKey(item) !== avoid) : items
  const item = pool[Math.floor(Math.random() * pool.length)] ?? items[0]
  const question = materializeFullItem(item, words)
  if (!question) return null
  return { item, question }
}

export function EndlessPage() {
  const words = useMemo(() => getScopeWords('awl-all'), [])
  const navigate = useNavigate()

  if (words.length === 0) {
    return (
      <div className="page">
        <BackLink to="/" label="課程" />
        <p>目前組不出無盡題庫。</p>
      </div>
    )
  }

  return (
    <div className="page">
      <BackLink to="/" label="課程" />
      <ArtBlock icon="infinity" />
      <button type="button" className="primary" onClick={() => navigate('/endless/play')}>
        開始
      </button>
      <Fold label="規則">
        <ul className="rules">
          <li>答對繼續，答錯結束。</li>
          <li>新詞先看單詞，再選中文意思。</li>
          <li>同一詞做過五次才出拼字。</li>
          <li>配錯一組即算失敗。</li>
        </ul>
      </Fold>
    </div>
  )
}

export function EndlessPlayPage() {
  const words = useMemo(() => getScopeWords('awl-all'), [])
  const { progress, finishBank } = useProgress()
  const catalog = useMemo(
    () => catalogFullItems(words, progress.wordHits ?? {}),
    [words, progress.wordHits],
  )
  const speech = progress.settings.speech
  const [draw, setDraw] = useState<Draw | null>(() => drawQuestion(catalog, words))
  const [streak, setStreak] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [resolved, setResolved] = useState<boolean | null>(null)
  const [over, setOver] = useState(false)
  const [round, setRound] = useState(0)
  const [seenIntro, setSeenIntro] = useState<string[]>([])

  const question = draw?.question

  function record(target: NonNullable<typeof question>, correct: boolean) {
    finishBank(
      'endless',
      questionBlockIds(target).map((blockId) => ({ blockId, correct })),
    )
  }

  function startRun() {
    setDraw(drawQuestion(catalog, words))
    setStreak(0)
    setPicked(null)
    setResolved(null)
    setOver(false)
    setRound((value) => value + 1)
    setSeenIntro([])
  }

  function nextQuestion(opts: { countStreak: boolean }) {
    if (resolved === false) {
      setOver(true)
      return
    }
    const next = drawQuestion(catalog, words, draw ? fullItemKey(draw.item) : undefined)
    setDraw(next)
    if (opts.countStreak) setStreak((value) => value + 1)
    setPicked(null)
    setResolved(null)
    setRound((value) => value + 1)
  }

  if (over) {
    return (
      <div className="page">
        <BackLink to="/endless" label="無盡" />
        <p className="metric-lg">{streak}</p>
        <button type="button" className="primary" onClick={startRun}>
          再來
        </button>
        <Link className="primary ghost" to="/">
          課程
        </Link>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="page">
        <BackLink to="/endless" label="離開" />
        <button type="button" className="primary" onClick={() => nextQuestion({ countStreak: false })}>
          下一題
        </button>
      </div>
    )
  }

  const answered = resolved !== null
  const introId =
    !isMatchQuestion(question) &&
    isNewWord(question.wordId, progress.wordHits) &&
    !seenIntro.includes(question.wordId)
      ? question.wordId
      : null
  const introWord = introId ? getWord(introId) : undefined

  return (
    <div className="page">
      <BackLink to="/endless" label="離開" />
      <div className="lesson-top">
        <p className="kicker">{streak}</p>
        <span className="count">{streak + 1}</span>
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
            key={round}
            pairs={question.pairs}
            disabled={answered}
            stopOnMiss
            onDone={(perfect) => {
              setResolved(perfect)
              record(question, perfect)
            }}
          />
        </>
      ) : isTypeQuestion(question) ? (
        <>
          <p className="hint">{question.hint}</p>
          <div className="prompt-row">
            <h2 className="prompt">{question.prompt}</h2>
          </div>
          <SpellForm
            key={round}
            disabled={answered}
            onSubmit={(value) => {
              const ok = answersMatch(value, question.answer)
              setResolved(ok)
              record(question, ok)
            }}
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
              let cls = 'opt ui-pressable'
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
                    const ok = option === question.answer
                    setResolved(ok)
                    record(question, ok)
                  }}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </>
      )}

      {!introWord && answered && (
        <section className={`feedback ${resolved ? 'ok' : 'bad'}`}>
          <p>
            {isMatchQuestion(question)
              ? resolved
                ? '全對'
                : '配錯'
              : resolved
                ? '正確'
                : `答案：${question.answer}`}
          </p>
          {questionWordIds(question).map((wordId) => {
            const word = getWord(wordId)
            return word ? <WordBody key={wordId} word={word} speech={speech} /> : null
          })}
          <div className="feedback-tools">
            <StarButton blockIds={questionBlockIds(question)} />
          </div>
          <button type="button" className="primary" onClick={() => nextQuestion({ countStreak: true })}>
            {resolved ? '繼續' : '結束'}
          </button>
        </section>
      )}
    </div>
  )
}
