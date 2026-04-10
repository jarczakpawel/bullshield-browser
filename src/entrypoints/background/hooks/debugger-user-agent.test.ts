import { describe, expect, it, vi } from 'vitest'

const noop = () => undefined
const event = () => ({ addListener: noop, removeListener: noop, hasListener: () => false })

const hostNavigator = {
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36',
  maxTouchPoints: 0,
}
const hostWindow = { navigator: hostNavigator }

globalThis.self = { window: hostWindow, navigator: hostNavigator } as unknown as typeof globalThis.self
Object.defineProperty(globalThis, 'window', { value: hostWindow, configurable: true })
Object.defineProperty(globalThis, 'navigator', { value: hostNavigator, configurable: true })

globalThis.chrome = {
  debugger: {
    onEvent: event(),
    onDetach: event(),
    attach: vi.fn(async () => undefined),
    detach: vi.fn(async () => undefined),
    getTargets: vi.fn(async () => []),
    sendCommand: vi.fn(async () => undefined),
  },
  webNavigation: {
    onBeforeNavigate: event(),
    onCommitted: event(),
  },
  tabs: {
    onUpdated: event(),
    onRemoved: event(),
    query: vi.fn(async () => []),
    get: vi.fn(async () => ({ id: 1 })),
  },
  storage: {
    local: {
      get: vi.fn(async () => ({})),
    },
    onChanged: event(),
  },
} as unknown as typeof chrome

const mod = await import('./debugger-user-agent')

describe('debuggerTimezoneOverrideFor', () => {
  it('returns empty override for real mode', () => {
    expect(mod.__test__.debuggerTimezoneOverrideFor('real', 'America/New_York')).toBe('')
  })

  it('returns UTC for off mode', () => {
    expect(mod.__test__.debuggerTimezoneOverrideFor('off', 'America/New_York')).toBe('UTC')
  })

  it('returns persona timezone for random mode', () => {
    expect(mod.__test__.debuggerTimezoneOverrideFor('random', 'America/New_York')).toBe('America/New_York')
  })

  it('returns empty string for random mode without persona timezone', () => {
    expect(mod.__test__.debuggerTimezoneOverrideFor('random', undefined)).toBe('')
  })
})
