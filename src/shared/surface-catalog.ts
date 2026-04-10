import { deepFreeze } from './freeze'
import type { BrowserRuntimeFamily, BrowserSupportLevel, WebPlatformWorkerExposure } from './browser-runtime'

export type RuntimeSurfaceId =
  | 'navigatorIdentity'
  | 'screen'
  | 'webgl'
  | 'webGpu'
  | 'mediaDevices'
  | 'fonts'
  | 'permissions'
  | 'pdfViewer'
  | 'intl'
  | 'canvas'
  | 'audio'
  | 'timezone'
  | 'domRect'
  | 'textMetrics'
  | 'mathFingerprint'
  | 'speechVoices'
  | 'webrtc'
  | 'battery'

export type RuntimeSurfaceKind =
  | 'identity'
  | 'display'
  | 'rendering'
  | 'media'
  | 'document'
  | 'permissions'
  | 'localization'

export type RuntimeSurfaceExecution = 'always' | 'profile-required'

export type RuntimeSurfaceScope = 'window' | 'navigator' | 'document' | 'prototype' | 'iframe-mirror'

export type RuntimeSurfaceDescriptor = Readonly<{
  id: RuntimeSurfaceId
  title: string
  kind: RuntimeSurfaceKind
  execution: RuntimeSurfaceExecution
  scope: readonly RuntimeSurfaceScope[]
  profileRequired: boolean
  sameOriginIframeReachable: boolean
  secureContextOnly: boolean
  browserSupport: Readonly<Record<BrowserRuntimeFamily, BrowserSupportLevel>>
  webPlatformWorkerExposure: WebPlatformWorkerExposure
  notes: string
}>

const chromeFullFirefoxFull = deepFreeze({ chromium: 'full', firefox: 'full' } as const)
const chromeFullFirefoxPartial = deepFreeze({ chromium: 'full', firefox: 'partial' } as const)
const chromeFullFirefoxNone = deepFreeze({ chromium: 'full', firefox: 'none' } as const)

export const runtimeSurfaceDescriptors: readonly RuntimeSurfaceDescriptor[] = deepFreeze([
  {
    id: 'navigatorIdentity',
    title: 'Navigator identity surface',
    kind: 'identity',
    execution: 'always',
    scope: ['navigator', 'iframe-mirror'],
    profileRequired: false,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'partial',
    notes: 'Applies UA, UA-CH, platform, vendor and privacy-controlled navigator entry points.',
  },
  {
    id: 'screen',
    title: 'Window and screen surface',
    kind: 'display',
    execution: 'profile-required',
    scope: ['window'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'none',
    notes: 'Controls devicePixelRatio and basic Screen metrics.',
  },
  {
    id: 'webgl',
    title: 'WebGL rendering surface',
    kind: 'rendering',
    execution: 'profile-required',
    scope: ['prototype'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'partial',
    notes: 'Controls WebGL vendor and renderer exposure.',
  },
  {
    id: 'webGpu',
    title: 'WebGPU rendering surface',
    kind: 'rendering',
    execution: 'profile-required',
    scope: ['navigator'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: true,
    browserSupport: chromeFullFirefoxPartial,
    webPlatformWorkerExposure: 'partial',
    notes: 'Controls navigator.gpu and adapter/device info exposure.',
  },
  {
    id: 'mediaDevices',
    title: 'Media devices surface',
    kind: 'media',
    execution: 'always',
    scope: ['navigator'],
    profileRequired: false,
    sameOriginIframeReachable: true,
    secureContextOnly: true,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'none',
    notes: 'Controls enumerateDevices() result shape or restriction.',
  },
  {
    id: 'fonts',
    title: 'Fonts surface',
    kind: 'document',
    execution: 'always',
    scope: ['document', 'window'],
    profileRequired: false,
    sameOriginIframeReachable: true,
    secureContextOnly: true,
    browserSupport: chromeFullFirefoxNone,
    webPlatformWorkerExposure: 'none',
    notes: 'Controls FontFaceSet.check() and Local Font Access exposure. Local Font Access itself is unavailable in Firefox.',
  },
  {
    id: 'permissions',
    title: 'Permissions surface',
    kind: 'permissions',
    execution: 'always',
    scope: ['navigator'],
    profileRequired: false,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'full',
    notes: 'Mirrors privacy controls into navigator.permissions.query().',
  },
  {
    id: 'pdfViewer',
    title: 'PDF viewer surface',
    kind: 'document',
    execution: 'always',
    scope: ['navigator'],
    profileRequired: false,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'none',
    notes: 'Controls pdfViewerEnabled, plugins and MIME type exposure.',
  },
  {
    id: 'intl',
    title: 'Intl locale surface',
    kind: 'localization',
    execution: 'profile-required',
    scope: ['prototype'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'full',
    notes: 'Controls DateTimeFormat.resolvedOptions().locale exposure.',
  },
  {
    id: 'canvas',
    title: 'Canvas rendering noise surface',
    kind: 'rendering',
    execution: 'profile-required',
    scope: ['prototype'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'none',
    notes: 'Adds deterministic ±1 per-pixel noise to getImageData, toDataURL, toBlob and WebGL readPixels outputs. The underlying canvas drawing buffer is not modified; noise is only applied to data leaving via read APIs. OffscreenCanvas is not patched (injector does not run in workers). Enforcement points: CanvasRenderingContext2D.prototype.getImageData, HTMLCanvasElement.prototype.toDataURL, HTMLCanvasElement.prototype.toBlob, WebGLRenderingContext.prototype.readPixels, WebGL2RenderingContext.prototype.readPixels.',
  },
  {
    id: 'audio',
    title: 'AudioBuffer noise surface',
    kind: 'media',
    execution: 'profile-required',
    scope: ['prototype'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'none',
    notes: 'Adds a small amplitude noise to PCM samples returned by AudioBuffer.prototype.getChannelData(). Each Float32Array is noised at most once (WeakMap idempotency guard). Note: this modifies real channel data visible to page scripts. Enforcement point: AudioBuffer.prototype.getChannelData.',
  },
  {
    id: 'timezone',
    title: 'Timezone spoofing surface',
    kind: 'localization',
    execution: 'profile-required',
    scope: ['prototype'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'none',
    notes: 'Spoofs the IANA timezone using profile.timezoneZone. DST-aware: getTimezoneOffset() computes the real UTC offset for the zone at the call-time date via nativeDateTimeFormat.formatToParts(). Shares the Intl.DateTimeFormat.prototype.resolvedOptions enforcement point with the intl surface — timezone is applied after intl in the registry so it wraps the intl proxy, setting timeZone on top of the locale override. Enforcement points: Date.prototype.getTimezoneOffset, Intl.DateTimeFormat.prototype.resolvedOptions.',
  },
  {
    id: 'domRect',
    title: 'DOMRect noise surface',
    kind: 'rendering',
    execution: 'profile-required',
    scope: ['prototype'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'none',
    notes: 'Input-deterministic sub-pixel noise on getBoundingClientRect, getClientRects, SVG getBBox.',
  },
  {
    id: 'textMetrics',
    title: 'TextMetrics noise surface',
    kind: 'rendering',
    execution: 'profile-required',
    scope: ['prototype'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'none',
    notes: 'Sub-pixel noise on CanvasRenderingContext2D.measureText() metric properties.',
  },
  {
    id: 'mathFingerprint',
    title: 'Math engine fingerprint surface',
    kind: 'rendering',
    execution: 'profile-required',
    scope: ['prototype'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'full',
    notes: 'Input-deterministic epsilon noise on trig/hyperbolic Math functions.',
  },
  {
    id: 'speechVoices',
    title: 'SpeechSynthesis voices surface',
    kind: 'media',
    execution: 'profile-required',
    scope: ['window'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: false,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'none',
    notes: 'Replaces speechSynthesis.getVoices() with realistic OS-matched voice list.',
  },
  {
    id: 'webrtc',
    title: 'WebRTC candidate surface',
    kind: 'media',
    execution: 'profile-required',
    scope: ['window'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: true,
    browserSupport: chromeFullFirefoxFull,
    webPlatformWorkerExposure: 'none',
    notes: 'Forces relay-only ICE and strips local IP from SDP.',
  },
  {
    id: 'battery',
    title: 'Battery status surface',
    kind: 'identity',
    execution: 'profile-required',
    scope: ['navigator'],
    profileRequired: true,
    sameOriginIframeReachable: true,
    secureContextOnly: true,
    browserSupport: chromeFullFirefoxNone,
    webPlatformWorkerExposure: 'none',
    notes: 'Spoofs navigator.getBattery() level and charging state from profile.',
  },
] as const)

const runtimeSurfaceDescriptorMap = deepFreeze(
  runtimeSurfaceDescriptors.reduce<Record<RuntimeSurfaceId, RuntimeSurfaceDescriptor>>((acc, descriptor) => {
    acc[descriptor.id] = descriptor
    return acc
  }, {} as Record<RuntimeSurfaceId, RuntimeSurfaceDescriptor>)
)

export const getRuntimeSurfaceDescriptor = (id: RuntimeSurfaceId): RuntimeSurfaceDescriptor => runtimeSurfaceDescriptorMap[id]

export const getRuntimeSurfaceSupport = (
  id: RuntimeSurfaceId,
  family: BrowserRuntimeFamily
): BrowserSupportLevel => runtimeSurfaceDescriptorMap[id].browserSupport[family]


export const getRuntimeSurfaceSupportLevels = (
  family: BrowserRuntimeFamily
): Readonly<Record<RuntimeSurfaceId, BrowserSupportLevel>> =>
  deepFreeze(
    runtimeSurfaceDescriptors.reduce<Record<RuntimeSurfaceId, BrowserSupportLevel>>((acc, descriptor) => {
      acc[descriptor.id] = descriptor.browserSupport[family]
      return acc
    }, {} as Record<RuntimeSurfaceId, BrowserSupportLevel>)
  )
