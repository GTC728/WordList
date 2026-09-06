import type { ProgressState } from '../types'

export const STORAGE_KEY = 'wordlist.progress.v1'
const DB_NAME = 'wordlist'
const DB_STORE = 'kv'

export type ProgressEnvelope = {
  app: 'wordlist'
  version: 1
  savedAt: number
  progress: ProgressState
}

export type BackupStatus = {
  lastSavedAt: number | null
  lastExportAt: number | null
  fileName: string | null
  fileBound: boolean
  fileWritable: boolean
  canBindFile: boolean
  persistent: boolean
}

type BackupFileHandle = {
  name: string
  getFile: () => Promise<File>
  createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>
  queryPermission: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
}

type FilePickerWindow = Window & {
  showSaveFilePicker?: (opts: {
    suggestedName?: string
    types?: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<BackupFileHandle>
  showOpenFilePicker?: (opts: {
    multiple?: boolean
    types?: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<BackupFileHandle[]>
}

const FILE_TYPES = [
  {
    description: 'WordList 備份',
    accept: { 'application/json': ['.json'] },
  },
]

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key)
      req.onsuccess = () => resolve(req.result as T | undefined)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return undefined
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function idbDel(key: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).delete(key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    /* ignore */
  }
}

export function canBindFile(): boolean {
  return typeof window !== 'undefined' && typeof (window as FilePickerWindow).showSaveFilePicker === 'function'
}

export function toEnvelope(progress: ProgressState, savedAt = Date.now()): ProgressEnvelope {
  return { app: 'wordlist', version: 1, savedAt, progress }
}

export function parseEnvelope(raw: unknown): ProgressEnvelope | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  if (data.app === 'wordlist' && data.progress && typeof data.progress === 'object') {
    const savedAt = typeof data.savedAt === 'number' ? data.savedAt : 0
    return {
      app: 'wordlist',
      version: 1,
      savedAt,
      progress: data.progress as ProgressState,
    }
  }
  if (Array.isArray(data.completedLessons) || data.bank || data.srs) {
    return {
      app: 'wordlist',
      version: 1,
      savedAt: 0,
      progress: data as unknown as ProgressState,
    }
  }
  return null
}

export function readLocalEnvelope(): ProgressEnvelope | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return parseEnvelope(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

function writeLocalEnvelope(envelope: ProgressEnvelope): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
}

async function filePermission(
  handle: BackupFileHandle,
  mode: 'read' | 'readwrite',
  prompt: boolean,
): Promise<boolean> {
  const options = { mode }
  if ((await handle.queryPermission(options)) === 'granted') return true
  if (!prompt) return false
  return (await handle.requestPermission(options)) === 'granted'
}

async function readHandleEnvelope(prompt: boolean): Promise<ProgressEnvelope | null> {
  const handle = await idbGet<BackupFileHandle>('fileHandle')
  if (!handle) return null
  try {
    if (!(await filePermission(handle, 'read', prompt))) return null
    const file = await handle.getFile()
    const text = await file.text()
    return parseEnvelope(JSON.parse(text) as unknown)
  } catch {
    return null
  }
}

async function writeHandleEnvelope(envelope: ProgressEnvelope): Promise<boolean> {
  const handle = await idbGet<BackupFileHandle>('fileHandle')
  if (!handle) return false
  try {
    if (!(await filePermission(handle, 'readwrite', false))) return false
    const writable = await handle.createWritable()
    await writable.write(`${JSON.stringify(envelope, null, 2)}\n`)
    await writable.close()
    return true
  } catch {
    return false
  }
}

export function pickNewest(...items: Array<ProgressEnvelope | null | undefined>): ProgressEnvelope | null {
  return items.reduce<ProgressEnvelope | null>((best, item) => {
    if (!item) return best
    if (!best || item.savedAt > best.savedAt) return item
    return best
  }, null)
}

export async function persistEnvelope(
  envelope: ProgressEnvelope,
  metaPatch?: Partial<BackupStatus>,
): Promise<void> {
  const existing = readLocalEnvelope()
  if (existing && existing.savedAt > envelope.savedAt) return
  writeLocalEnvelope(envelope)
  try {
    await idbSet('envelope', envelope)
  } catch {
    /* IndexedDB 可能被關 */
  }
  const wroteFile = await writeHandleEnvelope(envelope)
  try {
    const meta = (await idbGet<BackupStatus>('backupMeta')) ?? emptyStatus()
    await idbSet('backupMeta', {
      ...meta,
      lastSavedAt: envelope.savedAt,
      fileWritable: wroteFile,
      ...metaPatch,
    })
  } catch {
    /* 狀態寫不進去就不擋練習 */
  }
  window.dispatchEvent(new Event('wordlist-persisted'))
}

export async function hydrateEnvelope(): Promise<ProgressEnvelope | null> {
  const local = readLocalEnvelope()
  const idb = parseEnvelope(await idbGet<unknown>('envelope'))
  const file = await readHandleEnvelope(false)
  return pickNewest(local, idb, file)
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const local = readLocalEnvelope()
  const stored = (await idbGet<BackupStatus>('backupMeta')) ?? emptyStatus()
  const handle = await idbGet<BackupFileHandle>('fileHandle')
  let fileWritable = false
  if (handle) {
    try {
      fileWritable = await filePermission(handle, 'readwrite', false)
    } catch {
      fileWritable = false
    }
  }
  let persistent = false
  try {
    persistent = (await navigator.storage?.persisted?.()) ?? false
  } catch {
    persistent = false
  }
  return {
    lastSavedAt: stored.lastSavedAt ?? local?.savedAt ?? null,
    lastExportAt: stored.lastExportAt ?? null,
    fileName: stored.fileName,
    fileBound: Boolean(handle),
    fileWritable,
    canBindFile: canBindFile(),
    persistent,
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

function emptyStatus(): BackupStatus {
  return {
    lastSavedAt: null,
    lastExportAt: null,
    fileName: null,
    fileBound: false,
    fileWritable: false,
    canBindFile: canBindFile(),
    persistent: false,
  }
}

export async function downloadBackup(progress: ProgressState): Promise<void> {
  const envelope = toEnvelope(progress)
  const blob = new Blob([`${JSON.stringify(envelope, null, 2)}\n`], {
    type: 'application/json',
  })
  const stamp = new Date(envelope.savedAt).toISOString().slice(0, 10)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `wordlist-backup-${stamp}.json`
  link.click()
  URL.revokeObjectURL(url)
  await persistEnvelope(envelope)
  const meta = (await idbGet<BackupStatus>('backupMeta')) ?? emptyStatus()
  await idbSet('backupMeta', {
    ...meta,
    lastExportAt: envelope.savedAt,
    lastSavedAt: envelope.savedAt,
  })
}

export async function importBackupText(text: string): Promise<ProgressEnvelope> {
  const envelope = parseEnvelope(JSON.parse(text) as unknown)
  if (!envelope) throw new Error('不是 WordList 備份檔')
  const stamped = { ...envelope, savedAt: Date.now() }
  await persistEnvelope(stamped)
  const meta = (await idbGet<BackupStatus>('backupMeta')) ?? emptyStatus()
  await idbSet('backupMeta', { ...meta, lastExportAt: stamped.savedAt, lastSavedAt: stamped.savedAt })
  return stamped
}

export async function bindNewBackupFile(progress: ProgressState): Promise<string> {
  const picker = (window as FilePickerWindow).showSaveFilePicker
  if (!picker) throw new Error('這個瀏覽器不能綁定本機檔')
  const handle = await picker({
    suggestedName: 'wordlist-backup.json',
    types: FILE_TYPES,
  })
  await idbSet('fileHandle', handle)
  const envelope = toEnvelope(progress)
  await persistEnvelope(envelope)
  const name = handle.name
  await idbSet('backupMeta', {
    ...(await getBackupStatus()),
    fileName: name,
    fileBound: true,
    lastExportAt: envelope.savedAt,
  })
  return name
}

export async function connectBackupFile(): Promise<ProgressEnvelope> {
  const picker = (window as FilePickerWindow).showOpenFilePicker
  if (!picker) throw new Error('這個瀏覽器不能綁定本機檔')
  const [handle] = await picker({ multiple: false, types: FILE_TYPES })
  if (!handle) throw new Error('沒有選到檔案')
  await idbSet('fileHandle', handle)
  if (!(await filePermission(handle, 'readwrite', true))) {
    throw new Error('沒有這個檔的讀寫權限')
  }
  const file = await handle.getFile()
  const envelope = parseEnvelope(JSON.parse(await file.text()) as unknown)
  if (!envelope) throw new Error('不是 WordList 備份檔')
  const stamped = envelope.savedAt > 0 ? envelope : { ...envelope, savedAt: Date.now() }
  await persistEnvelope(stamped)
  await idbSet('backupMeta', {
    ...(await getBackupStatus()),
    fileName: handle.name,
    fileBound: true,
    lastExportAt: stamped.savedAt,
  })
  return stamped
}

export async function unbindBackupFile(): Promise<void> {
  await idbDel('fileHandle')
  const meta = await getBackupStatus()
  await idbSet('backupMeta', { ...meta, fileName: null, fileBound: false, fileWritable: false })
}

export function hasLearnedSomething(progress: ProgressState): boolean {
  return (
    progress.completedLessons.length > 0 ||
    Object.keys(progress.srs).length > 0 ||
    Object.keys(progress.bank).length > 0
  )
}
