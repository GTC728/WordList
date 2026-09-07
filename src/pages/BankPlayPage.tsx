import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Fold } from '../components/Fold'
import { ArtBlock } from '../components/ModeCard'
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
    () => (started ? drawBankGame(words, stats ?? {}, gameIndex, progress.wordHits) : []),
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
      <div className="page">
        <BackLink to="/practice" label="練習" />
        <p>找不到這一堆詞。</p>
      </div>
    )
  }

  if (summary) {
    return (
      <div className="page">
        <BackLink to={meta.backTo} label="返回" />
        <p className="metric-lg">
          {summary.correct}/{summary.total}
        </p>
        <button
          type="button"
          className="primary"
          onClick={() => {
            setSummary(null)
            setStarted(true)
            setSeed((value) => value + 1)
          }}
        >
          再來
        </button>
        <Link className="primary ghost" to={meta.backTo}>
          練習
        </Link>
        <ResultList words={words} speech={speech} />
      </div>
    )
  }

  if (!started) {
    return (
      <div className="page">
        <BackLink to={meta.backTo} label="返回" />
        <ArtBlock icon="cards" />
        <h1 className="lobby-title">{meta.title}</h1>
        {gameIndex ? <p className="mode-stat">{gameIndex}</p> : null}
        <button type="button" className="primary" onClick={() => setStarted(true)}>
          開始
        </button>
        <Fold label="規則">
          <ul className="rules">
            <li>題塊 {bankSize} 條。答對冷卻 5 局，答錯隔一局。</li>
            <li>連錯兩次則下一局再出。</li>
            <li>新詞先看單詞。同一詞做過五次才出拼字。</li>
          </ul>
        </Fold>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="page">
        <BackLink to={meta.backTo} label="返回" />
        <p className="muted">冷卻中</p>
        <button type="button" className="primary" onClick={() => setSeed((value) => value + 1)}>
          再試
        </button>
      </div>
    )
  }

  return (
    <div className="page">
      <BackLink to={meta.backTo} label="離開" />
      <p className="kicker">{gameIndex + 1}</p>
      <QuizSession
        key={`${id}-${seed}-${gameIndex}`}
        questions={questions}
        speech={speech}
        wordHits={progress.wordHits}
        onFinished={onFinished}
      />
    </div>
  )
}
