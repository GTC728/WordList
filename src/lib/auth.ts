import { authRedirectTo, cloudAuth, cloudConfig } from './cloud'

const AUTH_KEY = 'wordlist.auth.v1'
const REFRESH_SKEW_MS = 60_000

export type AuthUser = {
  id: string
  email: string
}

export type AuthSession = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: { id?: string; email?: string }
  session?: TokenResponse | null
}

let refreshWait: Promise<string | null> | null = null
const PKCE_KEY = 'wordlist.pkce'

function pkceVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return bytesToB64Url(bytes)
}

function bytesToB64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return bytesToB64Url(new Uint8Array(digest))
}

function empty(): AuthSession | null {
  return null
}

export function readAuth(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user?.id) return empty()
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt ?? 0,
      user: {
        id: parsed.user.id,
        email: parsed.user.email ?? '',
      },
    }
  } catch {
    return empty()
  }
}

function writeAuth(session: AuthSession | null): void {
  if (session) localStorage.setItem(AUTH_KEY, JSON.stringify(session))
  else localStorage.removeItem(AUTH_KEY)
  window.dispatchEvent(new CustomEvent('wordlist-auth', { detail: session }))
}

function toSession(payload: TokenResponse): AuthSession | null {
  const row = payload.access_token ? payload : payload.session
  if (!row?.access_token || !row.refresh_token || !row.user?.id) return null
  const expiresIn = typeof row.expires_in === 'number' ? row.expires_in : 3600
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: Date.now() + expiresIn * 1000,
    user: {
      id: row.user.id,
      email: row.user.email ?? '',
    },
  }
}

function emailOk(raw: string): string {
  const email = raw.trim().toLowerCase()
  if (!email.includes('@') || email.length < 5) throw new Error('請輸入有效信箱')
  return email
}

function passwordOk(raw: string): string {
  if (raw.length < 6) throw new Error('密碼至少 6 個字')
  return raw
}

async function saveFromToken(payload: TokenResponse): Promise<AuthSession> {
  const session = toSession(payload)
  if (!session) throw new Error('登入沒有完成')
  writeAuth(session)
  return session
}

export async function getAccessToken(): Promise<string | null> {
  const session = readAuth()
  if (!session) return null
  if (session.expiresAt - REFRESH_SKEW_MS > Date.now()) return session.accessToken
  if (refreshWait) return refreshWait
  refreshWait = (async () => {
    try {
      const next = await cloudAuth<TokenResponse>('/auth/v1/token?grant_type=refresh_token', {
        body: { refresh_token: session.refreshToken },
      })
      const saved = await saveFromToken({
        ...next,
        refresh_token: next.refresh_token || session.refreshToken,
        user: next.user ?? { id: session.user.id, email: session.user.email },
      })
      return saved.accessToken
    } catch {
      writeAuth(null)
      return null
    } finally {
      refreshWait = null
    }
  })()
  return refreshWait
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  if (!cloudConfig()) throw new Error('尚未設定雲端同步')
  const payload = await cloudAuth<TokenResponse>('/auth/v1/token?grant_type=password', {
    body: { email: emailOk(email), password: passwordOk(password) },
  })
  return saveFromToken(payload)
}

export async function signUp(
  email: string,
  password: string,
): Promise<{ session: AuthSession | null; needsConfirm: boolean }> {
  if (!cloudConfig()) throw new Error('尚未設定雲端同步')
  const redirectTo = encodeURIComponent(authRedirectTo())
  const payload = await cloudAuth<TokenResponse>(`/auth/v1/signup?redirect_to=${redirectTo}`, {
    body: { email: emailOk(email), password: passwordOk(password) },
  })
  const session = toSession(payload)
  if (session) {
    writeAuth(session)
    return { session, needsConfirm: false }
  }
  return { session: null, needsConfirm: true }
}

export async function signInWithGoogle(): Promise<void> {
  const cloud = cloudConfig()
  if (!cloud) throw new Error('尚未設定雲端同步')
  const verifier = pkceVerifier()
  sessionStorage.setItem(PKCE_KEY, verifier)
  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: authRedirectTo(),
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: 's256',
  })
  window.location.assign(`${cloud.url}/auth/v1/authorize?${params}`)
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!cloudConfig()) throw new Error('尚未設定雲端同步')
  const redirectTo = encodeURIComponent(authRedirectTo())
  await cloudAuth<unknown>(`/auth/v1/recover?redirect_to=${redirectTo}`, {
    body: { email: emailOk(email) },
  })
}

export async function signOut(): Promise<void> {
  const session = readAuth()
  if (session) {
    try {
      await cloudAuth<unknown>('/auth/v1/logout', {
        token: session.accessToken,
        body: {},
      })
    } catch {
      /* 仍清本機登入 */
    }
  }
  writeAuth(null)
}

export async function captureAuthRedirect(): Promise<AuthSession | null> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const verifier = sessionStorage.getItem(PKCE_KEY)
  if (code && verifier) {
    sessionStorage.removeItem(PKCE_KEY)
    params.delete('code')
    const clean = params.toString()
    history.replaceState(null, '', `${window.location.pathname}${clean ? `?${clean}` : ''}`)
    const payload = await cloudAuth<TokenResponse>('/auth/v1/token?grant_type=pkce', {
      body: { auth_code: code, code_verifier: verifier },
    })
    return saveFromToken(payload)
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const access = hash.get('access_token')
  const refresh = hash.get('refresh_token')
  const expires = Number(hash.get('expires_in') || '3600')
  if (!access || !refresh) return readAuth()
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  let email = ''
  let id = ''
  try {
    const user = await cloudAuth<{ id?: string; email?: string }>('/auth/v1/user', {
      method: 'GET',
      token: access,
    })
    id = user.id ?? ''
    email = user.email ?? ''
  } catch {
    id = ''
  }
  if (!id) return readAuth()
  const session: AuthSession = {
    accessToken: access,
    refreshToken: refresh,
    expiresAt: Date.now() + expires * 1000,
    user: { id, email },
  }
  writeAuth(session)
  return session
}

export function authChipLabel(email: string): string {
  const local = email.split('@')[0] || email
  return local.length > 14 ? `${local.slice(0, 14)}…` : local
}
