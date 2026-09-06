import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { formatSyncCode, readSyncMeta, type SyncMeta } from '../../lib/sync'

function Icon({ name }: { name: 'course' | 'bank' | 'full' | 'settings' }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const
  if (name === 'course') {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 17V9" />
        <path d="M12 17V7" />
        <path d="M16 17v-5" />
      </svg>
    )
  }
  if (name === 'bank') {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    )
  }
  if (name === 'full') {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" {...common} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

const tabs = [
  { to: '/', label: '課程', name: 'course' as const, match: (path: string) => path === '/' || path.startsWith('/course') || path.startsWith('/lesson') || path.startsWith('/word') || path.startsWith('/review') },
  { to: '/bank', label: '題庫', name: 'bank' as const, match: (path: string) => path.startsWith('/bank') },
  { to: '/full', label: '全題', name: 'full' as const, match: (path: string) => path.startsWith('/full') },
  { to: '/settings', label: '設定', name: 'settings' as const, match: (path: string) => path.startsWith('/settings') },
]

function immersive(path: string): boolean {
  return (
    path.startsWith('/lesson/') ||
    path.startsWith('/review') ||
    /^\/bank\/.+/.test(path) ||
    /^\/full\/.+/.test(path)
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const hideNav = immersive(pathname)
  const [meta, setMeta] = useState<SyncMeta>(() => readSyncMeta())
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const onMeta = (event: Event) => {
      const detail = (event as CustomEvent<SyncMeta>).detail
      if (detail) setMeta(detail)
      else setMeta(readSyncMeta())
    }
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('wordlist-sync-meta', onMeta)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('wordlist-sync-meta', onMeta)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return (
    <div className="app-root">
      <header className="app-header">
        <p className="app-brand">WordList</p>
        <NavLink className="ui-chip ui-pressable" to="/settings">
          {meta.code ? formatSyncCode(meta.code) : '本機'}
        </NavLink>
      </header>
      {meta.code && (
        <div className="page" style={{ padding: '8px 20px 0' }}>
          <p className={`ui-sync-banner ${!online || meta.lastError ? 'is-warn' : ''}`}>
            {!online
              ? '離線 · 變更仍會先存在這台裝置'
              : meta.lastError
                ? meta.lastError
                : '跨裝置同步已開啟 · 以最新寫入為準'}
          </p>
        </div>
      )}
      <main className={`app-main ${hideNav ? 'app-main--immersive' : ''}`}>{children}</main>
      {!hideNav && (
        <nav className="app-nav" aria-label="主選單">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={tab.match(pathname) ? 'is-on' : ''} end={tab.to === '/'}>
              <Icon name={tab.name} />
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
