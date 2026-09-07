import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Icon } from '../Icon'
import { authChipLabel, readAuth, type AuthSession } from '../../lib/auth'
import { formatSyncCode, readSyncMeta, type SyncMeta } from '../../lib/sync'

const tabs = [
  {
    to: '/',
    label: '課程',
    name: 'course' as const,
    match: (path: string) =>
      path === '/' ||
      path.startsWith('/course') ||
      path.startsWith('/lesson') ||
      path.startsWith('/word') ||
      path.startsWith('/review') ||
      path.startsWith('/practice') ||
      path.startsWith('/endless'),
  },
  {
    to: '/bank',
    label: '題庫',
    name: 'bank' as const,
    match: (path: string) => path.startsWith('/bank'),
  },
  {
    to: '/drill',
    label: '重溫',
    name: 'drill' as const,
    match: (path: string) => path.startsWith('/drill'),
  },
  {
    to: '/settings',
    label: '設定',
    name: 'settings' as const,
    match: (path: string) => path.startsWith('/settings'),
  },
]

function immersive(path: string): boolean {
  return (
    path.startsWith('/lesson/') ||
    path.startsWith('/review') ||
    /^\/practice\/.+/.test(path) ||
    path.startsWith('/endless/play') ||
    /\/drill\/[^/]+\/play/.test(path)
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const hideNav = immersive(pathname)
  const [meta, setMeta] = useState<SyncMeta>(() => readSyncMeta())
  const [auth, setAuth] = useState<AuthSession | null>(() => readAuth())
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const onMeta = (event: Event) => {
      const detail = (event as CustomEvent<SyncMeta>).detail
      if (detail) setMeta(detail)
      else setMeta(readSyncMeta())
    }
    const onAuth = () => setAuth(readAuth())
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('wordlist-sync-meta', onMeta)
    window.addEventListener('wordlist-auth', onAuth)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('wordlist-sync-meta', onMeta)
      window.removeEventListener('wordlist-auth', onAuth)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const bound = Boolean(auth || meta.code)
  const chip = auth ? authChipLabel(auth.user.email || '帳號') : meta.code ? formatSyncCode(meta.code) : null

  return (
    <div className="app-root">
      <a className="skip-link" href="#main">
        跳到內容
      </a>
      <header className="app-header">
        <p className="app-brand">WordList</p>
        <NavLink
          className={`ui-chip ui-pressable${chip ? '' : ' is-icon'}`}
          to="/settings"
          aria-label={chip ?? '本機'}
        >
          <Icon name={bound ? 'cloud' : 'device'} />
          {chip}
        </NavLink>
      </header>
      {bound && (!online || meta.lastError) && (
        <p className="ui-sync-banner is-warn">{!online ? '離線' : meta.lastError}</p>
      )}
      <main id="main" className={`app-main ${hideNav ? 'app-main--immersive' : ''}`}>
        {children}
      </main>
      {!hideNav && (
        <nav className="app-nav app-nav--4" aria-label="主選單">
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
