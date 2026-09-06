import { useEffect, useRef, useState } from 'react'
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
import {
  createSyncCode,
  formatSyncCode,
  joinSyncCode,
  normalizeJoinCode,
  readSyncMeta,
  unbindSync,
  type SyncMeta,
} from '../lib/sync'
import { accentOptions } from '../lib/theme'
import type { ThemeMode } from '../types'

function formatStamp(ms: number | null): string {
  if (!ms) return '還沒有'
  return new Date(ms).toLocaleString('zh-Hant', { dateStyle: 'medium', timeStyle: 'short' })
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function SettingsPage() {
  const { progress, toggleSpeech, reset, replace, setTheme } = useProgress()
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [sync, setSync] = useState<SyncMeta>(() => readSyncMeta())
  const [joinCode, setJoinCode] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function refreshStatus() {
    setStatus(await getBackupStatus())
    setSync(readSyncMeta())
  }

  useEffect(() => {
    void refreshStatus()
    const onMeta = () => setSync(readSyncMeta())
    window.addEventListener('wordlist-sync-meta', onMeta)
    return () => window.removeEventListener('wordlist-sync-meta', onMeta)
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
      <p className="eyebrow">設定</p>
      <h1>工作區</h1>

      <p className="section-label">跨裝置同步</p>
      <div className="ui-grouped-section">
        <div className="ui-grouped-row">
          <div>
            <strong>同步碼</strong>
            <p className="muted">{sync.code ? '電腦和手機輸入同一組碼就會共用進度' : '還沒綁定'}</p>
          </div>
        </div>
        {sync.code ? (
          <>
            <div className="ui-grouped-row">
              <span className="sync-code">{formatSyncCode(sync.code)}</span>
              <button
                type="button"
                className="primary ghost"
                onClick={() => void navigator.clipboard.writeText(sync.code ?? '')}
              >
                複製
              </button>
            </div>
            <div className="ui-grouped-row">
              <span>上次同步</span>
              <span className="muted">{formatStamp(sync.lastPushAt ?? sync.lastPullAt)}</span>
            </div>
            <button type="button" className="ui-grouped-row" disabled={busy} onClick={() => unbindSync()}>
              這台解除同步
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="ui-grouped-row"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const code = await createSyncCode()
                  setMessage(`已建立同步碼 ${formatSyncCode(code)}。在另一台裝置貼上即可。`)
                })
              }
            >
              建立同步碼
            </button>
            <div className="ui-grouped-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <input
                className="field"
                value={joinCode}
                placeholder="貼上另一台的同步碼"
                onChange={(event) => setJoinCode(event.target.value)}
              />
              <button
                type="button"
                className="primary"
                disabled={busy || normalizeJoinCode(joinCode).length < 8}
                onClick={() =>
                  run(async () => {
                    const envelope = await joinSyncCode(joinCode)
                    replace(normalizeProgress(envelope.progress))
                    setJoinCode('')
                    setMessage('已連上，並與雲端進度合併。')
                  })
                }
              >
                加入同步
              </button>
            </div>
          </>
        )}
      </div>
      <p className="footnote">以最新寫入為準。電腦開一份、手機開一份，貼上同一組碼。沒有帳號。</p>

      <p className="section-label">外觀</p>
      <div className="ui-grouped-section">
        <div className="ui-grouped-row">
          <span>主題</span>
          <div className="ui-segment">
            {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`ui-segment-btn ${progress.settings.theme === mode ? 'is-on' : ''}`}
                onClick={() => setTheme(mode, progress.settings.accent)}
              >
                {mode === 'dark' ? '深色' : mode === 'light' ? '淺色' : '系統'}
              </button>
            ))}
          </div>
        </div>
        <div className="ui-grouped-row">
          <span>強調色</span>
          <div className="accent-row">
            {accentOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`accent-swatch ${progress.settings.accent === item.value ? 'is-on' : ''}`}
                style={{ background: item.swatch }}
                aria-label={item.label}
                onClick={() => setTheme(progress.settings.theme, item.value)}
              />
            ))}
          </div>
        </div>
        <label className="ui-grouped-row" htmlFor="speech-toggle">
          <span>朗讀英文</span>
          <input
            id="speech-toggle"
            type="checkbox"
            checked={progress.settings.speech}
            onChange={(event) => toggleSpeech(event.target.checked)}
          />
        </label>
      </div>

      <p className="section-label">本機備份</p>
      <div className="backup-card">
        <p>同步之外，仍可匯出 JSON，或在 Chrome／Edge 綁定一個你自己的檔。</p>
        <ul className="status-list">
          <li>上次寫入：{formatStamp(status?.lastSavedAt ?? null)}</li>
          <li>綁定檔：{status?.fileBound ? status.fileName ?? '已綁定' : '尚未綁定'}</li>
        </ul>
        <div className="stack-btns">
          <button
            type="button"
            className="primary ghost"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await downloadBackup(progress)
                setMessage('已下載備份檔。')
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
                    setMessage(`已綁定 ${name}`)
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
                    const envelope = await connectBackupFile()
                    replace(normalizeProgress(envelope.progress))
                    setMessage('已連到備份檔。')
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
                      setMessage('已解除綁定。')
                    })
                  }
                >
                  解除綁定
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {message && <p className="backup-msg">{message}</p>}

      <button
        type="button"
        className="danger"
        onClick={() => {
          if (window.confirm('確定清除本機進度？此動作無法復原。')) {
            reset()
            void refreshStatus()
          }
        }}
      >
        重設進度
      </button>
    </main>
  )
}
