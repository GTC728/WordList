import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QuizSession, scoreWordResults } from '../components/QuizSession'
import { BackLink } from '../components/ui'
import { getWord } from '../data/course'
import { dueCards } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'
import { buildReviewQuestions } from '../lib/quiz'

export function ReviewPage() {
  const { progress, review } = useProgress()
  const due = useMemo(() => dueCards(progress), [progress])
  const words = useMemo(
    () => due.map((card) => getWord(card.wordId)).filter((word) => word !== undefined),
    [due],
  )
  const questions = useMemo(() => buildReviewQuestions(words), [words])
  const [done, setDone] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  if (due.length === 0 || questions.length === 0) {
    return (
      <main className="page">
        <BackLink to="/" label="課程" />
        <h1>複習</h1>
        <p className="lede">目前沒有到期的詞。上完一課並答錯幾題後，這裡會出現複習佇列。</p>
        <Link className="primary" to="/">
          去上課
        </Link>
      </main>
    )
  }

  if (done) {
    return (
      <main className="page">
        <BackLink to="/" label="課程" />
        <h1>複習結束</h1>
        <p className="metric-lg">
          {score.correct}/{score.total}
        </p>
        <Link className="primary" to="/">
          回首頁
        </Link>
      </main>
    )
  }

  return (
    <main className="page">
        <BackLink to="/" label="課程" />
      <h1>複習 {due.length} 詞</h1>
      <QuizSession
        questions={questions}
        speech={progress.settings.speech}
        onFinished={(results) => {
          review(scoreWordResults(results))
          setScore({
            correct: results.filter((item) => item.correct).length,
            total: results.length,
          })
          setDone(true)
        }}
      />
    </main>
  )
}
