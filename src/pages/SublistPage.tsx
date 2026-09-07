import { Link, useParams } from 'react-router-dom'
import { Fold } from '../components/Fold'
import { Icon } from '../components/Icon'
import { IconLink } from '../components/ModeCard'
import { BackLink, ProgressBar } from '../components/ui'
import { getLessonCount, getLessonWords, getSublistWords, lessonId, lessonScopeId, sublistScopeId } from '../data/course'
import { isLessonUnlocked } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'

export function SublistPage() {
  const { n } = useParams()
  const sublist = Number(n)
  const { progress } = useProgress()
  const lessonCount = getLessonCount(sublist)
  const words = getSublistWords(sublist)
  const finished = progress.completedLessons.filter((id) => id.startsWith(`awl-${sublist}-`)).length

  if (!lessonCount) {
    return (
      <div className="page">
        <BackLink to="/course" label="課程" />
        <p>找不到這個 sublist。</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-title-row">
        <BackLink to="/course" label="課程" />
        <h1 className="sr-only">Sublist {sublist}</h1>
        <IconLink to={`/practice/${sublistScopeId(sublist)}`} icon="cards" label={`${words.length} 詞練習`} />
      </div>
      <ProgressBar value={finished} max={lessonCount} />
      <ol className="lesson-list">
        {Array.from({ length: lessonCount }, (_, index) => {
          const key = lessonId(sublist, index)
          const unlocked = isLessonUnlocked(progress.completedLessons, sublist, index)
          const lessonWords = getLessonWords(sublist, index)
          const title = lessonWords
            .map((word) => word.headword)
            .slice(0, 3)
            .join(' ')
          return (
            <li key={key}>
              <div className={`lesson-row ${unlocked ? '' : 'locked'}`}>
                <span className="row-num">{index + 1}</span>
                <span className="lesson-preview">{title}</span>
                <div className="row-actions">
                  {unlocked ? (
                    <IconLink to={`/lesson/awl/${sublist}/${index}`} icon="book" label={`第 ${index + 1} 課`} />
                  ) : (
                    <span className="icon-hit is-muted" aria-label="未解鎖">
                      <Icon name="lock" />
                    </span>
                  )}
                  <IconLink
                    to={`/practice/${lessonScopeId(sublist, index)}`}
                    icon="cards"
                    label={`第 ${index + 1} 課練習`}
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      <Fold
        label={
          <>
            <Icon name="book" />
            {words.length}
          </>
        }
      >
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
      </Fold>
    </div>
  )
}
