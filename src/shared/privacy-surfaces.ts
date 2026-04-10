import { deepFreeze } from './freeze'
import type { RuntimeSurfaceId } from './surface-catalog'

type PrivacySettings = {
  blockLocalFonts: boolean
  blockMediaDeviceEnumeration: boolean
  blockWebGpu: boolean
  hidePdfViewer: boolean
  hideSensitiveDeviceApis: boolean
}

export type PrivacySurfaceId =
  | 'localFonts'
  | 'mediaDevices'
  | 'webGpu'
  | 'pdfViewer'
  | 'sensitiveDeviceApis'

export type PrivacySurfaceMode = 'passthrough' | 'restricted'

export type PrivacySurfaceDescriptor = Readonly<{
  id: PrivacySurfaceId
  settingKey: keyof PrivacySettings
  title: string
  hint: string
  riskLevel: 'medium' | 'high'
  requiresPermission: boolean
  secureContextOnly: boolean
  permissionsPolicyCapable: boolean
  runtimeSurfaceIds: readonly RuntimeSurfaceId[]
}>

export type PrivacySurfacePolicy = Readonly<Record<PrivacySurfaceId, PrivacySurfaceMode>>

export const privacySurfaceDescriptors: readonly PrivacySurfaceDescriptor[] = deepFreeze([
  {
    id: 'localFonts',
    settingKey: 'blockLocalFonts',
    title: 'Block local fonts API',
    hint: 'queryLocalFonts() will reject and local-fonts permission will look denied.',
    riskLevel: 'high',
    requiresPermission: true,
    secureContextOnly: true,
    permissionsPolicyCapable: true,
    runtimeSurfaceIds: ['fonts', 'permissions'],
  },
  {
    id: 'mediaDevices',
    settingKey: 'blockMediaDeviceEnumeration',
    title: 'Block media device enumeration',
    hint: 'enumerateDevices() will return an empty list.',
    riskLevel: 'high',
    requiresPermission: true,
    secureContextOnly: true,
    permissionsPolicyCapable: true,
    runtimeSurfaceIds: ['mediaDevices', 'permissions'],
  },
  {
    id: 'webGpu',
    settingKey: 'blockWebGpu',
    title: 'Hide WebGPU',
    hint: 'navigator.gpu will be removed from page scripts.',
    riskLevel: 'high',
    requiresPermission: false,
    secureContextOnly: true,
    permissionsPolicyCapable: false,
    runtimeSurfaceIds: ['webGpu', 'navigatorIdentity'],
  },
  {
    id: 'pdfViewer',
    settingKey: 'hidePdfViewer',
    title: 'Hide PDF viewer exposure',
    hint: 'navigator.pdfViewerEnabled, plugins and MIME types will not expose inline PDF support.',
    riskLevel: 'medium',
    requiresPermission: false,
    secureContextOnly: false,
    permissionsPolicyCapable: false,
    runtimeSurfaceIds: ['pdfViewer', 'navigatorIdentity'],
  },
  {
    id: 'sensitiveDeviceApis',
    settingKey: 'hideSensitiveDeviceApis',
    title: 'Hide sensitive device APIs',
    hint: 'navigator.serial, navigator.usb, navigator.hid and navigator.bluetooth will be hidden.',
    riskLevel: 'high',
    requiresPermission: true,
    secureContextOnly: true,
    permissionsPolicyCapable: true,
    runtimeSurfaceIds: ['navigatorIdentity'],
  },
] as const)

const surfaceIdBySettingKey = deepFreeze(
  privacySurfaceDescriptors.reduce<Record<keyof PrivacySettings, PrivacySurfaceId>>((acc, descriptor) => {
    acc[descriptor.settingKey] = descriptor.id
    return acc
  }, {
    blockLocalFonts: 'localFonts',
    blockMediaDeviceEnumeration: 'mediaDevices',
    blockWebGpu: 'webGpu',
    hidePdfViewer: 'pdfViewer',
    hideSensitiveDeviceApis: 'sensitiveDeviceApis',
  })
)

export const defaultPrivacySurfacePolicy = (): PrivacySurfacePolicy => {
  const policy: Record<PrivacySurfaceId, PrivacySurfaceMode> = {
    localFonts: 'passthrough',
    mediaDevices: 'passthrough',
    webGpu: 'passthrough',
    pdfViewer: 'passthrough',
    sensitiveDeviceApis: 'passthrough',
  }

  return policy
}

export const buildPrivacySurfacePolicy = (settings: Partial<PrivacySettings> | undefined): PrivacySurfacePolicy => {
  const policy: Record<PrivacySurfaceId, PrivacySurfaceMode> = { ...defaultPrivacySurfacePolicy() }

  for (const [settingKey, value] of Object.entries(settings || {}) as Array<[keyof PrivacySettings, boolean | undefined]>) {
    if (value === true) {
      policy[surfaceIdBySettingKey[settingKey]] = 'restricted'
    }
  }

  return policy
}

export const privacySettingsFromPolicy = (policy: Partial<PrivacySurfacePolicy> | undefined): PrivacySettings => {
  const isRestricted = (id: PrivacySurfaceId): boolean => policy?.[id] === 'restricted'

  return {
    blockLocalFonts: isRestricted('localFonts'),
    blockMediaDeviceEnumeration: isRestricted('mediaDevices'),
    blockWebGpu: isRestricted('webGpu'),
    hidePdfViewer: isRestricted('pdfViewer'),
    hideSensitiveDeviceApis: isRestricted('sensitiveDeviceApis'),
  }
}
