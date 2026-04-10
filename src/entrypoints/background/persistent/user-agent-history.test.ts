import { describe, expect, test } from 'vitest'
import UserAgentHistory from './user-agent-history'
import StorageArea from './storage-area'
import type { ReadonlySettingsState, ReadonlyUserAgentState } from '~/shared/types'

class StorageAreaMock extends StorageArea {
  private state?: Record<string, unknown>

  async clear(): Promise<void> {
    this.state = undefined
  }

  async set<T>(v: T): Promise<void> {
    this.state = JSON.parse(JSON.stringify(v)) as Record<string, unknown>
  }

  async get<T>(): Promise<T | undefined> {
    return this.state as T | undefined
  }
}

const snapshot: ReadonlyUserAgentState = {
  userAgent: 'Mozilla/5.0 Test',
  browser: 'chrome',
  os: 'windows',
  version: { browser: { major: 123, full: '123.0.0.0' } },
} as const

const settingsSnapshot: ReadonlySettingsState = {
  enabled: true,
  renew: { enabled: false, intervalMillis: 600000, onStartup: false },
  jsProtection: { enabled: true },
  privacy: {
    blockLocalFonts: false,
    blockMediaDeviceEnumeration: false,
    blockWebGpu: false,
    hidePdfViewer: false,
    hideSensitiveDeviceApis: false,
  },
  fingerprint: {
    hardwareConcurrency: 'real',
    deviceMemory: 'off',
    screen: 'random',
    fonts: 'random',
    webgl: 'random',
    canvas: 'random',
    audio: 'random',
    localeMode: 'static',
    localePreset: 'pl-PL',
    timezone: 'static',
    timezonePreset: 'Europe/Warsaw',
    domRect: 'real',
    textMetrics: 'real',
    mathFingerprint: 'random',
    speechVoices: 'off',
    webrtc: 'off',
    battery: 'off',
    clientHints: 'real',
    cssMediaQuery: { mode: 'static', preset: '390x844@3' },
  },
  generator: {
    types: ['chrome_win', 'chrome_linux'],
    syncOsWithHost: true,
  },
  blacklist: {
    mode: 'blacklist',
    domains: ['localhost'],
  },
} as const

describe('user-agent history', () => {
  test('stores settings snapshot with history entry', async () => {
    const history = new UserAgentHistory(new StorageAreaMock('history', 'local'))

    const entry = await history.add(snapshot, settingsSnapshot)

    expect(entry.snapshot.userAgent).toBe(snapshot.userAgent)
    expect(entry.settingsSnapshot?.fingerprint.localeMode).toBe('static')
    expect(entry.settingsSnapshot?.fingerprint.cssMediaQuery.mode).toBe('static')
    expect(entry.settingsSnapshot?.generator.syncOsWithHost).toBe(true)

    const [loaded] = await history.get()
    expect(loaded.settingsSnapshot?.fingerprint.timezonePreset).toBe('Europe/Warsaw')
    expect(loaded.settingsSnapshot?.fingerprint.deviceMemory).toBe('off')
  })

  test('keeps compatibility when settings snapshot is missing', async () => {
    const history = new UserAgentHistory(new StorageAreaMock('history', 'local'))

    const entry = await history.add(snapshot)

    expect(entry.settingsSnapshot).toBeUndefined()

    const [loaded] = await history.get()
    expect(loaded.settingsSnapshot).toBeUndefined()
  })
})
