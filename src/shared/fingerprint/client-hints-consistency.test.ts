import { describe, it, expect } from 'vitest'
import { platformVersionFor, architectureFor, bitnessFor } from './ua-ch'
import { buildFingerprintProfile } from './profile'
import type { ReadonlyUserAgentState } from '~/shared/types'

const ua = (os: ReadonlyUserAgentState['os'], extra: Partial<ReadonlyUserAgentState> = {}): ReadonlyUserAgentState =>
  ({
    userAgent: `ua-${os}`,
    browser: 'chrome',
    os,
    version: { browser: { major: 120, full: '120.0.0.0' } },
    ...extra,
  } as ReadonlyUserAgentState)

// ---------------------------------------------------------------------------
// Cross-layer: profile.platformVersion === platformVersionFor(ua)
// Musi być prawdą we wszystkich warstwach — inject.ts, debugger, HTTP biorą
// wartość z profilu który idzie przez platformVersionFor.
// ---------------------------------------------------------------------------
describe('cross-layer: platformVersion spójne między profilem a ua-ch', () => {
  it('windows', () => {
    const state = ua('windows', { userAgent: 'Mozilla/5.0 Windows' })
    expect(buildFingerprintProfile(state).platformVersion).toBe(platformVersionFor(state))
  })

  it('linux', () => {
    const state = ua('linux', { userAgent: 'Mozilla/5.0 Linux' })
    expect(buildFingerprintProfile(state).platformVersion).toBe(platformVersionFor(state))
  })

  it('macOS', () => {
    const state = ua('macOS', { userAgent: 'Mozilla/5.0 macOS' })
    expect(buildFingerprintProfile(state).platformVersion).toBe(platformVersionFor(state))
  })

  it('iOS z device.osVersion', () => {
    const state = ua('iOS', {
      userAgent: 'Mozilla/5.0 iOS',
      device: { manufacturer: 'Apple', model: 'iPhone15,2', type: 'mobile', osVersion: '17.4' },
    })
    expect(buildFingerprintProfile(state).platformVersion).toBe(platformVersionFor(state))
  })

  it('android z device.osVersion', () => {
    const state = ua('android', {
      userAgent: 'Mozilla/5.0 Android',
      device: { manufacturer: 'Google', model: 'Pixel 7', type: 'mobile', osVersion: '14' },
    })
    expect(buildFingerprintProfile(state).platformVersion).toBe(platformVersionFor(state))
  })

  it('fingerprint.platformVersion override przechodzi przez wszystkie warstwy', () => {
    const state = ua('windows', {
      userAgent: 'Mozilla/5.0 Windows',
      fingerprint: { platformVersion: '10.0.0' } as ReadonlyUserAgentState['fingerprint'],
    })
    // ua-ch helper
    expect(platformVersionFor(state)).toBe('10.0.0')
    // profil (który jest źródłem dla inject.ts i debugger)
    expect(buildFingerprintProfile(state).platformVersion).toBe('10.0.0')
  })
})

// ---------------------------------------------------------------------------
// Cross-layer: profile.architecture === architectureFor(ua, gpuVendor)
// Musi być spójne — inject.ts i debugger-user-agent.ts biorą architecture
// z profilu, profil buduje go przez architectureFor(ua, gpu.vendor).
// ---------------------------------------------------------------------------
describe('cross-layer: architecture spójne między profilem a ua-ch', () => {
  it('android → arm w profilu i w helperze', () => {
    const state = ua('android', { device: { manufacturer: 'G', model: 'P', type: 'mobile', osVersion: '14' } })
    const profile = buildFingerprintProfile(state)
    expect(profile.architecture).toBe(architectureFor(state, profile.gpu.vendor))
    expect(profile.architecture).toBe('arm')
  })

  it('iOS → arm w profilu i w helperze', () => {
    const state = ua('iOS', { device: { manufacturer: 'Apple', model: 'iPhone', type: 'mobile', osVersion: '17.4' } })
    const profile = buildFingerprintProfile(state)
    expect(profile.architecture).toBe(architectureFor(state, profile.gpu.vendor))
    expect(profile.architecture).toBe('arm')
  })

  it('windows → x86 w profilu i w helperze', () => {
    const state = ua('windows')
    const profile = buildFingerprintProfile(state)
    expect(profile.architecture).toBe(architectureFor(state, profile.gpu.vendor))
    expect(profile.architecture).toBe('x86')
  })

  it('linux → x86 w profilu i w helperze', () => {
    const state = ua('linux')
    const profile = buildFingerprintProfile(state)
    expect(profile.architecture).toBe(architectureFor(state, profile.gpu.vendor))
    expect(profile.architecture).toBe('x86')
  })

  it('macOS z Apple GPU → arm w profilu i w helperze', () => {
    // macGpu pool ma tylko apple vendor — więc zawsze arm dla macOS
    const state = ua('macOS', { userAgent: 'mac-apple-gpu' })
    const profile = buildFingerprintProfile(state)
    // profil i helper są spójne — niezależnie od vendor
    expect(profile.architecture).toBe(architectureFor(state, profile.gpu.vendor))
    // Apple vendor → arm
    if (profile.gpu.vendor === 'apple') {
      expect(profile.architecture).toBe('arm')
    }
  })
})

// ---------------------------------------------------------------------------
// Cross-layer: profile.bitness === bitnessFor(os)
// ---------------------------------------------------------------------------
describe('cross-layer: bitness spójne między profilem a ua-ch', () => {
  it('windows: profil.bitness === bitnessFor', () => {
    const state = ua('windows')
    expect(buildFingerprintProfile(state).bitness).toBe(bitnessFor('windows'))
  })

  it('macOS: profil.bitness === bitnessFor', () => {
    const state = ua('macOS')
    expect(buildFingerprintProfile(state).bitness).toBe(bitnessFor('macOS'))
  })

  it('linux: profil.bitness === bitnessFor', () => {
    const state = ua('linux')
    expect(buildFingerprintProfile(state).bitness).toBe(bitnessFor('linux'))
  })

  it('android: profil.bitness === bitnessFor (empty)', () => {
    const state = ua('android', { device: { manufacturer: 'G', model: 'P', type: 'mobile', osVersion: '14' } })
    expect(buildFingerprintProfile(state).bitness).toBe(bitnessFor('android'))
    expect(buildFingerprintProfile(state).bitness).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Cross-layer: gpuCapability.preferredCanvasFormat siedzi w presecie
// inject.ts musi czytać z profilu, nie liczyć po OS samodzielnie
// ---------------------------------------------------------------------------
describe('cross-layer: preferredCanvasFormat w presecie gpuCapability', () => {
  it('profil ma pole preferredCanvasFormat', () => {
    const p = buildFingerprintProfile(ua('windows'))
    expect(['rgba8unorm', 'bgra8unorm']).toContain(p.gpuCapability.preferredCanvasFormat)
  })

  it('android i windows mają różne preferredCanvasFormat', () => {
    const win = buildFingerprintProfile(ua('windows', { userAgent: 'win-pcf' }))
    const and = buildFingerprintProfile(ua('android', { userAgent: 'and-pcf', device: { manufacturer: 'G', model: 'P', type: 'mobile', osVersion: '14' } }))
    expect(win.gpuCapability.preferredCanvasFormat).toBe('bgra8unorm')
    expect(and.gpuCapability.preferredCanvasFormat).toBe('rgba8unorm')
  })
})
