import { useEffect, useRef, useState } from 'react'
import { BackLink } from '../components/ui'
import { useProgress } from '../lib/ProgressContext'
import {
  bindNewBackupFile,
  connectBackupFile,
  downloadBackup,
  getBackupStatus,
  hasLearnedSomething,
  importBackupText,
  unbindBackupFile,
  type BackupStatus,
} from '../lib/persist'
import { normalizeProgress } from '../lib/progress'

function formatStamp(ms: number | null): string {
  if (!ms) return '還沒有'
  return new Date(ms).toLocaleString('zh-Hant', { dateStyle: 'medium', timeStyle: 'short' })
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function SettingsPage() {
  const { progress, toggleSpeech, reset, replace } = useProgress()
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function refreshStatus() {
    setStatus(await getBackupStatus())
  }

  useEffect(() => {
    void refreshStatus()
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setMessage('')
    try {
      await action()
      await refreshStatus()
    } catch (error) {
      if (!isAbort(error)) {
        setMessage(error instanceof Error ? error.message : '做不到，請再試一次')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <BackLink to="/" label="首頁" />
      <h1>設定</h1>
      <label className="toggle" htmlFor="speech-toggle">
        <input
          id="speech-toggle"
          type="checkbox"
          checked={progress.settings.speech}
          onChange={(event) => toggleSpeech(event.target.checked)}
        />
        朗讀英文（瀏覽器語音）
      </label>

      <section className="backup-card">
        <h2>記憶與備份</h2>
        <p>
          練習紀錄會同時寫進這個瀏覽器的快取與 IndexedDB，開頁比較快，也比較耐清快取。兩邊都還是「這個瀏覽器」，換裝置或清網站資料仍會不見。
        </p>
        <p>
          要真正帶走進度：匯出一份 JSON（可丟進雲碟），或在 Chrome／Edge 綁定一個你自己的檔，之後每次練習會自動覆寫那個檔。
        </p>
        <ul className="status-list">
          <li>上次寫入：{formatStamp(status?.lastSavedAt ?? null)}</li>
          <li>上次帶走：{formatStamp(status?.lastExportAt ?? null)}</li>
          <li>
            綁定檔：
            {status?.fileBound
              ? `${status.fileName ?? '已綁定'}${status.fileWritable ? '（會自動寫入）' : '（權限過期，請再連一次）'}`
              : '尚未綁定'}
          </li>
          <li>
            瀏覽器持久儲存：
            {status?.persistent ? '已答應盡量不清掉' : '未取得；清網站資料仍會丟'}
          </li>
        </ul>
        <div className="stack-btns">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await downloadBackup(progress)
                setMessage('已下載備份檔。請放到你找得到的地方，不要只留在下載資料夾。')
              })
            }
          >
            匯出備份
          </button>
          <button type="button" className="primary ghost" disabled={busy} onClick={() => fileInput.current?.click()}>
            還原備份
          </button>
          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              if (hasLearnedSomething(progress) && !window.confirm('還原會覆蓋現在的進度，確定嗎？')) return
              void run(async () => {
                const envelope = await importBackupText(await file.text())
                replace(normalizeProgress(envelope.progress))
                setMessage('已從備份檔還原。')
              })
            }}
          />
          {status?.canBindFile && (
            <>
              <button
                type="button"
                className="primary ghost"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const name = await bindNewBackupFile(progress)
                    setMessage(`已綁定 ${name}，之後練習會自動寫入。`)
                  })
                }
              >
                綁定新的本機檔
              </button>
              <button
                type="button"
                className="primary ghost"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    if (
                      hasLearnedSomething(progress) &&
                      !window.confirm('連到既有檔會用檔案裡的進度覆蓋現在這份，確定嗎？')
                    ) {
                      return
                    }
                    const envelope = await connectBackupFile()
                    replace(normalizeProgress(envelope.progress))
                    setMessage('已連到備份檔，並載入檔裡的進度。')
                  })
                }
              >
                連到既有備份檔
              </button>
              {status.fileBound && (
                <button
                  type="button"
                  className="primary ghost"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await unbindBackupFile()
                      setMessage('已解除綁定。瀏覽器裡的進度還在，只是不再自動寫檔。')
                    })
                  }
                >
                  解除綁定
                </button>
              )}
            </>
          )}
        </div>
        {!status?.canBindFile && (
          <p className="footnote">這個瀏覽器不能綁定本機檔，請用匯出／還原。Chrome 或 Edge 可以自動寫檔。</p>
        )}
        {message && <p className="backup-msg">{message}</p>}
      </section>

      <button
        type="button"
        className="danger"
        onClick={() => {
          const extra = status?.fileBound ? '已綁定的本機檔也會被寫成空白。' : ''
          if (window.confirm(`確定清除本機進度？${extra}此動作無法復原。`)) {
            reset()
            void refreshStatus()
          }
        }}
      >
        重設進度
      </button>
      <p className="footnote">沒有帳號，也不會把進度傳到伺服器。</p>
    </main>
  )
}
