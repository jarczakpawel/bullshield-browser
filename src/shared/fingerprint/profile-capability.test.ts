import { describe, it, expect } from 'vitest'
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

const androidState = ua('android', { device: { manufacturer: 'Google', model: 'Pixel', type: 'mobile', osVersion: '14' } })
const iosState     = ua('iOS',     { device: { manufacturer: 'Apple',  model: 'iPhone', type: 'mobile', osVersion: '17.4' } })

const normalizeGpuDescription = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\(r\)|\(tm\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()


// ---------------------------------------------------------------------------
// gpuCapability — preferredCanvasFormat siedzi w presecie, nie w inject.ts
// ---------------------------------------------------------------------------
describe('gpuCapability.preferredCanvasFormat', () => {
  it('android → rgba8unorm', () =>
    expect(buildFingerprintProfile(androidState).gpuCapability.preferredCanvasFormat).toBe('rgba8unorm'))

  it('linux → rgba8unorm', () =>
    expect(buildFingerprintProfile(ua('linux')).gpuCapability.preferredCanvasFormat).toBe('rgba8unorm'))

  it('windows → bgra8unorm', () =>
    expect(buildFingerprintProfile(ua('windows')).gpuCapability.preferredCanvasFormat).toBe('bgra8unorm'))

  it('macOS → bgra8unorm', () =>
    expect(buildFingerprintProfile(ua('macOS')).gpuCapability.preferredCanvasFormat).toBe('bgra8unorm'))

  it('iOS → bgra8unorm', () =>
    expect(buildFingerprintProfile(iosState).gpuCapability.preferredCanvasFormat).toBe('bgra8unorm'))
})

// ---------------------------------------------------------------------------
// gpuCapability — wgslLanguageFeatures per-preset (nie globalna stała)
// ---------------------------------------------------------------------------
describe('gpuCapability.wgslLanguageFeatures', () => {
  it('windows ma unrestricted_pointer_parameters', () =>
    expect(buildFingerprintProfile(ua('windows')).gpuCapability.wgslLanguageFeatures)
      .toContain('unrestricted_pointer_parameters'))

  it('macOS ma unrestricted_pointer_parameters', () =>
    expect(buildFingerprintProfile(ua('macOS')).gpuCapability.wgslLanguageFeatures)
      .toContain('unrestricted_pointer_parameters'))

  it('iOS NIE ma unrestricted_pointer_parameters', () =>
    expect(buildFingerprintProfile(iosState).gpuCapability.wgslLanguageFeatures)
      .not.toContain('unrestricted_pointer_parameters'))

  it('Qualcomm Adreno NIE ma unrestricted_pointer_parameters ani pointer_composite_access', () => {
    // Testujemy buildGpuCapability pośrednio przez deterministyczny seed
    // userAgent dobrany tak żeby hwIndex trafił w qualcomm slot (androidGpu[0] = qualcomm)
    // androidGpu = [qualcomm-730, qualcomm-740, mali-G715, mali-G78]
    // hwIndex = (seed + 71) % 3 → 0 lub 1 → qualcomm
    // Szukamy UA który da seed % 3 == 0 lub 1 po (seed+71)%3
    // Najprostsze: testuj preset bezpośrednio przez dwa profile z różnymi UA
    const candidates = ['q-test-0', 'q-test-1', 'q-test-2', 'q-test-3', 'q-test-4', 'q-test-5']
    const qualcomProfiles = candidates
      .map((ua_str) => buildFingerprintProfile(ua('android', { userAgent: ua_str, device: { manufacturer: 'Qualcomm', model: 'SM8550', type: 'mobile', osVersion: '14' } })))
      .filter((p) => p.gpu.vendor === 'qualcomm')

    expect(qualcomProfiles.length).toBeGreaterThan(0) // upewnij się że mamy qualcomm
    for (const p of qualcomProfiles) {
      expect(p.gpuCapability.wgslLanguageFeatures).not.toContain('unrestricted_pointer_parameters')
      expect(p.gpuCapability.wgslLanguageFeatures).not.toContain('pointer_composite_access')
      expect(p.gpuCapability.wgslLanguageFeatures).toContain('packed_4x8_integer_dot_product')
    }
  })

  it('ARM Mali NIE ma unrestricted_pointer_parameters ani pointer_composite_access', () => {
    const candidates = ['m-test-0', 'm-test-1', 'm-test-2', 'm-test-3', 'm-test-4', 'm-test-5']
    const maliProfiles = candidates
      .map((ua_str) => buildFingerprintProfile(ua('android', { userAgent: ua_str, device: { manufacturer: 'ARM', model: 'Mali-G715', type: 'mobile', osVersion: '14' } })))
      .filter((p) => p.gpu.vendor === 'arm')

    expect(maliProfiles.length).toBeGreaterThan(0) // upewnij się że mamy mali
    for (const p of maliProfiles) {
      expect(p.gpuCapability.wgslLanguageFeatures).not.toContain('unrestricted_pointer_parameters')
      expect(p.gpuCapability.wgslLanguageFeatures).not.toContain('pointer_composite_access')
      expect(p.gpuCapability.wgslLanguageFeatures).toContain('packed_4x8_integer_dot_product')
    }
  })

  it('wszystkie presety mają packed_4x8_integer_dot_product', () => {
    for (const os of ['windows', 'linux', 'macOS'] as const) {
      expect(buildFingerprintProfile(ua(os)).gpuCapability.wgslLanguageFeatures)
        .toContain('packed_4x8_integer_dot_product')
    }
    expect(buildFingerprintProfile(iosState).gpuCapability.wgslLanguageFeatures)
      .toContain('packed_4x8_integer_dot_product')
    expect(buildFingerprintProfile(androidState).gpuCapability.wgslLanguageFeatures)
      .toContain('packed_4x8_integer_dot_product')
  })
})

// ---------------------------------------------------------------------------
// gpuCapability — features per-vendor
// ---------------------------------------------------------------------------
describe('gpuCapability.features — per vendor', () => {
  it('mobile android: ETC2 jest, BC nie ma', () => {
    const p = buildFingerprintProfile(androidState)
    expect(p.gpuCapability.features).toContain('texture-compression-etc2')
    expect(p.gpuCapability.features).not.toContain('texture-compression-bc')
  })

  it('iOS: bgra8unorm-storage i ETC2', () => {
    const p = buildFingerprintProfile(iosState)
    expect(p.gpuCapability.features).toContain('bgra8unorm-storage')
    expect(p.gpuCapability.features).toContain('texture-compression-etc2')
  })

  it('desktop windows: texture-compression-bc jest', () => {
    const p = buildFingerprintProfile(ua('windows'))
    expect(p.gpuCapability.features).toContain('texture-compression-bc')
  })

  it('features is non-empty array for all OSes', () => {
    for (const os of ['windows', 'linux', 'macOS'] as const) {
      const p = buildFingerprintProfile(ua(os))
      expect(Array.isArray(p.gpuCapability.features)).toBe(true)
      expect(p.gpuCapability.features.length).toBeGreaterThan(0)
    }
  })
})


describe('desktop gpu catalogs', () => {
  it('windows/linux/macOS używają więcej niż 5 różnych presetów GPU', () => {
    const seen = {
      windows: new Set<string>(),
      linux: new Set<string>(),
      macOS: new Set<string>(),
    }

    for (let i = 0; i < 256; i++) {
      seen.windows.add(buildFingerprintProfile(ua('windows', { userAgent: `gpu-win-${i}` })).gpu.description)
      seen.linux.add(buildFingerprintProfile(ua('linux', { userAgent: `gpu-linux-${i}` })).gpu.description)
      seen.macOS.add(buildFingerprintProfile(ua('macOS', { userAgent: `gpu-mac-${i}` })).gpu.description)
    }

    expect(seen.windows.size).toBeGreaterThan(40)
    expect(seen.linux.size).toBeGreaterThan(40)
    expect(seen.macOS.size).toBeGreaterThan(28)
  })

  it('desktop webgl i gpu pozostają spójne vendorowo', () => {
    const samples = [
      ...Array.from({ length: 128 }, (_, i) => buildFingerprintProfile(ua('windows', { userAgent: `gpu-coh-win-${i}` }))),
      ...Array.from({ length: 128 }, (_, i) => buildFingerprintProfile(ua('linux', { userAgent: `gpu-coh-linux-${i}` }))),
      ...Array.from({ length: 128 }, (_, i) => buildFingerprintProfile(ua('macOS', { userAgent: `gpu-coh-mac-${i}` }))),
    ]

    for (const profile of samples) {
      const lhs = `${profile.webgl.vendor} ${profile.webgl.renderer}`.toLowerCase()
      if (profile.gpu.vendor === 'nvidia') expect(lhs).toContain('nvidia')
      if (profile.gpu.vendor === 'intel') expect(lhs).toContain('intel')
      if (profile.gpu.vendor === 'amd') expect(lhs).toSatisfy((value: string) => value.includes('amd') || value.includes('ati'))
      if (profile.gpu.vendor === 'apple') expect(lhs).toContain('apple')
    }
  })
})

describe('screen catalogs stay broad', () => {
  it('desktop screen pools produce many distinct resolutions', () => {
    const seen = {
      windows: new Set<string>(),
      linux: new Set<string>(),
      macOS: new Set<string>(),
    }

    for (let i = 0; i < 256; i++) {
      const win = buildFingerprintProfile(ua('windows', { userAgent: `screen-win-${i}` })).screen
      const lin = buildFingerprintProfile(ua('linux', { userAgent: `screen-linux-${i}` })).screen
      const mac = buildFingerprintProfile(ua('macOS', { userAgent: `screen-mac-${i}` })).screen
      seen.windows.add(`${win.width}x${win.height}@${win.devicePixelRatio}`)
      seen.linux.add(`${lin.width}x${lin.height}@${lin.devicePixelRatio}`)
      seen.macOS.add(`${mac.width}x${mac.height}@${mac.devicePixelRatio}`)
    }

    expect(seen.windows.size).toBeGreaterThan(12)
    expect(seen.linux.size).toBeGreaterThan(12)
    expect(seen.macOS.size).toBeGreaterThan(10)
  })
})

describe('mobile exact-model catalogs', () => {
  it('android exact models resolve to catalog-specific profiles', () => {
    const pixel8 = buildFingerprintProfile(ua('android', { userAgent: 'android-pixel8', device: { manufacturer: 'Google', model: 'Pixel 8', type: 'mobile', osVersion: '14' } }))
    const fold5 = buildFingerprintProfile(ua('android', { userAgent: 'android-fold5', device: { manufacturer: 'Samsung', model: 'Galaxy Z Fold 5', type: 'mobile', osVersion: '14' } }))
    const op12 = buildFingerprintProfile(ua('android', { userAgent: 'android-op12', device: { manufacturer: 'OnePlus', model: 'OnePlus 12', type: 'mobile', osVersion: '15' } }))

    expect(pixel8.gpu.description).toContain('Mali-G715')
    expect(fold5.screen.width).toBe(904)
    expect(op12.deviceMemory).toBe(16)
  })


  it('newer android exact models resolve to catalog-specific profiles', () => {
    const s25edge = buildFingerprintProfile(ua('android', { userAgent: 'android-s25-edge', device: { manufacturer: 'Samsung', model: 'Galaxy S25 Edge', type: 'mobile', osVersion: '15' } }))
    const pad3 = buildFingerprintProfile(ua('android', { userAgent: 'android-pad3', device: { manufacturer: 'OnePlus', model: 'OnePlus Pad 3', type: 'tablet', osVersion: '15' } }))

    expect(s25edge.gpu.description).toContain('Adreno 830')
    expect(pad3.screen.width).toBe(960)
    expect(pad3.deviceMemory).toBe(12)
  })

  it('ios exact models resolve to catalog-specific profiles', () => {
    const iphone13 = buildFingerprintProfile(ua('iOS', { userAgent: 'ios-13', device: { manufacturer: 'Apple', model: 'iPhone 13', type: 'mobile', osVersion: '17.0' } }))
    const ipadPro = buildFingerprintProfile(ua('iOS', { userAgent: 'ios-ipad-pro', device: { manufacturer: 'Apple', model: 'iPad Pro 13-inch (M4)', type: 'tablet', osVersion: '18.0' } }))

    expect(iphone13.screen.width).toBe(390)
    expect(ipadPro.screen.width).toBe(1032)
    expect(ipadPro.hardwareConcurrency).toBe(10)
  })
})


// ---------------------------------------------------------------------------
// gpuCapability — limits per-preset
// ---------------------------------------------------------------------------

describe('generic android pools stay broad', () => {
  it('android generic pools produce many distinct gpu and screen combinations', () => {
    const screens = new Set<string>()
    const gpus = new Set<string>()

    for (let i = 0; i < 256; i++) {
      const p = buildFingerprintProfile(ua('android', { userAgent: `android-generic-${i}`, device: { manufacturer: 'Generic', model: `Model ${i}`, type: i % 7 === 0 ? 'tablet' : 'mobile', osVersion: '15' } }))
      screens.add(`${p.screen.width}x${p.screen.height}@${p.screen.devicePixelRatio}`)
      gpus.add(p.gpu.description)
    }

    expect(screens.size).toBeGreaterThan(12)
    expect(gpus.size).toBeGreaterThan(12)
  })
})

describe('gpuCapability.limits', () => {
  it('maxTextureDimension2D istnieje i jest liczbą', () => {
    expect(typeof buildFingerprintProfile(ua('windows')).gpuCapability.limits['maxTextureDimension2D']).toBe('number')
    expect(typeof buildFingerprintProfile(androidState).gpuCapability.limits['maxTextureDimension2D']).toBe('number')
  })

  it('mobile limits ≤ desktop limits dla maxTextureDimension2D', () => {
    const desktop = buildFingerprintProfile(ua('windows', { userAgent: 'win-limits' }))
    const mobile  = buildFingerprintProfile(ua('android', { userAgent: 'and-limits', device: { manufacturer: 'G', model: 'P', type: 'mobile', osVersion: '14' } }))
    expect(mobile.gpuCapability.limits['maxTextureDimension2D'])
      .toBeLessThanOrEqual(desktop.gpuCapability.limits['maxTextureDimension2D']!)
  })
})

// ---------------------------------------------------------------------------
// webglShaderPrecision — mobile vs desktop
// ---------------------------------------------------------------------------
describe('webglShaderPrecision', () => {
  const GL_FRAGMENT_SHADER = 35632
  const GL_LOW_FLOAT       = 0x8df0
  const GL_MEDIUM_FLOAT    = 0x8df1

  it('12 entries (2 shaderTypes × 6 precisionTypes)', () =>
    expect(Object.keys(buildFingerprintProfile(ua('windows')).webglShaderPrecision.table).length).toBe(12))

  it('desktop fragment lowp: precision=23', () => {
    const p = buildFingerprintProfile(ua('windows', { userAgent: 'win-spf' }))
    expect(p.webglShaderPrecision.table[`${GL_FRAGMENT_SHADER}:${GL_LOW_FLOAT}`]?.precision).toBe(23)
  })

  it('mobile fragment lowp: precision=8', () => {
    const p = buildFingerprintProfile(ua('android', { userAgent: 'and-spf', device: { manufacturer: 'G', model: 'P', type: 'mobile', osVersion: '14' } }))
    expect(p.webglShaderPrecision.table[`${GL_FRAGMENT_SHADER}:${GL_LOW_FLOAT}`]?.precision).toBe(8)
  })

  it('desktop fragment mediump: precision=23', () => {
    const p = buildFingerprintProfile(ua('windows', { userAgent: 'win-spf2' }))
    expect(p.webglShaderPrecision.table[`${GL_FRAGMENT_SHADER}:${GL_MEDIUM_FLOAT}`]?.precision).toBe(23)
  })

  it('mobile fragment mediump: precision=10', () => {
    const p = buildFingerprintProfile(iosState)
    expect(p.webglShaderPrecision.table[`${GL_FRAGMENT_SHADER}:${GL_MEDIUM_FLOAT}`]?.precision).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// speechVoices — voiceURI jest prawdziwym URI, nie tylko name
// ---------------------------------------------------------------------------
describe('speechVoices.voiceURI', () => {
  it('wszystkie głosy mają niepuste voiceURI', () => {
    for (const os of ['windows', 'linux', 'macOS', 'android', 'iOS'] as const) {
      const extra = (os === 'android' || os === 'iOS')
        ? { device: { manufacturer: 'X', model: 'Y', type: 'mobile' as const, osVersion: '14' } }
        : {}
      const p = buildFingerprintProfile(ua(os, extra))
      expect(p.speechVoices.every((v) => v.voiceURI.length > 0)).toBe(true)
    }
  })

  it('Windows: localService voiceURI zawiera "Microsoft"', () => {
    const p = buildFingerprintProfile(ua('windows', { userAgent: 'voice-win' }))
    const local = p.speechVoices.find((v) => v.localService)
    expect(local?.voiceURI).toContain('Microsoft')
  })

  it('macOS: localService voiceURI zawiera "com.apple"', () => {
    const p = buildFingerprintProfile(ua('macOS', { userAgent: 'voice-mac' }))
    const local = p.speechVoices.find((v) => v.localService)
    expect(local?.voiceURI).toContain('com.apple')
  })

  it('dokładnie jeden głos ma default: true', () => {
    for (const os of ['windows', 'macOS', 'linux'] as const) {
      const p = buildFingerprintProfile(ua(os, { userAgent: `voice-default-${os}` }))
      expect(p.speechVoices.filter((v) => v.default).length).toBe(1)
    }
  })
})

// ---------------------------------------------------------------------------
// Determinizm — te same dane wejściowe → te same wyniki
// ---------------------------------------------------------------------------
describe('profile determinism', () => {
  it('domRectNoise jest deterministyczny', () => {
    const state = ua('windows', { userAgent: 'determ-test' })
    expect(buildFingerprintProfile(state).domRectNoise).toBe(buildFingerprintProfile(state).domRectNoise)
  })

  it('textMetricsNoise jest deterministyczny', () => {
    const state = ua('macOS', { userAgent: 'determ-mac' })
    expect(buildFingerprintProfile(state).textMetricsNoise).toBe(buildFingerprintProfile(state).textMetricsNoise)
  })

  it('mathFingerprint.noise jest deterministyczny', () => {
    const state = ua('linux', { userAgent: 'determ-linux' })
    expect(buildFingerprintProfile(state).mathFingerprint.noise).toBe(buildFingerprintProfile(state).mathFingerprint.noise)
  })
})


describe('desktop gpu tiering', () => {
  it('windows/linux low-end integrated profiles stay in lighter screen/core/memory buckets', () => {
    const samples = [
      ...Array.from({ length: 512 }, (_, i) => buildFingerprintProfile(ua('windows', { userAgent: `tier-low-win-${i}` }))),
      ...Array.from({ length: 512 }, (_, i) => buildFingerprintProfile(ua('linux', { userAgent: `tier-low-linux-${i}` }))),
    ]

    const lowIntegrated = samples.filter((p) =>
      /intel hd graphics 4000|intel hd graphics 520|intel uhd graphics 620|intel uhd graphics 630|intel iris xe/.test(normalizeGpuDescription(p.gpu.description)),
    )

    expect(lowIntegrated.length).toBeGreaterThan(0)
    for (const profile of lowIntegrated) {
      expect(profile.screen.width).toBeLessThanOrEqual(1920)
      expect(profile.hardwareConcurrency).toBeLessThanOrEqual(8)
      expect(profile.deviceMemory).toBeLessThanOrEqual(8)
    }
  })

  it('windows/linux high-end discrete profiles stay in stronger buckets', () => {
    const samples = [
      ...Array.from({ length: 512 }, (_, i) => buildFingerprintProfile(ua('windows', { userAgent: `tier-high-win-${i}` }))),
      ...Array.from({ length: 512 }, (_, i) => buildFingerprintProfile(ua('linux', { userAgent: `tier-high-linux-${i}` }))),
    ]

    const highDiscrete = samples.filter((p) =>
      /rtx 4090|rtx 4080|rtx 4070|rtx 3080|rtx 3070|rx 7900|rx 7800 xt|rx 7700 xt|rx 6800 xt|arc a770/.test(normalizeGpuDescription(p.gpu.description)),
    )

    expect(highDiscrete.length).toBeGreaterThan(0)
    for (const profile of highDiscrete) {
      expect(profile.screen.width).toBeGreaterThanOrEqual(1920)
      expect(profile.hardwareConcurrency).toBeGreaterThanOrEqual(12)
      expect(profile.deviceMemory).toBeGreaterThanOrEqual(8)
    }
  })

  it('mac entry and high tiers stay separated', () => {
    const samples = Array.from({ length: 768 }, (_, i) => buildFingerprintProfile(ua('macOS', { userAgent: `tier-mac-${i}` })))

    const entry = samples.filter((p) =>
      /apple m1$|apple m2$|apple m3$|apple m4$|intel hd graphics 4000|intel iris plus graphics|intel uhd graphics 630/.test(normalizeGpuDescription(p.gpu.description)),
    )
    const high = samples.filter((p) =>
      /max|ultra|5600m|5700 xt|5700|vega 56|vega 64x/.test(normalizeGpuDescription(p.gpu.description)),
    )

    expect(entry.length).toBeGreaterThan(0)
    expect(high.length).toBeGreaterThan(0)

    for (const profile of entry) {
      expect(profile.screen.width).toBeLessThanOrEqual(1680)
      expect(profile.hardwareConcurrency).toBeLessThanOrEqual(10)
      expect(profile.deviceMemory).toBeLessThanOrEqual(16)
    }

    for (const profile of high) {
      expect(profile.screen.width).toBeGreaterThanOrEqual(1680)
      expect(profile.hardwareConcurrency).toBeGreaterThanOrEqual(12)
      expect(profile.deviceMemory).toBeGreaterThanOrEqual(16)
    }
  })
})
