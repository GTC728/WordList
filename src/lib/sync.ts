import type { ProgressEnvelope } from './persist'
import { persistEnvelope, pickNewest, readLocalEnvelope, toEnvelope } from './persist'
import { normalizeProgress } from './progress'

const META_KEY = 'wordlist.sync.v1'
const NS = 'wordlist-pwa'
const BASE = `https://mantledb.sh/v2/${NS}`
const PUSH_WAIT_MS = 1600
const CHUNK = 24000
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

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

async function pipeBytes(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter()
  await writer.write(toAb(bytes))
  await writer.close()
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

async function gzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  return pipeBytes(bytes, new CompressionStream('gzip'))
}

async function gunzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  return pipeBytes(bytes, new DecompressionStream('gzip'))
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

async function mantleGet(path: string): Promise<unknown | null> {
  const response = await fetch(`${BASE}/${path}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error('讀不到雲端紀錄')
  return response.json()
}

async function mantlePost(path: string, body: unknown): Promise<void> {
  const response = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error('寫不進雲端，請稍後再試')
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

async function getRemote(code: string): Promise<ProgressEnvelope | null> {
  const head = (await mantleGet(`${code}/head`)) as { n?: number } | null
  if (!head || typeof head.n !== 'number') return null
  let packed = ''
  for (let i = 0; i < head.n; i += 1) {
    const part = (await mantleGet(`${code}/${i}`)) as { c?: string } | null
    if (!part?.c) throw new Error('雲端紀錄不完整')
    packed += part.c
  }
  return unpackEnvelope(packed, code)
}

async function putRemote(code: string, envelope: ProgressEnvelope): Promise<void> {
  const packed = await packEnvelope(envelope, code)
  const parts = Math.max(1, Math.ceil(packed.length / CHUNK))
  await mantlePost(`${code}/head`, { n: parts, savedAt: envelope.savedAt })
  for (let i = 0; i < parts; i += 1) {
    await mantlePost(`${code}/${i}`, { c: packed.slice(i * CHUNK, (i + 1) * CHUNK) })
  }
}

export async function pullRemote(): Promise<ProgressEnvelope | null> {
  const meta = readSyncMeta()
  if (!meta.code) return null
  try {
    const remote = await getRemote(meta.code)
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
  const meta = readSyncMeta()
  const envelope = readLocalEnvelope()
  if (!meta.code || !envelope || pushing) return
  pushing = true
  try {
    await putRemote(meta.code, envelope)
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
  if (!readSyncMeta().code) return
  if (pushTimer) window.clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => {
    void pushRemote()
  }, PUSH_WAIT_MS)
}

export async function createSyncCode(): Promise<string> {
  const envelope = readLocalEnvelope() ?? toEnvelope(normalizeProgress(null))
  const code = makeCode()
  await putRemote(code, envelope)
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
  if (code.length < 6) throw new Error('同步碼太短')
  const remote = await getRemote(code)
  if (!remote) throw new Error('找不到這個同步碼')
  const local = readLocalEnvelope()
  const winner = pickNewest(local, remote) ?? remote
  const stamped = { ...winner, savedAt: Date.now() }
  await persistEnvelope(stamped)
  writeSyncMeta({
    code,
    lastPullAt: Date.now(),
    lastPushAt: Date.now(),
    lastError: null,
  })
  emitProgress(stamped)
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
  window.addEventListener('wordlist-persisted', onPersist)
  document.addEventListener('visibilitychange', onVisible)
  void pullRemote()
  const timer = window.setInterval(() => {
    if (document.visibilityState === 'visible' && navigator.onLine) void pullRemote()
  }, 25000)
  return () => {
    window.removeEventListener('wordlist-persisted', onPersist)
    document.removeEventListener('visibilitychange', onVisible)
    window.clearInterval(timer)
    if (pushTimer) window.clearTimeout(pushTimer)
  }
}
