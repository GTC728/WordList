import { Link } from 'react-router-dom'
import { BackLink, ProgressBar } from '../components/ui'
import { courseMeta, getSublistWords } from '../data/course'
import { useProgress } from '../lib/ProgressContext'

export function CoursePage() {
  const { progress } = useProgress()

  return (
    <main className="page">
      <BackLink to="/" label="課程" />
      <h1>{courseMeta.titleZh}</h1>
      <p className="lede">{courseMeta.title}，依出現頻率分成十層。建議從 Sublist 1 開始。</p>
      <ol className="sublist-map">
        {courseMeta.sublists.map((item) => {
          const words = getSublistWords(item.n)
          const finished = words.length
            ? progress.completedLessons.filter((id) => id.startsWith(`awl-${item.n}-`)).length
            : 0
          return (
            <li key={item.n}>
              <Link className="map-row" to={`/course/awl/sublist/${item.n}`}>
                <div>
                  <strong>Sublist {item.n}</strong>
                  <span>
                    {item.wordCount} 詞 · {item.lessonCount} 課
                  </span>
                </div>
                <ProgressBar value={finished} max={item.lessonCount} />
              </Link>
            </li>
          )
        })}
      </ol>
      <p className="footnote">{courseMeta.attribution}</p>
    </main>
  )
}
