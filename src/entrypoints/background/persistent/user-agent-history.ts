import structuredClone from '@ungap/structured-clone'
import { deepFreeze } from '~/shared'
import type { ReadonlySettingsState, ReadonlyUserAgentHistoryEntry, ReadonlyUserAgentState } from '~/shared/types'
import type StorageArea from './storage-area'

type HistoryState = {
  items: ReadonlyUserAgentHistoryEntry[]
}

const maxItems = 200

export default class {
  private readonly storage: StorageArea<HistoryState>

  constructor(storage: StorageArea<HistoryState>) {
    this.storage = storage
  }

  async get(): Promise<ReadonlyArray<ReadonlyUserAgentHistoryEntry>> {
    const loaded = await this.storage.get()
    return deepFreeze(structuredClone(loaded?.items || []))
  }

  async find(id: string): Promise<ReadonlyUserAgentHistoryEntry | undefined> {
    return (await this.get()).find((item) => item.id === id)
  }

  async add(snapshot: ReadonlyUserAgentState, settingsSnapshot?: ReadonlySettingsState): Promise<ReadonlyUserAgentHistoryEntry> {
    const next: ReadonlyUserAgentHistoryEntry = deepFreeze({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      addedAt: new Date().toISOString(),
      snapshot: deepFreeze(structuredClone(snapshot)),
      settingsSnapshot: settingsSnapshot ? deepFreeze(structuredClone(settingsSnapshot)) : undefined,
    })

    const current = await this.get()
    await this.storage.set({ items: [next, ...current].slice(0, maxItems) as ReadonlyUserAgentHistoryEntry[] })

    return next
  }

  async remove(id: string): Promise<ReadonlyArray<ReadonlyUserAgentHistoryEntry>> {
    const next = (await this.get()).filter((item) => item.id !== id) as ReadonlyUserAgentHistoryEntry[]
    await this.storage.set({ items: next as ReadonlyUserAgentHistoryEntry[] })
    return deepFreeze(structuredClone(next))
  }

  async clear(): Promise<void> {
    await this.storage.set({ items: [] })
  }
}
