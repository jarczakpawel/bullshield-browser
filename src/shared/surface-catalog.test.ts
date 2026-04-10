import { describe, expect, it } from 'vitest'
import { runtimeSurfaceDescriptors } from './surface-catalog'
import { privacySurfaceDescriptors } from './privacy-surfaces'

describe('runtimeSurfaceDescriptors', () => {
  it('contains unique runtime ids', () => {
    const ids = runtimeSurfaceDescriptors.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('contains at least one always-on runtime surface', () => {
    expect(runtimeSurfaceDescriptors.some((item) => item.execution === 'always')).toBe(true)
  })

  it('covers all privacy-enforced runtime surfaces referenced by privacy descriptors', () => {
    const runtimeIds = new Set(runtimeSurfaceDescriptors.map((item) => item.id))

    for (const descriptor of privacySurfaceDescriptors) {
      for (const runtimeSurfaceId of descriptor.runtimeSurfaceIds) {
        expect(runtimeIds.has(runtimeSurfaceId)).toBe(true)
      }
    }
  })


  it('marks all current runtime surfaces as mirrored into dynamic iframe realms', () => {
    expect(runtimeSurfaceDescriptors.every((item) => item.sameOriginIframeReachable === true)).toBe(true)
  })

  it('declares browser support and worker exposure for every surface', () => {
    for (const descriptor of runtimeSurfaceDescriptors) {
      expect(descriptor.browserSupport.chromium).toBeTruthy()
      expect(descriptor.browserSupport.firefox).toBeTruthy()
      expect(descriptor.webPlatformWorkerExposure).toBeTruthy()
    }
  })

  it('marks Local Font Access as unavailable in Firefox metadata', () => {
    const fonts = runtimeSurfaceDescriptors.find((item) => item.id === 'fonts')
    expect(fonts?.browserSupport.firefox).toBe('none')
  })
})
