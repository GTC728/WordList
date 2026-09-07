import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QuizSession, scoreWordResults } from '../components/QuizSession'
import { BackLink } from '../components/ui'
import { getWord } from '../data/course'
import { dueCards } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'
import { buildReviewQuestions, questionWordIds } from '../lib/quiz'

export function ReviewPage() {
  const { progress, review } = useProgress()
  const due = useMemo(() => dueCards(progress), [progress])
  const words = useMemo(
    () => due.map((card) => getWord(card.wordId)).filter((word) => word !== undefined),
    [due],
  )
  const questions = useMemo(
    () => buildReviewQuestions(words, progress.wordHits),
    [words, progress.wordHits],
  )
  const [done, setDone] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  if (due.length === 0 || questions.length === 0) {
    return (
      <div className="page">
        <BackLink to="/course" label="課程" />
        <p className="muted">沒有到期</p>
        <Link className="primary" to="/course">
          課程
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="page">
        <BackLink to="/course" label="課程" />
        <p className="metric-lg">
          {score.correct}/{score.total}
        </p>
        <Link className="primary" to="/course">
          課程
        </Link>
      </div>
    )
  }

  return (
    <div className="page">
      <BackLink to="/course" label="課程" />
      <p className="kicker">{due.length}</p>
      <QuizSession
        questions={questions}
        speech={progress.settings.speech}
        wordHits={progress.wordHits}
        onFinished={(results) => {
          review(
            scoreWordResults(results),
            results.flatMap((item) => questionWordIds(item.question)),
          )
          setScore({
            correct: results.filter((item) => item.correct).length,
            total: results.length,
          })
          setDone(true)
        }}
      />
    </div>
  )
}
