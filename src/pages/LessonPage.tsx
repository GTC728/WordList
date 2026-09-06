import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QuizSession, ResultList, scoreWordResults } from '../components/QuizSession'
import { BackLink } from '../components/ui'
import { getLessonWords, lessonId } from '../data/course'
import { useProgress } from '../lib/ProgressContext'
import { buildLessonQuestions } from '../lib/quiz'

export function LessonPage() {
  const { sublist: subParam, lesson: lessonParam } = useParams()
  const sublist = Number(subParam)
  const lessonIndex = Number(lessonParam)
  const { progress, complete, queueReview } = useProgress()
  const speech = progress.settings.speech
  const words = useMemo(() => getLessonWords(sublist, lessonIndex), [sublist, lessonIndex])
  const questions = useMemo(() => buildLessonQuestions(words), [words])
  const [summary, setSummary] = useState<{ correct: number; total: number } | null>(null)
  const [queued, setQueued] = useState(false)
  const lessonKey = lessonId(sublist, lessonIndex)

  if (words.length === 0) {
    return (
      <main className="page">
        <BackLink to={`/course/awl/sublist/${sublist}`} label="返回" />
        <p>這一課沒有單字。</p>
      </main>
    )
  }

  if (summary) {
    return (
      <main className="page">
        <BackLink to={`/course/awl/sublist/${sublist}`} label="Sublist" />
        <h1>本課結束</h1>
        <p className="metric-lg">
          {summary.correct}/{summary.total}
        </p>
        <p className="lede">答錯的詞已排進複習。也可以把本課全部加入佇列。</p>
        <button
          type="button"
          className="primary"
          disabled={queued}
          onClick={() => {
            queueReview(words.map((word) => word.id))
            setQueued(true)
          }}
        >
          {queued ? '已加入複習' : '全部加入複習'}
        </button>
        <Link className="primary ghost" to={`/course/awl/sublist/${sublist}`}>
          回到單元
        </Link>
        <ResultList words={words} speech={speech} />
      </main>
    )
  }

  return (
    <main className="page">
      <BackLink to={`/course/awl/sublist/${sublist}`} label="離開" />
      <QuizSession
        key={lessonKey}
        questions={questions}
        speech={speech}
        onFinished={(results) => {
          complete(
            lessonKey,
            results.filter((item) => item.correct).length,
            results.length,
            scoreWordResults(results),
          )
          setSummary({
            correct: results.filter((item) => item.correct).length,
            total: results.length,
          })
        }}
      />
    </main>
  )
}
