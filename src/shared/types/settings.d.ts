import type { DeepPartial, DeepReadonly } from '~/types'

export type SettingsGeneratorType =
  | 'chrome_win'
  | 'chrome_mac'
  | 'chrome_linux'
  | 'chrome_android'
  | 'firefox_win'
  | 'firefox_mac'
  | 'firefox_linux'
  | 'firefox_android'
  | 'opera_win'
  | 'opera_mac'
  | 'safari_iphone'
  | 'safari_mac'
  | 'edge_win'
  | 'edge_mac'

export type SurfaceSpoofMode = 'random' | 'real' | 'off'
export type LocaleSpoofMode = 'random' | 'real' | 'static'
export type TimezoneSpoofMode = 'random' | 'real' | 'off' | 'static'
export type CssMediaSpoofMode = 'real' | 'random' | 'static'

type SettingsState = {
  enabled: boolean
  renew: {
    enabled: boolean
    intervalMillis: number
    onStartup: boolean
  }
  jsProtection: { enabled: boolean }
  privacy: {
    blockLocalFonts: boolean
    blockMediaDeviceEnumeration: boolean
    blockWebGpu: boolean
    hidePdfViewer: boolean
    hideSensitiveDeviceApis: boolean
  }
  fingerprint: {
    hardwareConcurrency: SurfaceSpoofMode
    deviceMemory: SurfaceSpoofMode
    screen: SurfaceSpoofMode
    fonts: SurfaceSpoofMode
    webgl: SurfaceSpoofMode
    canvas: SurfaceSpoofMode
    audio: SurfaceSpoofMode
    localeMode: LocaleSpoofMode
    localePreset: string
    timezone: TimezoneSpoofMode
    timezonePreset: string
    domRect: SurfaceSpoofMode
    textMetrics: SurfaceSpoofMode
    mathFingerprint: SurfaceSpoofMode
    speechVoices: SurfaceSpoofMode
    webrtc: SurfaceSpoofMode
    battery: SurfaceSpoofMode
    clientHints: SurfaceSpoofMode
    cssMediaQuery: {
      mode: CssMediaSpoofMode
      preset: string
    }
  }
  generator: {
    types: Array<SettingsGeneratorType>
    syncOsWithHost: boolean
  }
  blacklist: {
    mode: 'blacklist' | 'whitelist'
    domains: Array<string>
  }
}

export type ReadonlySettingsState = DeepReadonly<SettingsState>
export type PartialSettingsState = DeepPartial<SettingsState>
