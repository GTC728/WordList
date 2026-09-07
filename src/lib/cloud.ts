const DEFAULT_URL = 'https://bkonkqgbzezwgnrqxemg.supabase.co'
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrb25rcWdiemV6d2ducnF4ZW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMDkwMjIsImV4cCI6MjA5ODU4NTAyMn0.UFHalhI3v5H5q5Klb3syndTvkOh7Tv7l6JH31QigDO0'

export type CloudConfig = {
  url: string
  anonKey: string
}

export function cloudConfig(): CloudConfig | null {
  const url = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL).trim().replace(/\/$/, '')
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY).trim()
  if (!url || !anonKey) return null
  return { url, anonKey }
}

export function authRedirectTo(): string {
  const base = import.meta.env.BASE_URL || '/'
  const path = base.endsWith('/') ? base : `${base}/`
  return `${window.location.origin}${path}`
}

type ErrorBody = {
  message?: string
  msg?: string
  error_description?: string
  error?: string
}

export function cloudErrorMessage(status: number, body: unknown, fallback: string): string {
  const parsed = body as ErrorBody
  const detail = parsed.message || parsed.msg || parsed.error_description || parsed.error || ''
  const lower = detail.toLowerCase()
  if (detail === 'bad code' || detail === 'bad payload') return '同步資料無效'
  if (detail === 'not signed in') return '請先登入'
  if (status === 401 || lower.includes('invalid login')) return '信箱或密碼不對'
  if (lower.includes('email not confirmed')) return '請先到信箱點確認連結'
  if (lower.includes('already registered') || lower.includes('already been registered')) return '這個信箱已註冊，請登入'
  if (lower.includes('password')) return '密碼至少 6 個字'
  if (lower.includes('rate limit') || status === 429) return '試太多次，請稍後再試'
  if (lower.includes('confirmation email') || lower.includes('error sending')) return '確認信寄不出來，請改用 Google 登入'
  if (status >= 500) return '雲端暫時無法使用，請稍後再試'
  return fallback
}

export async function cloudAuth<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string | null },
): Promise<T> {
  const cloud = cloudConfig()
  if (!cloud) throw new Error('尚未設定雲端同步')
  const token = init.token || cloud.anonKey
  const response = await fetch(`${cloud.url}${path}`, {
    method: init.method ?? 'POST',
    headers: {
      apikey: cloud.anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  let parsed: unknown = null
  const text = await response.text()
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      parsed = { message: text }
    }
  }
  if (!response.ok) {
    throw new Error(cloudErrorMessage(response.status, parsed, '做不到，請再試一次'))
  }
  return parsed as T
}

export async function cloudRpc<T>(
  name: string,
  body: Record<string, unknown>,
  accessToken?: string | null,
): Promise<T> {
  const cloud = cloudConfig()
  if (!cloud) throw new Error('尚未設定雲端同步')
  const token = accessToken || cloud.anonKey
  const response = await fetch(`${cloud.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: cloud.anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    let parsed: unknown = null
    try {
      parsed = await response.json()
    } catch {
      parsed = null
    }
    throw new Error(cloudErrorMessage(response.status, parsed, '同步失敗，請稍後再試'))
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
