import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QuizSession, ResultList, type ItemResult } from '../components/QuizSession'
import { BackLink } from '../components/ui'
import { describeScope, getScopeWords } from '../data/course'
import { blocksForPile } from '../lib/bank/blocks'
import { drawBankGame } from '../lib/bank/scheduler'
import { useProgress } from '../lib/ProgressContext'
import { questionBlockIds } from '../lib/quiz'

export function BankPlayPage() {
  const { scopeId } = useParams()
  const id = scopeId ?? ''
  const meta = describeScope(id)
  const words = useMemo(() => getScopeWords(id), [id])
  const { progress, finishBank } = useProgress()
  const speech = progress.settings.speech
  const gameIndex = progress.bank[id]?.gameIndex ?? 0
  const stats = progress.bank[id]?.stats
  const [seed, setSeed] = useState(0)
  const [started, setStarted] = useState(false)
  const [summary, setSummary] = useState<{ correct: number; total: number } | null>(null)

  const questions = useMemo(
    () => (started ? drawBankGame(words, stats ?? {}, gameIndex) : []),
    [started, seed, words, gameIndex, stats],
  )

  const bankSize = useMemo(() => blocksForPile(words).length, [words])

  function onFinished(results: ItemResult[]) {
    const blockResults = results.flatMap((item) =>
      questionBlockIds(item.question).map((blockId) => ({
        blockId,
        correct: item.correct,
      })),
    )
    finishBank(id, blockResults)
    setSummary({
      correct: results.filter((item) => item.correct).length,
      total: results.length,
    })
  }

  if (words.length === 0) {
    return (
      <main className="page">
        <BackLink to="/bank" label="題庫" />
        <p>找不到這一堆詞。</p>
      </main>
    )
  }

  if (summary) {
    return (
      <main className="page">
        <BackLink to={meta.backTo} label="返回" />
        <h1>這一局結束</h1>
        <p className="metric-lg">
          {summary.correct}/{summary.total}
        </p>
        <p className="lede">對的題塊會冷卻 5 局；錯的會隔一局再出。連錯兩次則下一局再練。</p>
        <button
          type="button"
          className="primary"
          onClick={() => {
            setSummary(null)
            setStarted(true)
            setSeed((value) => value + 1)
          }}
        >
          再來一局
        </button>
        <Link className="primary ghost" to={meta.backTo}>
          離開題庫
        </Link>
        <ResultList words={words} speech={speech} />
      </main>
    )
  }

  if (!started) {
    return (
      <main className="page">
        <BackLink to={meta.backTo} label="返回" />
        <p className="kicker">題庫模式</p>
        <h1>{meta.title}</h1>
        <p className="lede">
          {meta.detail} 題塊 {bankSize} 條，已打過 {gameIndex} 局。
        </p>
        <ul className="rules">
          <li>一條題塊 = 題型 + 所屬單詞 + 固定題面（填空句、配對邊、選項來源）。</li>
          <li>同一詞各題型最多 5 條；這一局從整堆裡隨機抽，並避開剛對過的。</li>
          <li>答對：5 局內不再出同一題塊。</li>
          <li>答錯：隔一局再出（下下次）。連錯兩次則下一局必出。</li>
          <li>沒見過的題塊優先登場，同一詞盡量不連著出。</li>
        </ul>
        <button type="button" className="primary" onClick={() => setStarted(true)}>
          開始一局
        </button>
      </main>
    )
  }

  if (questions.length === 0) {
    return (
      <main className="page">
        <BackLink to={meta.backTo} label="返回" />
        <h1>這一堆暫時抽不到題</h1>
        <p className="lede">剛對過的題塊還在冷卻。稍後再練，或換另一堆詞。</p>
        <button type="button" className="primary" onClick={() => setSeed((value) => value + 1)}>
          再試一次
        </button>
      </main>
    )
  }

  return (
    <main className="page">
      <BackLink to={meta.backTo} label="離開" />
      <p className="kicker">第 {gameIndex + 1} 局</p>
      <QuizSession
        key={`${id}-${seed}-${gameIndex}`}
        questions={questions}
        speech={speech}
        onFinished={onFinished}
      />
    </main>
  )
}
