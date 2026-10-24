import { type z } from 'zod'

type StorageKind = 'local' | 'session'

function storageOf(kind: StorageKind): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

/** Reads and validates a JSON value; corrupt or outdated data is discarded. */
export function readStored<TSchema extends z.ZodType>(
  kind: StorageKind,
  key: string,
  schema: TSchema,
): z.output<TSchema> | null {
  const raw = storageOf(kind)?.getItem(key)
  if (!raw) return null
  try {
    const parsed = schema.safeParse(JSON.parse(raw))
    if (parsed.success) return parsed.data
  } catch {
    // fall through to cleanup
  }
  storageOf(kind)?.removeItem(key)
  return null
}

export function writeStored(kind: StorageKind, key: string, value: unknown): void {
  try {
    storageOf(kind)?.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage blocked: state stays in memory only.
  }
}

export function removeStored(kind: StorageKind, key: string): void {
  try {
    storageOf(kind)?.removeItem(key)
  } catch {
    // ignore
  }
}
