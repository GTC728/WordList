import { Link, useParams } from 'react-router-dom'
import { BackLink } from '../components/ui'
import { getLessonCount, getLessonWords, getSublistWords, lessonId, lessonScopeId, sublistScopeId } from '../data/course'
import { isLessonUnlocked } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'

export function SublistPage() {
  const { n } = useParams()
  const sublist = Number(n)
  const { progress } = useProgress()
  const lessonCount = getLessonCount(sublist)
  const words = getSublistWords(sublist)

  if (!lessonCount) {
    return (
      <main className="page">
        <BackLink to="/course/awl" label="AWL" />
        <p>找不到這個 sublist。</p>
      </main>
    )
  }

  return (
    <main className="page">
      <BackLink to="/course/awl" label="AWL" />
      <h1>Sublist {sublist}</h1>
      <p className="lede">課程按課解鎖。題庫模式不擋進度，可對同一堆詞反覆抽題。</p>
      <Link className="banner" to={`/bank/${sublistScopeId(sublist)}`}>
        整層 {words.length} 詞 · 題庫模式
      </Link>
      <ol className="lesson-list">
        {Array.from({ length: lessonCount }, (_, index) => {
          const key = lessonId(sublist, index)
          const unlocked = isLessonUnlocked(progress.completedLessons, sublist, index)
          const score = progress.lessonScores[key]
          const lessonWords = getLessonWords(sublist, index)
          const title = lessonWords.map((word) => word.headword).slice(0, 3).join(', ')
          return (
            <li key={key}>
              <div className={`lesson-row ${unlocked ? '' : 'locked'}`}>
                <div>
                  <span>第 {index + 1} 課</span>
                  <span className="muted">{title}…</span>
                  {score && (
                    <span className="muted">
                      課程上次 {score.correct}/{score.total}
                    </span>
                  )}
                </div>
                <div className="row-actions">
                  {unlocked ? (
                    <Link to={`/lesson/awl/${sublist}/${index}`}>課程</Link>
                  ) : (
                    <span className="muted">未解鎖</span>
                  )}
                  <Link to={`/bank/${lessonScopeId(sublist, index)}`}>題庫</Link>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      <h2 className="section-title">本層單字</h2>
      <ul className="word-index">
        {words.map((word) => (
          <li key={word.id}>
            <Link to={`/word/${word.id}`}>
              {word.headword}
              <span>{word.glossZh}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
