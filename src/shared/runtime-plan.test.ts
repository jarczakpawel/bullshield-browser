import { describe, expect, it } from 'vitest'
import { buildPrivacySurfacePolicy } from './privacy-surfaces'
import { buildRuntimePlanSnapshot, getRuntimeSurfaceRestrictionSources } from './runtime-plan'

describe('getRuntimeSurfaceRestrictionSources', () => {
  it('returns mapped privacy controls for runtime surfaces', () => {
    expect(getRuntimeSurfaceRestrictionSources('navigatorIdentity')).toStrictEqual([
      'webGpu',
      'pdfViewer',
      'sensitiveDeviceApis',
    ])
    expect(getRuntimeSurfaceRestrictionSources('screen')).toStrictEqual([])
  })
})

describe('buildRuntimePlanSnapshot', () => {
  it('treats browser unsupported surfaces as disabled', () => {
    const plan = buildRuntimePlanSnapshot('firefox', buildPrivacySurfacePolicy(undefined), true)
    const fonts = plan.find((row) => row.runtimeSurfaceId === 'fonts')

    expect(fonts).toMatchObject({
      supportLevel: 'none',
      currentState: 'disabled',
      currentReason: 'browser-unsupported',
    })
  })

  it('marks restricted runtime surfaces from privacy policy even without profile', () => {
    const plan = buildRuntimePlanSnapshot(
      'chromium',
      buildPrivacySurfacePolicy({ blockMediaDeviceEnumeration: true }),
      false
    )
    const mediaDevices = plan.find((row) => row.runtimeSurfaceId === 'mediaDevices')

    expect(mediaDevices).toMatchObject({
      currentState: 'restricted',
      currentReason: 'restricted-by-policy',
    })
  })

  it('keeps profile-projected surfaces disabled without an active profile', () => {
    const plan = buildRuntimePlanSnapshot('chromium', buildPrivacySurfacePolicy(undefined), false)
    const webgl = plan.find((row) => row.runtimeSurfaceId === 'webgl')
    const navigatorIdentity = plan.find((row) => row.runtimeSurfaceId === 'navigatorIdentity')

    expect(webgl).toMatchObject({ currentState: 'disabled', currentReason: 'profile-required' })
    expect(navigatorIdentity).toMatchObject({ currentState: 'enabled', currentReason: 'available' })
  })
})
