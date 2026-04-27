import { openDB, type IDBPDatabase } from 'idb'
import { supabase } from './supabase'

interface QueueItem {
  id: string
  table: string
  operation: 'insert' | 'update' | 'soft_delete'
  data: Record<string, unknown>
  timestamp: number
}

const DB_NAME = 'bailoteo-offline'
const STORE = 'queue'
let db: IDBPDatabase | null = null

async function getDB() {
  if (!db) {
    db = await openDB(DB_NAME, 1, {
      upgrade(d) {
        d.createObjectStore(STORE, { keyPath: 'id' })
      },
    })
  }
  return db
}

export async function queueMutation(
  item: Omit<QueueItem, 'id' | 'timestamp'>
): Promise<void> {
  const store = await getDB()
  const entry: QueueItem = { ...item, id: crypto.randomUUID(), timestamp: Date.now() }
  await store.add(STORE, entry)
  if (navigator.onLine) await flushQueue()
}

export async function flushQueue(): Promise<void> {
  const store = await getDB()
  const items: QueueItem[] = await store.getAll(STORE)
  const sorted = items.sort((a, b) => a.timestamp - b.timestamp)

  for (const item of sorted) {
    try {
      if (item.operation === 'insert') {
        const { error } = await supabase.from(item.table).insert(item.data)
        if (error) throw error
      } else if (item.operation === 'update') {
        const { error } = await supabase
          .from(item.table)
          .update(item.data)
          .eq('id', item.data.id as string)
        if (error) throw error
      } else if (item.operation === 'soft_delete') {
        const { error } = await supabase
          .from(item.table)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', item.data.id as string)
        if (error) throw error
      }
      await store.delete(STORE, item.id)
    } catch {
      // Leave in queue; retry on next flush
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flushQueue() })
}
