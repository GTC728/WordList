import { useEffect, useRef, useState } from 'react'
import { Fold } from '../components/Fold'
import { Icon } from '../components/Icon'
import { IconButton } from '../components/ModeCard'
import {
  authChipLabel,
  readAuth,
  requestPasswordReset,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  type AuthSession,
} from '../lib/auth'
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
  bindAccountSync,
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
  if (!ms) return '—'
  return new Date(ms).toLocaleString('zh-Hant', { dateStyle: 'medium', timeStyle: 'short' })
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

const THEME: { mode: ThemeMode; icon: 'moon' | 'sun' | 'monitor'; label: string }[] = [
  { mode: 'dark', icon: 'moon', label: '深色' },
  { mode: 'light', icon: 'sun', label: '淺色' },
  { mode: 'system', icon: 'monitor', label: '系統' },
]

export function SettingsPage() {
  const { progress, toggleSpeech, reset, replace, setTheme } = useProgress()
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [sync, setSync] = useState<SyncMeta>(() => readSyncMeta())
  const [auth, setAuth] = useState<AuthSession | null>(() => readAuth())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function refreshStatus() {
    setStatus(await getBackupStatus())
    setSync(readSyncMeta())
    setAuth(readAuth())
  }

  useEffect(() => {
    void refreshStatus()
    const onMeta = () => setSync(readSyncMeta())
    const onAuth = () => setAuth(readAuth())
    window.addEventListener('wordlist-sync-meta', onMeta)
    window.addEventListener('wordlist-auth', onAuth)
    return () => {
      window.removeEventListener('wordlist-sync-meta', onMeta)
      window.removeEventListener('wordlist-auth', onAuth)
    }
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
    <div className="page">
      <div className="ui-grouped-section">
        <div className="ui-grouped-row">
          <div className="ui-segment">
            {THEME.map((item) => (
              <button
                key={item.mode}
                type="button"
                className={`ui-segment-btn ${progress.settings.theme === item.mode ? 'is-on' : ''}`}
                aria-label={item.label}
                onClick={() => setTheme(item.mode, progress.settings.accent)}
              >
                <Icon name={item.icon} />
              </button>
            ))}
          </div>
        </div>
        <div className="ui-grouped-row">
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
          <Icon name="speaker" />
          <input
            id="speech-toggle"
            type="checkbox"
            checked={progress.settings.speech}
            onChange={(event) => toggleSpeech(event.target.checked)}
            aria-label="朗讀英文"
          />
        </label>
      </div>

      <div className="ui-grouped-section">
        {auth ? (
          <>
            <div className="ui-grouped-row">
              <span className="sync-row">
                <Icon name="cloud" />
                <span className="sync-code">{auth.user.email || authChipLabel(auth.user.id)}</span>
              </span>
            </div>
            {sync.lastError ? (
              <div className="ui-grouped-row">
                <span className="muted">{sync.lastError}</span>
              </div>
            ) : null}
            <button
              type="button"
              className="ui-grouped-row"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await signOut()
                })
              }
            >
              登出
            </button>
          </>
        ) : (
          <div className="ui-grouped-row auth-stack">
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await signInWithGoogle()
                })
              }
            >
              Google 登入
            </button>
            <input
              className="field"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="信箱"
              aria-label="信箱"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="field"
              type="password"
              autoComplete="current-password"
              placeholder="密碼"
              aria-label="密碼"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <div className="auth-actions">
              <button
                type="button"
                className="primary"
                disabled={busy || !email || password.length < 6}
                onClick={() =>
                  run(async () => {
                    await signIn(email, password)
                    const envelope = await bindAccountSync()
                    replace(normalizeProgress(envelope.progress))
                    setPassword('')
                    setMessage('已登入')
                  })
                }
              >
                登入
              </button>
              <button
                type="button"
                className="primary ghost"
                disabled={busy || !email || password.length < 6}
                onClick={() =>
                  run(async () => {
                    const result = await signUp(email, password)
                    if (result.needsConfirm) {
                      setMessage('請到信箱點確認連結，再回來登入')
                      return
                    }
                    const envelope = await bindAccountSync()
                    replace(normalizeProgress(envelope.progress))
                    setPassword('')
                    setMessage('已註冊並同步')
                  })
                }
              >
                註冊
              </button>
            </div>
            <button
              type="button"
              className="linkish"
              disabled={busy || !email}
              onClick={() =>
                run(async () => {
                  await requestPasswordReset(email)
                  setMessage('重設信已寄出')
                })
              }
            >
              忘記密碼
            </button>
          </div>
        )}
      </div>
      <Fold label="同步">
        <p>用 Google 或信箱登入後，電腦和手機共用同一份進度。以最新寫入為準。</p>
        {auth || sync.code ? <p>{formatStamp(sync.lastPushAt ?? sync.lastPullAt)}</p> : null}
      </Fold>

      <Fold label="同步碼">
        {sync.code ? (
          <div className="stack-btns">
            <div className="sync-row">
              <span className="sync-code">{formatSyncCode(sync.code)}</span>
              <IconButton
                icon="copy"
                label="複製同步碼"
                onClick={() => void navigator.clipboard.writeText(sync.code ?? '')}
              />
            </div>
            <button type="button" className="primary ghost" disabled={busy} onClick={() => unbindSync()}>
              解除同步碼
            </button>
          </div>
        ) : (
          <div className="stack-btns">
            <p>沒有帳號時可用八碼同步。有帳號後以帳號為準。</p>
            <button
              type="button"
              className="primary ghost"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const code = await createSyncCode()
                  setMessage(formatSyncCode(code))
                })
              }
            >
              建立同步碼
            </button>
            <input
              className="field"
              value={joinCode}
              placeholder="XXXX-XXXX"
              aria-label="同步碼"
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
                  setMessage('已連上')
                })
              }
            >
              加入
            </button>
          </div>
        )}
      </Fold>

      <Fold
        label={
          <>
            <Icon name="download" />
            本機
          </>
        }
      >
        <p>
          {formatStamp(status?.lastSavedAt ?? null)}
          {status?.fileBound ? ` · ${status.fileName ?? '已綁定'}` : ''}
        </p>
        <div className="stack-btns">
          <button
            type="button"
            className="primary ghost"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await downloadBackup(progress)
                setMessage('已下載')
              })
            }
          >
            匯出
          </button>
          <button type="button" className="primary ghost" disabled={busy} onClick={() => fileInput.current?.click()}>
            還原
          </button>
          <input
            ref={fileInput}
            className="sr-only"
            aria-hidden
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
                setMessage('已還原')
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
                    setMessage(name)
                  })
                }
              >
                綁定新檔
              </button>
              <button
                type="button"
                className="primary ghost"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const envelope = await connectBackupFile()
                    replace(normalizeProgress(envelope.progress))
                    setMessage('已連到檔')
                  })
                }
              >
                連到既有檔
              </button>
              {status.fileBound && (
                <button
                  type="button"
                  className="primary ghost"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await unbindBackupFile()
                      setMessage('已解除')
                    })
                  }
                >
                  解除綁定
                </button>
              )}
            </>
          )}
        </div>
      </Fold>

      {message && <p className="backup-msg">{message}</p>}

      <Fold label="重設">
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
          清除進度
        </button>
      </Fold>
    </div>
  )
}
