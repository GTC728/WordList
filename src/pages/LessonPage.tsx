import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Fold } from '../components/Fold'
import { QuizSession, ResultList, scoreWordResults } from '../components/QuizSession'
import { BackLink } from '../components/ui'
import { getLessonWords, lessonId } from '../data/course'
import { useProgress } from '../lib/ProgressContext'
import { buildLessonQuestions, questionWordIds } from '../lib/quiz'

export function LessonPage() {
  const { sublist: subParam, lesson: lessonParam } = useParams()
  const sublist = Number(subParam)
  const lessonIndex = Number(lessonParam)
  const { progress, complete, queueReview } = useProgress()
  const speech = progress.settings.speech
  const words = useMemo(() => getLessonWords(sublist, lessonIndex), [sublist, lessonIndex])
  const lessonKey = lessonId(sublist, lessonIndex)
  const questions = useMemo(
    () => buildLessonQuestions(words, progress.wordHits),
    [words, lessonKey],
  )
  const [summary, setSummary] = useState<{ correct: number; total: number } | null>(null)
  const [queued, setQueued] = useState(false)

  if (words.length === 0) {
    return (
      <div className="page">
        <BackLink to={`/course/awl/sublist/${sublist}`} label="返回" />
        <p>這一課沒有單字。</p>
      </div>
    )
  }

  if (summary) {
    return (
      <div className="page">
        <BackLink to={`/course/awl/sublist/${sublist}`} label="Sublist" />
        <p className="metric-lg">
          {summary.correct}/{summary.total}
        </p>
        <Link className="primary" to={`/course/awl/sublist/${sublist}`}>
          單元
        </Link>
        <Fold label="複習">
          <button
            type="button"
            className="primary ghost"
            disabled={queued}
            onClick={() => {
              queueReview(words.map((word) => word.id))
              setQueued(true)
            }}
          >
            {queued ? '已加入' : '全部加入'}
          </button>
        </Fold>
        <ResultList words={words} speech={speech} />
      </div>
    )
  }

  return (
    <div className="page">
      <BackLink to={`/course/awl/sublist/${sublist}`} label="離開" />
      <QuizSession
        key={lessonKey}
        questions={questions}
        speech={speech}
        wordHits={progress.wordHits}
        onFinished={(results) => {
          complete(
            lessonKey,
            results.filter((item) => item.correct).length,
            results.length,
            scoreWordResults(results),
            results.flatMap((item) => questionWordIds(item.question)),
          )
          setSummary({
            correct: results.filter((item) => item.correct).length,
            total: results.length,
          })
        }}
      />
    </div>
  )
}
