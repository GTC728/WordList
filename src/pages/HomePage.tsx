import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { courseMeta, totalLessons } from '../data/course'
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
        <p className="kicker">WordList</p>
        <h1>學術英文單字</h1>
        <p className="lede">第一門課是 Coxhead 的 Academic Word List。離線可複習；進度記在這台裝置，建議再到設定做一份備份。</p>
      </header>

      {due > 0 && (
        <Link className="banner" to="/review">
          有 {due} 個詞到期複習
        </Link>
      )}

      {needsBackup && (
        <Link className="banner backup-hint" to="/settings">
          進度還只在這個瀏覽器裡，去設定做一份備份
        </Link>
      )}

      <Link className="course-card" to="/course/awl">
        <div>
          <p className="kicker">課程 01</p>
          <h2>{courseMeta.titleZh}</h2>
          <p>Academic Word List · {courseMeta.headwordCount} 詞族 · 10 個 sublist</p>
        </div>
        <p className="metric">
          {done}/{lessons} 課
        </p>
      </Link>

      <Link className="course-card" to="/bank">
        <div>
          <p className="kicker">題庫模式</p>
          <h2>抽題練習</h2>
          <p>每詞自己的題塊庫；同義詞配對、中英配對，對了冷卻、錯了重出。</p>
        </div>
        <p className="metric">另開</p>
      </Link>

      <nav className="home-nav">
        <Link to="/review">複習</Link>
        <Link to="/bank">題庫</Link>
        <Link to="/settings">設定</Link>
      </nav>

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

      <p className="footnote">詞表來源：{courseMeta.attribution}。釋義與例句為本應用自行撰寫。</p>
    </main>
  )
}
