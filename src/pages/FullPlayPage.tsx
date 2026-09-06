import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MatchBoard } from '../components/MatchBoard'
import { BackLink, ProgressBar, SpeakButton } from '../components/ui'
import { WordBody } from '../components/WordBody'
import { describeFullScope, getScopeWords, getWord } from '../data/course'
import { buildFullOrder, countFullItems, materializeFullItem } from '../lib/bank/fullset'
import { useProgress } from '../lib/ProgressContext'
import { isMatchQuestion, questionWordIds } from '../lib/quiz'

export function FullPlayPage() {
  const { scopeId } = useParams()
  const id = scopeId ?? ''
  const meta = describeFullScope(id)
  const words = useMemo(() => getScopeWords(id), [id])
  const { progress, beginFull, markFull, dropFull } = useProgress()
  const run = progress.full[id]
  const speech = progress.settings.speech
  const [picked, setPicked] = useState<string | null>(null)
  const [resolved, setResolved] = useState<boolean | null>(null)
  const counts = useMemo(() => (words.length ? countFullItems(words) : { questions: 0, blocks: 0 }), [words])

  const item = run && !run.finished ? run.order[run.cursor] : undefined
  const question = useMemo(() => (item ? materializeFullItem(item, words) : null), [item, words])

  if (words.length === 0) {
    return (
      <main className="page">
        <BackLink to="/full" label="全題" />
        <p>找不到這一堆詞。</p>
      </main>
    )
  }

  if (run?.finished) {
    return (
      <main className="page">
        <BackLink to="/full" label="全題" />
        <p className="eyebrow">全題結束</p>
        <h1>{meta.title}</h1>
        <p className="metric-lg">
          {run.finished.correct}/{run.finished.total}
        </p>
        <p className="lede">範圍內的題塊都出過一遍了。</p>
        <button
          type="button"
          className="primary"
          onClick={() => {
            dropFull(id)
            beginFull(id, buildFullOrder(words))
            setPicked(null)
            setResolved(null)
          }}
        >
          再來一輪
        </button>
        <Link className="primary ghost" to="/full">
          回全題
        </Link>
      </main>
    )
  }

  if (!run) {
    return (
      <main className="page">
        <BackLink to="/full" label="全題" />
        <p className="eyebrow">全題</p>
        <h1>{meta.title}</h1>
        <p className="lede">
          {meta.detail} 約 {counts.questions} 題、{counts.blocks} 條題塊。
        </p>
        <ul className="rules">
          <li>選義、選詞、填空、詞族、搭配、同義詞、中英配對都會出。</li>
          <li>同一題塊只出現一次，做完才算這一輪結束。</li>
          <li>離開後再進來會從下一題繼續。</li>
        </ul>
        <button type="button" className="primary" onClick={() => beginFull(id, buildFullOrder(words))}>
          開始全題
        </button>
      </main>
    )
  }

  if (!question) {
    return (
      <main className="page">
        <BackLink to="/full" label="離開" />
        <p>這一題組不出來，已跳過。</p>
        <button
          type="button"
          className="primary"
          onClick={() => {
            markFull(id, false)
            setPicked(null)
            setResolved(null)
          }}
        >
          下一題
        </button>
      </main>
    )
  }

  const answered = resolved !== null

  return (
    <main className="page">
      <BackLink to="/full" label="離開" />
      <div className="lesson-top">
        <ProgressBar value={run.cursor} max={run.order.length} />
        <span className="count">
          {run.cursor + 1}/{run.order.length}
        </span>
      </div>

      {isMatchQuestion(question) ? (
        <>
          <p className="hint">{question.prompt}</p>
          <MatchBoard
            key={`${id}-${run.cursor}`}
            pairs={question.pairs}
            disabled={answered}
            onDone={(perfect) => setResolved(perfect)}
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
                    setResolved(option === question.answer)
                  }}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </>
      )}

      {answered && (
        <section className={`feedback ${resolved ? 'ok' : 'bad'}`}>
          <p>
            {isMatchQuestion(question)
              ? resolved
                ? '全對'
                : '有配錯'
              : resolved
                ? '正確'
                : `答案：${question.answer}`}
          </p>
          {questionWordIds(question).map((wordId) => {
            const word = getWord(wordId)
            return word ? <WordBody key={wordId} word={word} speech={speech} /> : null
          })}
          <button
            type="button"
            className="primary"
            onClick={() => {
              markFull(id, Boolean(resolved))
              setPicked(null)
              setResolved(null)
            }}
          >
            {run.cursor + 1 >= run.order.length ? '看結果' : '下一題'}
          </button>
        </section>
      )}
    </main>
  )
}
