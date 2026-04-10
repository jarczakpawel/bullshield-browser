import { describe, expect, test } from 'vitest'
import {
  buildPrivacySurfacePolicy,
  defaultPrivacySurfacePolicy,
  privacySettingsFromPolicy,
  privacySurfaceDescriptors,
} from './privacy-surfaces'

describe('privacy surfaces', () => {
  test('defaults to passthrough policy', () => {
    expect(defaultPrivacySurfacePolicy()).toStrictEqual({
      localFonts: 'passthrough',
      mediaDevices: 'passthrough',
      webGpu: 'passthrough',
      pdfViewer: 'passthrough',
      sensitiveDeviceApis: 'passthrough',
    })
  })

  test('maps settings to restricted policy', () => {
    expect(
      buildPrivacySurfacePolicy({
        blockLocalFonts: true,
        blockMediaDeviceEnumeration: false,
        blockWebGpu: true,
        hidePdfViewer: false,
        hideSensitiveDeviceApis: true,
      })
    ).toStrictEqual({
      localFonts: 'restricted',
      mediaDevices: 'passthrough',
      webGpu: 'restricted',
      pdfViewer: 'passthrough',
      sensitiveDeviceApis: 'restricted',
    })
  })

  test('maps policy back to settings', () => {
    expect(
      privacySettingsFromPolicy({
        localFonts: 'restricted',
        mediaDevices: 'restricted',
        webGpu: 'passthrough',
        pdfViewer: 'restricted',
        sensitiveDeviceApis: 'passthrough',
      })
    ).toStrictEqual({
      blockLocalFonts: true,
      blockMediaDeviceEnumeration: true,
      blockWebGpu: false,
      hidePdfViewer: true,
      hideSensitiveDeviceApis: false,
    })
  })

  test('descriptors cover all surfaces uniquely', () => {
    expect(new Set(privacySurfaceDescriptors.map((descriptor) => descriptor.id)).size).toBe(privacySurfaceDescriptors.length)
    expect(new Set(privacySurfaceDescriptors.map((descriptor) => descriptor.settingKey)).size).toBe(privacySurfaceDescriptors.length)
  })

  test('descriptors map to at least one runtime surface', () => {
    expect(privacySurfaceDescriptors.every((descriptor) => descriptor.runtimeSurfaceIds.length > 0)).toBe(true)
  })
})
