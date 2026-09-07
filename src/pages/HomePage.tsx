import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Fold, SourceFold } from '../components/Fold'
import { Icon } from '../components/Icon'
import { ModeCard } from '../components/ModeCard'
import { totalLessons } from '../data/meta'
import { getBackupStatus, hasLearnedSomething } from '../lib/persist'
import { dueCards } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'
import { isCloudBound } from '../lib/sync'

type InstallEvent = Event & { prompt: () => Promise<void> }

export function HomePage() {
  const { progress } = useProgress()
  const due = dueCards(progress).length
  const done = progress.completedLessons.length
  const lessons = totalLessons()
  const practiceGames = Object.values(progress.bank).reduce((sum, scope) => sum + (scope.gameIndex ?? 0), 0)
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [needsBackup, setNeedsBackup] = useState(false)

  useEffect(() => {
    function refresh() {
      if (!hasLearnedSomething(progress)) {
        setNeedsBackup(false)
        return
      }
      void getBackupStatus().then((status) => {
        const synced = isCloudBound()
        setNeedsBackup(!synced && !status.fileBound && !status.lastExportAt)
      })
    }
    refresh()
    window.addEventListener('wordlist-sync-meta', refresh)
    window.addEventListener('wordlist-auth', refresh)
    return () => {
      window.removeEventListener('wordlist-sync-meta', refresh)
      window.removeEventListener('wordlist-auth', refresh)
    }
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
    <div className="page">
      {needsBackup && (
        <Link className="banner backup-hint ui-pressable banner-icon" to="/settings" aria-label="備份">
          <Icon name="warning" />
          備份
        </Link>
      )}

      {installEvent && (
        <button
          type="button"
          className="primary banner-icon"
          onClick={async () => {
            await installEvent.prompt()
            setInstallEvent(null)
          }}
        >
          <Icon name="plus" />
          安裝
        </button>
      )}

      <div className="mode-grid">
        <ModeCard
          to="/course"
          icon="book"
          title="課程"
          stat={`${done}/${lessons}`}
          badge={due > 0 ? due : undefined}
        />
        <ModeCard
          to="/practice"
          icon="cards"
          title="練習"
          stat={practiceGames ? String(practiceGames) : undefined}
        />
        <ModeCard to="/endless" icon="infinity" title="無盡" />
      </div>

      <Fold label="規則">
        <ul className="rules">
          <li>課程：十詞一課，上完才開下一課。</li>
          <li>練習：答對的題五局內不再出。</li>
          <li>無盡：答對繼續，答錯結束。</li>
        </ul>
      </Fold>
      <SourceFold />
    </div>
  )
}
