import { useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Fold } from '../components/Fold'
import { ModeCard } from '../components/ModeCard'
import { QuizSession, type ItemResult } from '../components/QuizSession'
import { StarButton } from '../components/StarButton'
import { BackLink } from '../components/ui'
import { getWord } from '../data/course'
import {
  DRILL_META,
  DRILL_SESSION,
  drillCounts,
  drillItems,
  drillQuestions,
  isDrillKind,
  type DrillKind,
} from '../lib/bank/drill'
import { blockStatus, describeBlock, formatSeenAgo } from '../lib/bank/stats'
import { useProgress } from '../lib/ProgressContext'
import { questionBlockIds } from '../lib/quiz'

export function DrillHubPage() {
  const { progress } = useProgress()
  const counts = useMemo(() => drillCounts(progress), [progress])

  return (
    <div className="page">
      <div className="mode-grid">
        <ModeCard to="/drill/wrong" icon="x" title="錯題" stat={counts.wrong ? String(counts.wrong) : undefined} />
        <ModeCard to="/drill/starred" icon="star" title="星號" stat={counts.starred ? String(counts.starred) : undefined} />
        <ModeCard to="/drill/stale" icon="clock" title="舊題" stat={counts.stale ? String(counts.stale) : undefined} />
      </div>
    </div>
  )
}

export function DrillListPage() {
  const { kind: raw } = useParams()
  if (!isDrillKind(raw)) return <Navigate to="/drill" replace />
  return <DrillList kind={raw} />
}

function DrillList({ kind }: { kind: DrillKind }) {
  const meta = DRILL_META[kind]
  const { progress } = useProgress()
  const items = useMemo(() => drillItems(kind, progress), [kind, progress])
  const shown = items.slice(0, 80)

  return (
    <div className="page">
      <BackLink to="/drill" label="重溫" />
      <div className="page-title-row">
        <h1>{meta.title}</h1>
        {items.length > 0 ? (
          <Link className="primary compact-primary" to={`/drill/${kind}/play`}>
            {items.length > DRILL_SESSION ? DRILL_SESSION : items.length}
          </Link>
        ) : null}
      </div>
      <Fold label="說明">{meta.lede}</Fold>

      {items.length === 0 ? (
        <p className="muted">沒有</p>
      ) : (
        <div className="ui-grouped-section">
          {shown.map(({ block, tally }) => {
            const view = describeBlock(block)
            const word = getWord(block.wordId)
            const seen = tally?.seen ?? 0
            return (
              <article key={block.id} className="compact-q">
                <strong>{word?.headword ?? view.shortId}</strong>
                <span className="bank-q-chip">{view.typeLabel}</span>
                <span className={`bank-q-status ${seen ? '' : 'is-idle'}`}>
                  {kind === 'stale' ? formatSeenAgo(tally?.lastSeenAt) : blockStatus(tally)}
                </span>
                <StarButton blockIds={[block.id]} />
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DrillPlayPage() {
  const { kind: raw } = useParams()
  const { progress, finishBank } = useProgress()
  const progressRef = useRef(progress)
  progressRef.current = progress
  const [seed, setSeed] = useState(0)
  const [summary, setSummary] = useState<{ correct: number; total: number } | null>(null)
  const kind = isDrillKind(raw) ? raw : null
  const questions = useMemo(
    () => (kind ? drillQuestions(kind, progressRef.current) : []),
    [kind, seed],
  )

  if (!kind) return <Navigate to="/drill" replace />
  const meta = DRILL_META[kind]

  function onFinished(results: ItemResult[]) {
    const blockResults = results.flatMap((item) =>
      questionBlockIds(item.question).map((blockId) => ({
        blockId,
        correct: item.correct,
      })),
    )
    finishBank(`drill:${kind}`, blockResults)
    setSummary({
      correct: results.filter((item) => item.correct).length,
      total: results.length,
    })
  }

  if (summary) {
    return (
      <div className="page">
        <BackLink to={`/drill/${kind}`} label={meta.title} />
        <p className="metric-lg">
          {summary.correct}/{summary.total}
        </p>
        <button
          type="button"
          className="primary"
          onClick={() => {
            setSummary(null)
            setSeed((value) => value + 1)
          }}
        >
          再來
        </button>
        <Link className="primary ghost" to="/drill">
          重溫
        </Link>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="page">
        <BackLink to={`/drill/${kind}`} label={meta.title} />
        <p className="muted">沒有</p>
      </div>
    )
  }

  return (
    <div className="page">
      <BackLink to={`/drill/${kind}`} label="離開" />
      <QuizSession
        key={`${kind}-${seed}`}
        questions={questions}
        speech={progress.settings.speech}
        wordHits={progress.wordHits}
        onFinished={onFinished}
      />
    </div>
  )
}
