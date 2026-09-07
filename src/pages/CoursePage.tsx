import { Link } from 'react-router-dom'
import { SourceFold } from '../components/Fold'
import { Icon } from '../components/Icon'
import { NumRow } from '../components/ModeCard'
import { BackLink, ProgressBar } from '../components/ui'
import { courseMeta, totalLessons } from '../data/meta'
import { dueCards } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'

export function CoursePage() {
  const { progress } = useProgress()
  const due = dueCards(progress).length
  const done = progress.completedLessons.length
  const lessons = totalLessons()

  return (
    <div className="page">
      <div className="page-title-row">
        <BackLink to="/" label="課程" />
        {due > 0 ? (
          <Link className="due-chip ui-pressable" to="/review" aria-label={`${due} 詞到期`}>
            <Icon name="clock" />
            {due}
          </Link>
        ) : null}
      </div>
      <ProgressBar value={done} max={lessons} />
      <div className="ui-grouped-section">
        {courseMeta.sublists.map((item) => {
          const finished = progress.completedLessons.filter((id) => id.startsWith(`awl-${item.n}-`)).length
          return (
            <NumRow
              key={item.n}
              n={item.n}
              to={`/course/awl/sublist/${item.n}`}
              value={finished}
              max={item.lessonCount}
              label={`Sublist ${item.n} ${finished}/${item.lessonCount}`}
            />
          )
        })}
      </div>
      <SourceFold />
    </div>
  )
}
