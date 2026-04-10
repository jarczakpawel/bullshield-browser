import structuredClone from '@ungap/structured-clone'
import { deepFreeze } from '~/shared'
import { buildFingerprintProfile } from '~/shared/fingerprint/profile'
import type { DeepWriteable } from '~/types'
import type { ReadonlyUserAgentState } from '~/shared/types'
import type StorageArea from './storage-area'

type UserAgentState = DeepWriteable<ReadonlyUserAgentState>

type LegacyUseragentInfo = {
  info?: {
    useragent?: string
    userAgent?: string
    engine?: 'webkit' | 'blink' | 'gecko' | 'unknown'
    osType?: 'windows' | 'linux' | 'macOS' | 'iOS' | 'android' | 'unknown'
    browser?: 'chrome' | 'firefox' | 'opera' | 'safari' | 'edge' | 'unknown'
    browserVersion?: { major: number; full: string }
    brandBrowserVersion?: { major: number; full: string }
  }
}

const normalizeState = (state: UserAgentState): ReadonlyUserAgentState =>
  deepFreeze({
    ...structuredClone(state),
    fingerprint: state.fingerprint || buildFingerprintProfile(state),
  })

const isValidUserAgent = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const normalizeLegacyState = (legacy: LegacyUseragentInfo): ReadonlyUserAgentState | undefined => {
  const userAgent = isValidUserAgent(legacy.info?.userAgent)
    ? legacy.info.userAgent.trim()
    : isValidUserAgent(legacy.info?.useragent)
      ? legacy.info.useragent.trim()
      : ''

  if (!userAgent) {
    return undefined
  }

  return normalizeState({
    userAgent,
    browser: legacy.info?.browser || 'unknown',
    os: legacy.info?.osType || 'unknown',
    version: {
      browser: legacy.info?.brandBrowserVersion || legacy.info?.browserVersion || { major: 0, full: '0.0.0' },
      underHood: legacy.info?.brandBrowserVersion ? legacy.info?.browserVersion : undefined,
    },
  })
}

const normalizeModernState = (loaded: UserAgentState): ReadonlyUserAgentState | undefined => {
  if (!isValidUserAgent(loaded.userAgent)) {
    return undefined
  }

  return normalizeState({
    ...loaded,
    userAgent: loaded.userAgent.trim(),
    browser: loaded.browser || 'unknown',
    os: loaded.os || 'unknown',
    version: {
      browser: loaded.version?.browser || { major: 0, full: '0.0.0' },
      underHood: loaded.version?.underHood,
    },
  })
}

const normalizeLoadedState = (loaded: UserAgentState | LegacyUseragentInfo): ReadonlyUserAgentState | undefined => {
  if ('info' in loaded && typeof loaded.info === 'object') {
    return normalizeLegacyState(loaded)
  }

  return normalizeModernState(loaded as UserAgentState)
}

export default class {
  private readonly storage: StorageArea<UserAgentState>

  /** A list of change listeners */
  private changeListeners: Array<(newState: ReadonlyUserAgentState) => void> = []

  constructor(storage: StorageArea<UserAgentState>) {
    this.storage = storage
  }

  /** Adds a change listener. */
  onChange(callback: (newState: ReadonlyUserAgentState) => void): void {
    this.changeListeners.push(callback)
  }

  /**
   * Retrieves the current user-agent state.
   *
   * @throws {Error} If the state cannot be loaded.
   */
  async get(): Promise<ReadonlyUserAgentState | undefined> {
    const loaded = await this.storage.get()

    if (loaded) {
      return normalizeLoadedState(loaded)
    }
  }

  /**
   * Update the current user-agent state. Listeners are notified about the changes.
   *
   * @throws {Error} If the state cannot be updated.
   */
  async update(updated: UserAgentState): Promise<ReadonlyUserAgentState> {
    const current = await this.storage.get()

    if (JSON.stringify(current) !== JSON.stringify(updated)) {
      await this.storage.set(updated)

      const clone = normalizeState(updated)

      this.changeListeners.forEach((listener) => queueMicrotask(() => listener(clone)))

      return clone
    }

    return normalizeState(updated)
  }
}
