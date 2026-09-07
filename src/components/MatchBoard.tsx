import { useMemo, useState } from 'react'
import type { Collocation } from '../types'
import { shuffle } from '../lib/shuffle'

type Props = {
  pairs: Collocation[]
  onDone: (perfect: boolean) => void
  disabled: boolean
  stopOnMiss?: boolean
}

export function MatchBoard({ pairs, onDone, disabled, stopOnMiss }: Props) {
  const lefts = useMemo(() => shuffle(pairs.map((pair) => pair.left)), [pairs])
  const rights = useMemo(() => shuffle(pairs.map((pair) => pair.right)), [pairs])
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [wrong, setWrong] = useState<string | null>(null)
  const [mistakes, setMistakes] = useState(0)

  const answerOf = (left: string) => pairs.find((pair) => pair.left === left)?.right

  function tapLeft(left: string) {
    if (disabled || matched.includes(left)) return
    setSelectedLeft(left)
    setWrong(null)
  }

  function tapRight(right: string) {
    if (disabled || !selectedLeft || matched.includes(selectedLeft)) return
    const expected = answerOf(selectedLeft)
    if (expected === right) {
      const next = [...matched, selectedLeft]
      setMatched(next)
      setSelectedLeft(null)
      if (next.length === pairs.length) onDone(mistakes === 0)
    } else {
      setMistakes((count) => count + 1)
      setWrong(right)
      if (stopOnMiss) onDone(false)
    }
  }

  return (
    <div className="match">
      <div className="match-col">
        {lefts.map((left, index) => (
          <button
            key={`L-${index}-${left}`}
            type="button"
            className={[
              'opt',
              selectedLeft === left ? 'opt-on' : '',
              matched.includes(left) ? 'opt-ok' : '',
            ].join(' ')}
            disabled={disabled || matched.includes(left)}
            onClick={() => tapLeft(left)}
          >
            {left}
          </button>
        ))}
      </div>
      <div className="match-col">
        {rights.map((right, index) => {
          const locked = pairs.some(
            (pair) => pair.right === right && matched.includes(pair.left),
          )
          return (
            <button
              key={`R-${index}-${right}`}
              type="button"
              className={[
                'opt',
                locked ? 'opt-ok' : '',
                wrong === right ? 'opt-bad' : '',
              ].join(' ')}
              disabled={disabled || locked}
              onClick={() => tapRight(right)}
            >
              {right}
            </button>
          )
        })}
      </div>
    </div>
  )
}
