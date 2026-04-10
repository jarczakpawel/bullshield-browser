import { deepFreeze } from './freeze'
import type { RuntimeSurfaceId } from './surface-catalog'

export type RuntimeSurfaceRestrictionShape =
  | 'not-supported'
  | 'none'
  | 'hide-property'
  | 'deny-call'
  | 'empty-collection'
  | 'normalized-collection'
  | 'permission-denied'

export type RuntimeSurfaceProjectionShape =
  | 'none'
  | 'navigator-identity'
  | 'window-screen'
  | 'rendering-metadata'
  | 'localization'

export type RuntimeSurfaceEnforcementPoint =
  | 'navigator-own-properties'
  | 'window-own-properties'
  | 'screen-instance-properties'
  | 'webgl-context-prototype'
  | 'webgpu-navigator-entrypoint'
  | 'media-devices-prototype'
  | 'window-font-access-entrypoint'
  | 'permissions-prototype'
  | 'pdf-viewer-collections'
  | 'intl-datetimeformat-prototype'
  | 'canvas-rendering-context-prototype'
  | 'canvas-element-prototype'
  | 'audio-buffer-prototype'
  | 'date-prototype'
  | 'same-origin-iframe-realms'
  | 'element-prototype'
  | 'canvas-measuretext-prototype'
  | 'math-object'
  | 'speechsynthesis-getvoices'
  | 'rtcpeerconnection-constructor'
  | 'navigator-getbattery'

export type RuntimeSurfaceContract = Readonly<{
  runtimeSurfaceId: RuntimeSurfaceId
  restrictionSupported: boolean
  restrictionShape: RuntimeSurfaceRestrictionShape
  profileProjectionShape: RuntimeSurfaceProjectionShape
  enforcementPoints: readonly RuntimeSurfaceEnforcementPoint[]
  dependencies: readonly RuntimeSurfaceId[]
  sameOriginRealmCoverage: readonly ('top-window' | 'same-origin-iframes' | 'nested-same-origin-iframes')[]
  notes: string
}>

export const runtimeSurfaceContracts: readonly RuntimeSurfaceContract[] = deepFreeze([
  {
    runtimeSurfaceId: 'navigatorIdentity',
    restrictionSupported: true,
    restrictionShape: 'hide-property',
    profileProjectionShape: 'navigator-identity',
    enforcementPoints: ['navigator-own-properties', 'same-origin-iframe-realms'],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Controls navigator getters and other navigator entry points exposed directly to page script.',
  },
  {
    runtimeSurfaceId: 'screen',
    restrictionSupported: false,
    restrictionShape: 'none',
    profileProjectionShape: 'window-screen',
    enforcementPoints: ['window-own-properties', 'screen-instance-properties', 'same-origin-iframe-realms'],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Controls Window and Screen instance properties derived from the active profile.',
  },
  {
    runtimeSurfaceId: 'webgl',
    restrictionSupported: false,
    restrictionShape: 'none',
    profileProjectionShape: 'rendering-metadata',
    enforcementPoints: ['webgl-context-prototype', 'same-origin-iframe-realms'],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Controls WebGL debug renderer metadata at the prototype layer.',
  },
  {
    runtimeSurfaceId: 'webGpu',
    restrictionSupported: true,
    restrictionShape: 'hide-property',
    profileProjectionShape: 'rendering-metadata',
    enforcementPoints: ['webgpu-navigator-entrypoint', 'same-origin-iframe-realms'],
    dependencies: ['navigatorIdentity'],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Can be restricted by removing navigator.gpu or projected when a profile is present.',
  },
  {
    runtimeSurfaceId: 'mediaDevices',
    restrictionSupported: true,
    restrictionShape: 'empty-collection',
    profileProjectionShape: 'none',
    enforcementPoints: ['media-devices-prototype', 'same-origin-iframe-realms'],
    dependencies: ['permissions'],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Restricts device enumeration without touching the real API and keeps media surface behavior policy-driven.',
  },
  {
    runtimeSurfaceId: 'fonts',
    restrictionSupported: true,
    restrictionShape: 'permission-denied',
    profileProjectionShape: 'none',
    enforcementPoints: ['window-font-access-entrypoint', 'same-origin-iframe-realms'],
    dependencies: ['permissions'],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Blocks Local Font Access and keeps font-related checks inside the same restriction policy.',
  },
  {
    runtimeSurfaceId: 'permissions',
    restrictionSupported: true,
    restrictionShape: 'normalized-collection',
    profileProjectionShape: 'none',
    enforcementPoints: ['permissions-prototype', 'same-origin-iframe-realms'],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Normalizes permission query results for privacy-controlled surfaces.',
  },
  {
    runtimeSurfaceId: 'pdfViewer',
    restrictionSupported: true,
    restrictionShape: 'normalized-collection',
    profileProjectionShape: 'none',
    enforcementPoints: ['navigator-own-properties', 'pdf-viewer-collections', 'same-origin-iframe-realms'],
    dependencies: ['navigatorIdentity'],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Normalizes pdfViewerEnabled, plugins and mimeTypes together as one surface contract.',
  },
  {
    runtimeSurfaceId: 'intl',
    restrictionSupported: false,
    restrictionShape: 'none',
    profileProjectionShape: 'localization',
    enforcementPoints: ['intl-datetimeformat-prototype', 'same-origin-iframe-realms'],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Controls locale exposure through Intl.DateTimeFormat.prototype.resolvedOptions.',
  },
  {
    runtimeSurfaceId: 'canvas',
    restrictionSupported: false,
    restrictionShape: 'none',
    profileProjectionShape: 'rendering-metadata',
    enforcementPoints: [
      'canvas-rendering-context-prototype',
      'canvas-element-prototype',
      'webgl-context-prototype',
      'same-origin-iframe-realms',
    ],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Applies deterministic ±1 per-pixel noise to pixel read paths only (getImageData, toDataURL, toBlob, readPixels). The drawing buffer is not modified. WebGL readPixels is covered at the webgl-context-prototype point.',
  },
  {
    runtimeSurfaceId: 'audio',
    restrictionSupported: false,
    restrictionShape: 'none',
    profileProjectionShape: 'rendering-metadata',
    enforcementPoints: ['audio-buffer-prototype', 'same-origin-iframe-realms'],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Adds seeded PRNG amplitude noise to AudioBuffer.getChannelData(). Modifies the real channel buffer in-place (visible to page scripts). Each Float32Array is noised at most once per lifetime via WeakMap guard.',
  },
  {
    runtimeSurfaceId: 'timezone',
    restrictionSupported: false,
    restrictionShape: 'none',
    profileProjectionShape: 'localization',
    enforcementPoints: ['date-prototype', 'intl-datetimeformat-prototype', 'same-origin-iframe-realms'],
    dependencies: ['intl'],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Spoofs IANA timezone zone via profile.timezoneZone. DST-aware: getTimezoneOffset() is computed from nativeDateTimeFormat.formatToParts(). Shares intl-datetimeformat-prototype with the intl surface; timezone is applied after intl in the registry and wraps the locale proxy, setting timeZone on top of locale.',
  },
  {
    runtimeSurfaceId: 'domRect',
    restrictionSupported: false,
    restrictionShape: 'none',
    profileProjectionShape: 'none',
    enforcementPoints: ['element-prototype', 'same-origin-iframe-realms'],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Adds input-deterministic sub-pixel noise to getBoundingClientRect, getClientRects, and SVG getBBox. Same element always gets same noise.',
  },
  {
    runtimeSurfaceId: 'textMetrics',
    restrictionSupported: false,
    restrictionShape: 'none',
    profileProjectionShape: 'none',
    enforcementPoints: ['canvas-measuretext-prototype', 'same-origin-iframe-realms'],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Adds sub-pixel noise to CanvasRenderingContext2D.measureText() metric properties.',
  },
  {
    runtimeSurfaceId: 'mathFingerprint',
    restrictionSupported: false,
    restrictionShape: 'none',
    profileProjectionShape: 'none',
    enforcementPoints: ['math-object', 'same-origin-iframe-realms'],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Adds input-deterministic epsilon-scale noise to trig/hyperbolic Math functions. Same input always produces same output.',
  },
  {
    runtimeSurfaceId: 'speechVoices',
    restrictionSupported: false,
    restrictionShape: 'none',
    profileProjectionShape: 'none',
    enforcementPoints: ['speechsynthesis-getvoices', 'same-origin-iframe-realms'],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Replaces speechSynthesis.getVoices() with a realistic OS-matched voice list from the profile.',
  },
  {
    runtimeSurfaceId: 'webrtc',
    restrictionSupported: false,
    restrictionShape: 'none',
    profileProjectionShape: 'none',
    enforcementPoints: ['rtcpeerconnection-constructor', 'same-origin-iframe-realms'],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Forces relay-only ICE transport and strips local IP candidates from SDP offers.',
  },
  {
    runtimeSurfaceId: 'battery',
    restrictionSupported: false,
    restrictionShape: 'none',
    profileProjectionShape: 'none',
    enforcementPoints: ['navigator-getbattery', 'same-origin-iframe-realms'],
    dependencies: [],
    sameOriginRealmCoverage: ['top-window', 'same-origin-iframes', 'nested-same-origin-iframes'],
    notes: 'Spoofs navigator.getBattery() to return profile-seeded level/charging values.',
  },
] as const)

const runtimeSurfaceContractMap = deepFreeze(
  runtimeSurfaceContracts.reduce<Record<RuntimeSurfaceId, RuntimeSurfaceContract>>((acc, contract) => {
    acc[contract.runtimeSurfaceId] = contract
    return acc
  }, {} as Record<RuntimeSurfaceId, RuntimeSurfaceContract>)
)

export const getRuntimeSurfaceContract = (id: RuntimeSurfaceId): RuntimeSurfaceContract => runtimeSurfaceContractMap[id]
