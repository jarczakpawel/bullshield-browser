import { describe, it, expect } from 'vitest'
import { platformVersionFor, architectureFor, bitnessFor, supportsUAClientHints, formFactorsFor } from './ua-ch'
import type { ReadonlyUserAgentState } from '~/shared/types'

const ua = (os: ReadonlyUserAgentState['os'], extra: Partial<ReadonlyUserAgentState> = {}): ReadonlyUserAgentState =>
  ({
    userAgent: 'Mozilla/5.0',
    browser: 'chrome',
    os,
    version: { browser: { major: 120, full: '120.0.0.0' } },
    ...extra,
  } as ReadonlyUserAgentState)

// ---------------------------------------------------------------------------
// platformVersionFor — single source of truth
// ---------------------------------------------------------------------------
describe('platformVersionFor', () => {
  it('windows → 15.0.0', () => expect(platformVersionFor(ua('windows'))).toBe('15.0.0'))
  it('linux → 6.8.0',   () => expect(platformVersionFor(ua('linux'))).toBe('6.8.0'))
  it('macOS → 14.6.1',  () => expect(platformVersionFor(ua('macOS'))).toBe('14.6.1'))

  it('iOS uses device.osVersion padded to 3 parts', () =>
    expect(
      platformVersionFor(ua('iOS', { device: { manufacturer: 'Apple', model: 'iPhone', type: 'mobile', osVersion: '17.4' } }))
    ).toBe('17.4.0'))

  it('iOS falls back to 17.4.0 when osVersion missing', () =>
    expect(platformVersionFor(ua('iOS'))).toBe('17.4.0'))

  it('android uses device.osVersion padded to 3 parts', () =>
    expect(
      platformVersionFor(ua('android', { device: { manufacturer: 'Google', model: 'Pixel', type: 'mobile', osVersion: '14' } }))
    ).toBe('14.0.0'))

  it('fingerprint.platformVersion wins over derived value', () => {
    const state = ua('windows', { fingerprint: { platformVersion: '10.0.0' } as ReadonlyUserAgentState['fingerprint'] })
    expect(platformVersionFor(state)).toBe('10.0.0')
  })
})

// ---------------------------------------------------------------------------
// architectureFor — pełne API: (ua, gpuVendor?)
// ---------------------------------------------------------------------------
describe('architectureFor', () => {
  it('arm for android',          () => expect(architectureFor(ua('android'))).toBe('arm'))
  it('arm for iOS',              () => expect(architectureFor(ua('iOS'))).toBe('arm'))
  it('x86 for windows',          () => expect(architectureFor(ua('windows'))).toBe('x86'))
  it('x86 for linux',            () => expect(architectureFor(ua('linux'))).toBe('x86'))
  it('x86 for macOS (no vendor)',() => expect(architectureFor(ua('macOS'))).toBe('x86'))
  it('x86 for macOS + intel',    () => expect(architectureFor(ua('macOS'), 'intel')).toBe('x86'))
  it('x86 for macOS + amd',      () => expect(architectureFor(ua('macOS'), 'amd')).toBe('x86'))
  it('arm for macOS + apple',    () => expect(architectureFor(ua('macOS'), 'apple')).toBe('arm'))
})

// ---------------------------------------------------------------------------
// bitnessFor
// ---------------------------------------------------------------------------
describe('bitnessFor', () => {
  it('empty for android', () => expect(bitnessFor('android')).toBe(''))
  it('empty for iOS',     () => expect(bitnessFor('iOS')).toBe(''))
  it('64 for windows',    () => expect(bitnessFor('windows')).toBe('64'))
  it('64 for macOS',      () => expect(bitnessFor('macOS')).toBe('64'))
  it('64 for linux',      () => expect(bitnessFor('linux')).toBe('64'))
})


describe('supportsUAClientHints', () => {
  it('chrome 90+ supported', () => expect(supportsUAClientHints({ ...ua('windows'), browser: 'chrome', version: { browser: { major: 90, full: '90.0.0.0' } } })).toBe(true))
  it('chrome 89 not supported', () => expect(supportsUAClientHints({ ...ua('windows'), browser: 'chrome', version: { browser: { major: 89, full: '89.0.0.0' } } })).toBe(false))
  it('edge 90+ supported', () => expect(supportsUAClientHints({ ...ua('windows'), browser: 'edge', version: { browser: { major: 90, full: '90.0.0.0' } } })).toBe(true))
  it('opera 76+ supported', () => expect(supportsUAClientHints({ ...ua('windows'), browser: 'opera', version: { browser: { major: 76, full: '76.0.0.0' } } })).toBe(true))
  it('firefox unsupported', () => expect(supportsUAClientHints({ ...ua('windows'), browser: 'firefox', version: { browser: { major: 146, full: '146.0' } } })).toBe(false))
})

describe('formFactorsFor', () => {
  it('desktop for desktop ua', () => expect(formFactorsFor(ua('windows'))).toEqual(['Desktop']))
  it('mobile for phone ua', () => expect(formFactorsFor(ua('android'))).toEqual(['Mobile']))
  it('tablet for tablet ua', () => expect(formFactorsFor({ ...ua('android'), device: { manufacturer: 'Samsung', model: 'Tab', type: 'tablet', osVersion: '14' } })).toEqual(['Tablet']))
})
