import { captureAuthRedirect, getAccessToken, readAuth } from './auth'
import { cloudRpc } from './cloud'
import type { ProgressEnvelope } from './persist'
import { persistEnvelope, pickNewest, readLocalEnvelope, toEnvelope } from './persist'
import { normalizeProgress } from './progress'

const META_KEY = 'wordlist.sync.v2'
const PUSH_WAIT_MS = 1600
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

type RemoteRow = {
  blob?: string
  saved_at?: number
}

export type SyncMeta = {
  code: string | null
  lastPullAt: number | null
  lastPushAt: number | null
  lastError: string | null
}

let pushTimer: number | null = null
let pushing = false

function emptyMeta(): SyncMeta {
  return { code: null, lastPullAt: null, lastPushAt: null, lastError: null }
}

export function readSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return emptyMeta()
    const parsed = JSON.parse(raw) as Partial<SyncMeta>
    return {
      code: typeof parsed.code === 'string' ? parsed.code : null,
      lastPullAt: parsed.lastPullAt ?? null,
      lastPushAt: parsed.lastPushAt ?? null,
      lastError: parsed.lastError ?? null,
    }
  } catch {
    return emptyMeta()
  }
}

function writeSyncMeta(meta: SyncMeta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
  window.dispatchEvent(new CustomEvent('wordlist-sync-meta', { detail: meta }))
}

export function isCloudBound(): boolean {
  return Boolean(readAuth() || readSyncMeta().code)
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function toAb(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function transformBytes(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const output = new Blob([toAb(bytes)]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(output).arrayBuffer())
}

async function gzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  return transformBytes(bytes, new CompressionStream('gzip'))
}

async function gunzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  return transformBytes(bytes, new DecompressionStream('gzip'))
}

async function codeKey(code: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`wordlist:${code}`))
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function packEnvelope(envelope: ProgressEnvelope, code: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await codeKey(code)
  const zipped = await gzipBytes(new TextEncoder().encode(JSON.stringify(envelope)))
  const buffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toAb(iv) }, key, toAb(zipped))
  return JSON.stringify({
    app: 'wordlist-sync',
    version: 2,
    iv: bytesToB64(iv),
    data: bytesToB64(new Uint8Array(buffer)),
  })
}

async function unpackEnvelope(raw: string, code: string): Promise<ProgressEnvelope | null> {
  try {
    const payload = JSON.parse(raw) as { app?: string; iv?: string; data?: string }
    if (payload.app !== 'wordlist-sync' || !payload.iv || !payload.data) return null
    const key = await codeKey(code)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toAb(b64ToBytes(payload.iv)) },
      key,
      toAb(b64ToBytes(payload.data)),
    )
    const json = new TextDecoder().decode(await gunzipBytes(new Uint8Array(plain)))
    const parsed = JSON.parse(json) as ProgressEnvelope
    if (!parsed?.progress) return null
    return { app: 'wordlist', version: 1, savedAt: parsed.savedAt, progress: normalizeProgress(parsed.progress) }
  } catch {
    return null
  }
}

async function packAccount(envelope: ProgressEnvelope): Promise<string> {
  const zipped = await gzipBytes(new TextEncoder().encode(JSON.stringify(envelope)))
  return JSON.stringify({
    app: 'wordlist-account',
    version: 1,
    data: bytesToB64(zipped),
  })
}

async function unpackAccount(raw: string): Promise<ProgressEnvelope | null> {
  try {
    const payload = JSON.parse(raw) as { app?: string; data?: string }
    if (payload.app !== 'wordlist-account' || !payload.data) return null
    const json = new TextDecoder().decode(await gunzipBytes(b64ToBytes(payload.data)))
    const parsed = JSON.parse(json) as ProgressEnvelope
    if (!parsed?.progress) return null
    return { app: 'wordlist', version: 1, savedAt: parsed.savedAt, progress: normalizeProgress(parsed.progress) }
  } catch {
    return null
  }
}

function makeCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join('')
}

export function formatSyncCode(code: string): string {
  const compact = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (compact.length === 8) return `${compact.slice(0, 4)}-${compact.slice(4)}`
  return compact
}

export function normalizeJoinCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

function emitProgress(envelope: ProgressEnvelope): void {
  window.dispatchEvent(new CustomEvent('wordlist-remote-progress', { detail: envelope }))
}

function firstRow(rows: RemoteRow[] | RemoteRow | null): RemoteRow | null {
  if (!rows) return null
  return Array.isArray(rows) ? (rows[0] ?? null) : rows
}

async function getRemoteCode(code: string): Promise<ProgressEnvelope | null> {
  const row = firstRow(await cloudRpc<RemoteRow[] | RemoteRow | null>('wordlist_get_sync', { p_code: code }))
  if (!row?.blob) return null
  const envelope = await unpackEnvelope(row.blob, code)
  if (!envelope) throw new Error('雲端紀錄無法讀取')
  return envelope
}

async function putRemoteCode(code: string, envelope: ProgressEnvelope): Promise<void> {
  await cloudRpc<boolean>('wordlist_put_sync', {
    p_code: code,
    p_blob: await packEnvelope(envelope, code),
    p_saved_at: envelope.savedAt,
  })
}

async function getRemoteAccount(token: string): Promise<ProgressEnvelope | null> {
  const row = firstRow(await cloudRpc<RemoteRow[] | RemoteRow | null>('wordlist_get_account', {}, token))
  if (!row?.blob) return null
  return unpackAccount(row.blob)
}

async function putRemoteAccount(token: string, envelope: ProgressEnvelope): Promise<void> {
  await cloudRpc<boolean>(
    'wordlist_put_account',
    {
      p_blob: await packAccount(envelope),
      p_saved_at: envelope.savedAt,
    },
    token,
  )
}

async function mergeAndStore(remote: ProgressEnvelope | null): Promise<ProgressEnvelope> {
  const local = readLocalEnvelope()
  const winner = pickNewest(local, remote) ?? remote ?? local ?? toEnvelope(normalizeProgress(null))
  const stamped = { ...winner, savedAt: Date.now() }
  await persistEnvelope(stamped)
  emitProgress(stamped)
  return stamped
}

export async function pullRemote(): Promise<ProgressEnvelope | null> {
  const token = await getAccessToken()
  const meta = readSyncMeta()
  try {
    let remote: ProgressEnvelope | null = null
    if (token) remote = await getRemoteAccount(token)
    else if (meta.code) remote = await getRemoteCode(meta.code)
    else return null
    writeSyncMeta({ ...readSyncMeta(), lastPullAt: Date.now(), lastError: null })
    if (!remote) return null
    const local = readLocalEnvelope()
    if (remote.savedAt >= (local?.savedAt ?? 0)) {
      await persistEnvelope(remote)
      emitProgress(remote)
    }
    return remote
  } catch (error) {
    writeSyncMeta({
      ...readSyncMeta(),
      lastError: error instanceof Error ? error.message : '同步失敗',
    })
    return null
  }
}

export async function pushRemote(): Promise<void> {
  const envelope = readLocalEnvelope()
  if (!envelope || pushing) return
  const token = await getAccessToken()
  const meta = readSyncMeta()
  if (!token && !meta.code) return
  pushing = true
  try {
    if (token) await putRemoteAccount(token, envelope)
    else if (meta.code) await putRemoteCode(meta.code, envelope)
    writeSyncMeta({ ...readSyncMeta(), lastPushAt: Date.now(), lastError: null })
  } catch (error) {
    writeSyncMeta({
      ...readSyncMeta(),
      lastError: error instanceof Error ? error.message : '同步失敗',
    })
  } finally {
    pushing = false
  }
}

export function queueRemotePush(): void {
  if (!isCloudBound()) return
  if (pushTimer) window.clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => {
    void pushRemote()
  }, PUSH_WAIT_MS)
}

export async function bindAccountSync(): Promise<ProgressEnvelope> {
  const token = await getAccessToken()
  if (!token) throw new Error('請先登入')
  const remote = await getRemoteAccount(token)
  const stamped = await mergeAndStore(remote)
  writeSyncMeta({
    ...readSyncMeta(),
    lastPullAt: Date.now(),
    lastPushAt: Date.now(),
    lastError: null,
  })
  await putRemoteAccount(token, stamped)
  return stamped
}

export async function createSyncCode(): Promise<string> {
  const envelope = readLocalEnvelope() ?? toEnvelope(normalizeProgress(null))
  const code = makeCode()
  await putRemoteCode(code, envelope)
  writeSyncMeta({
    code,
    lastPullAt: Date.now(),
    lastPushAt: Date.now(),
    lastError: null,
  })
  return code
}

export async function joinSyncCode(raw: string): Promise<ProgressEnvelope> {
  const code = normalizeJoinCode(raw)
  if (code.length !== 8) throw new Error('同步碼須為八碼')
  const remote = await getRemoteCode(code)
  if (!remote) throw new Error('找不到這個同步碼')
  const stamped = await mergeAndStore(remote)
  writeSyncMeta({
    code,
    lastPullAt: Date.now(),
    lastPushAt: Date.now(),
    lastError: null,
  })
  void pushRemote()
  return stamped
}

export function unbindSync(): void {
  writeSyncMeta(emptyMeta())
}

export function startSyncLoop(): () => void {
  const onPersist = () => queueRemotePush()
  const onVisible = () => {
    if (document.visibilityState === 'visible') void pullRemote()
  }
  const onAuth = () => {
    if (readAuth()) void pullRemote()
  }
  window.addEventListener('wordlist-persisted', onPersist)
  window.addEventListener('wordlist-auth', onAuth)
  document.addEventListener('visibilitychange', onVisible)
  void (async () => {
    const fromLink =
      /access_token=/.test(window.location.hash) || new URLSearchParams(window.location.search).has('code')
    await captureAuthRedirect()
    if (fromLink && readAuth()) await bindAccountSync().catch(() => void pullRemote())
    else await pullRemote()
  })()
  const timer = window.setInterval(() => {
    if (document.visibilityState === 'visible' && navigator.onLine) void pullRemote()
  }, 25000)
  return () => {
    window.removeEventListener('wordlist-persisted', onPersist)
    window.removeEventListener('wordlist-auth', onAuth)
    document.removeEventListener('visibilitychange', onVisible)
    window.clearInterval(timer)
    if (pushTimer) window.clearTimeout(pushTimer)
  }
}
