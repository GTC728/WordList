import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProgressBar } from '../components/ui'
import { courseMeta, getSublistWords, totalLessons } from '../data/course'
import { getBackupStatus, hasLearnedSomething } from '../lib/persist'
import { dueCards } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'

type InstallEvent = Event & { prompt: () => Promise<void> }

export function HomePage() {
  const { progress } = useProgress()
  const due = dueCards(progress).length
  const done = progress.completedLessons.length
  const lessons = totalLessons()
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [needsBackup, setNeedsBackup] = useState(false)

  useEffect(() => {
    if (!hasLearnedSomething(progress)) {
      setNeedsBackup(false)
      return
    }
    void getBackupStatus().then((status) => {
      setNeedsBackup(!status.fileBound && !status.lastExportAt)
    })
  }, [progress])

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  return (
    <main className="page">
      <header className="hero-block">
        <p className="eyebrow">課程</p>
        <h1>學術英文單字</h1>
        <p className="lede">Coxhead Academic Word List · 依出現頻率分成十層。</p>
      </header>

      <section className="ui-metric-hero">
        <article>
          <span>課程</span>
          <strong>
            {done}/{lessons}
          </strong>
        </article>
        <article>
          <span>到期複習</span>
          <strong>{due}</strong>
        </article>
        <article>
          <span>詞族</span>
          <strong>{courseMeta.headwordCount}</strong>
        </article>
      </section>

      {due > 0 && (
        <Link className="banner ui-pressable" to="/review">
          有 {due} 個詞到期複習
        </Link>
      )}

      {needsBackup && (
        <Link className="banner backup-hint ui-pressable" to="/settings">
          進度還只在這個瀏覽器裡，去設定同步或備份
        </Link>
      )}

      {installEvent && (
        <button
          type="button"
          className="primary"
          onClick={async () => {
            await installEvent.prompt()
            setInstallEvent(null)
          }}
        >
          加到主畫面
        </button>
      )}

      <p className="section-label">Sublist</p>
      <div className="ui-grouped-section">
        {courseMeta.sublists.map((item) => {
          const words = getSublistWords(item.n)
          const finished = words.length
            ? progress.completedLessons.filter((id) => id.startsWith(`awl-${item.n}-`)).length
            : 0
          return (
            <Link key={item.n} className="ui-grouped-row ui-pressable" to={`/course/awl/sublist/${item.n}`}>
              <div>
                <strong>Sublist {item.n}</strong>
                <p className="muted">
                  {item.wordCount} 詞 · {item.lessonCount} 課
                </p>
              </div>
              <ProgressBar value={finished} max={item.lessonCount} />
            </Link>
          )
        })}
      </div>

      <p className="footnote">詞表來源：{courseMeta.attribution}。釋義與例句為本應用自行撰寫。</p>
    </main>
  )
}
