import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Fold } from '../components/Fold'
import { NumRow } from '../components/ModeCard'
import { BackLink, ProgressBar } from '../components/ui'
import { StarButton } from '../components/StarButton'
import { courseMeta, getSublistWords, getWord } from '../data/course'
import {
  TYPE_LABEL,
  TYPE_ORDER,
  SPELL_AFTER,
  allQuestionBlocks,
  blockStatus,
  describeBlock,
  formatAccuracy,
  mergeBankTallies,
  practiceGameCount,
  sublistBlocks,
  summarize,
  weakestWords,
  wordBlocks,
} from '../lib/bank/stats'
import { useProgress } from '../lib/ProgressContext'
import type { QuestionBlock } from '../types'

export function BankStatsPage() {
  const { progress } = useProgress()
  const blocks = useMemo(() => allQuestionBlocks(), [])
  const tallies = useMemo(() => mergeBankTallies(progress.bank), [progress.bank])
  const overall = useMemo(() => summarize(blocks, tallies), [blocks, tallies])
  const games = practiceGameCount(progress.bank)
  const types = useMemo(
    () =>
      TYPE_ORDER.map((type) => {
        const slice = blocks.filter((block) => block.type === type)
        return { type, stats: summarize(slice, tallies) }
      }),
    [blocks, tallies],
  )
  const sublists = useMemo(() => {
    const grouped = new Map<number, QuestionBlock[]>()
    for (const block of blocks) {
      const sub = getWord(block.wordId)?.sublist
      if (!sub) continue
      const list = grouped.get(sub)
      if (list) list.push(block)
      else grouped.set(sub, [block])
    }
    return courseMeta.sublists.map((item) => ({
      item,
      stats: summarize(grouped.get(item.n) ?? [], tallies),
    }))
  }, [blocks, tallies])
  const weak = useMemo(() => weakestWords(blocks, tallies, getWord), [blocks, tallies])

  return (
    <div className="page">
      <p className="metric-lg">
        {overall.seen}/{overall.total}
      </p>
      <p className="mode-stat">{formatAccuracy(overall.accuracy)}</p>
      <Fold label="細項">
        <p>
          對 {overall.correct} · 錯 {overall.wrong} · 連錯 {overall.leech} · 穩 {overall.stable} · {games} 局
        </p>
      </Fold>

      <div className="ui-grouped-section">
        {sublists.map(({ item, stats }) => (
          <NumRow
            key={item.n}
            n={item.n}
            to={`/bank/sub/${item.n}`}
            value={stats.seen}
            max={stats.total}
            label={`Sublist ${item.n} ${stats.seen}/${stats.total}`}
          />
        ))}
      </div>

      <Fold label="題型">
        <div className="ui-grouped-section">
          {types.map(({ type, stats }) => (
            <NumRow key={type} n={TYPE_LABEL[type]} value={stats.seen} max={stats.total} />
          ))}
        </div>
      </Fold>

      {weak.length > 0 && (
        <Fold label="弱">
          <div className="ui-grouped-section">
            {weak.map(({ word, stats }) => (
              <Link key={word.id} className="compact-q ui-pressable" to={`/bank/word/${word.id}`}>
                <strong>{word.headword}</strong>
                <span className="progress-row-count">{stats.wrong}</span>
              </Link>
            ))}
          </div>
        </Fold>
      )}
    </div>
  )
}

export function BankSublistStatsPage() {
  const { n } = useParams()
  const sublist = Number(n)
  const { progress } = useProgress()
  const words = useMemo(() => getSublistWords(sublist), [sublist])
  const blocks = useMemo(() => sublistBlocks(sublist), [sublist])
  const tallies = useMemo(() => mergeBankTallies(progress.bank), [progress.bank])
  const overall = useMemo(() => summarize(blocks, tallies), [blocks, tallies])
  const byWord = useMemo(() => {
    const grouped = new Map<string, QuestionBlock[]>()
    for (const block of blocks) {
      const list = grouped.get(block.wordId)
      if (list) list.push(block)
      else grouped.set(block.wordId, [block])
    }
    return words.map((word) => ({
      word,
      stats: summarize(grouped.get(word.id) ?? [], tallies),
    }))
  }, [blocks, words, tallies])

  if (!words.length) {
    return (
      <div className="page">
        <BackLink to="/bank" label="題庫" />
        <p>找不到這個 sublist。</p>
      </div>
    )
  }

  return (
    <div className="page">
      <BackLink to="/bank" label="題庫" />
      <h1 className="page-num">{sublist}</h1>
      <ProgressBar value={overall.seen} max={overall.total} />
      <div className="ui-grouped-section">
        {byWord.map(({ word, stats }) => (
          <Link key={word.id} className="compact-q ui-pressable" to={`/bank/word/${word.id}`}>
            <strong>{word.headword}</strong>
            <span className="progress-row-count">
              {stats.seen}/{stats.total}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function BankWordStatsPage() {
  const { id } = useParams()
  const { progress } = useProgress()
  const word = id ? getWord(id) : undefined
  const tallies = useMemo(() => mergeBankTallies(progress.bank), [progress.bank])
  const blocks = useMemo(() => (word ? wordBlocks(word) : []), [word])
  const overall = useMemo(() => summarize(blocks, tallies), [blocks, tallies])
  const groups = useMemo(
    () =>
      TYPE_ORDER.map((type) => {
        const slice = blocks.filter((block) => block.type === type)
        return { type, slice, stats: summarize(slice, tallies) }
      }).filter((group) => group.slice.length > 0),
    [blocks, tallies],
  )

  if (!word) {
    return (
      <div className="page">
        <BackLink to="/bank" label="題庫" />
        <p>找不到這個詞。</p>
      </div>
    )
  }

  return (
    <div className="page">
      <BackLink to={`/bank/sub/${word.sublist}`} label={`Sublist ${word.sublist}`} />
      <h1 className="headword-title">{word.headword}</h1>
      <p className="gloss-zh">{word.glossZh}</p>
      <ProgressBar value={overall.seen} max={overall.total} />
      <Link className="banner ui-pressable banner-icon" to={`/word/${word.id}`}>
        卡片
      </Link>

      {groups.map(({ type, slice, stats }) => (
        <Fold key={type} label={`${TYPE_LABEL[type]} ${stats.seen}/${stats.total}`}>
          {slice.map((block) => {
            const view = describeBlock(block)
            const tally = tallies[block.id]
            const seen = tally?.seen ?? 0
            const locked = block.type === 'spell' && (progress.wordHits?.[word.id] ?? 0) < SPELL_AFTER
            return (
              <article key={block.id} className="compact-q">
                <strong>{view.subtype}</strong>
                <span className={`bank-q-status ${seen || locked ? '' : 'is-idle'}`}>
                  {locked ? SPELL_AFTER : blockStatus(tally)}
                </span>
                <StarButton blockIds={[block.id]} />
              </article>
            )
          })}
        </Fold>
      ))}
    </div>
  )
}
