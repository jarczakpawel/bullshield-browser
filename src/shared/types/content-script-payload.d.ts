import type { DeepReadonly } from '~/types'
import type { ReadonlyUserAgentState } from './user-agent-state'
import type { PrivacySurfacePolicy } from '~/shared/privacy-surfaces'
import type { RuntimeMetadata, BrowserSupportLevel } from '~/shared/browser-runtime'
import type { RuntimeSurfaceId } from '~/shared/surface-catalog'
import type { SurfaceSpoofMode, LocaleSpoofMode, TimezoneSpoofMode, CssMediaSpoofMode } from './settings'

export type ContentScriptPayload<TBrand = { readonly brand: string; readonly version: string }> = DeepReadonly<{
  current: ReadonlyUserAgentState
  brands: { major: Array<TBrand>; full: Array<TBrand> }
  platform: 'Windows' | 'Linux' | 'macOS' | 'iOS' | 'Android' | 'Unknown'
  isMobile: boolean
  runtime: RuntimeMetadata & {
    surfaceSupportLevels: Readonly<Record<RuntimeSurfaceId, BrowserSupportLevel>>
  }
  privacy: {
    blockLocalFonts: boolean
    blockMediaDeviceEnumeration: boolean
    blockWebGpu: boolean
    hidePdfViewer: boolean
    hideSensitiveDeviceApis: boolean
  }
  privacyPolicy: PrivacySurfacePolicy
  fingerprintModes: Readonly<{
    hardwareConcurrency: SurfaceSpoofMode
    deviceMemory: SurfaceSpoofMode
    screen: SurfaceSpoofMode
    fonts: SurfaceSpoofMode
    webgl: SurfaceSpoofMode
    canvas: SurfaceSpoofMode
    audio: SurfaceSpoofMode
    domRect: SurfaceSpoofMode
    textMetrics: SurfaceSpoofMode
    mathFingerprint: SurfaceSpoofMode
    speechVoices: SurfaceSpoofMode
    webrtc: SurfaceSpoofMode
    battery: SurfaceSpoofMode
    clientHints: SurfaceSpoofMode
  }>
  localeMode: LocaleSpoofMode
  localePreset: string
  timezoneMode: TimezoneSpoofMode
  timezonePreset: string
  cssMediaQuery: Readonly<{
    mode: CssMediaSpoofMode
    preset: string
  }>
}>
