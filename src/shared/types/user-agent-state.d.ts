import type { DeepReadonly } from '~/types'

type FingerprintPermissionState = 'granted' | 'denied' | 'prompt'

type FingerprintProfile = {
  language: string
  languages: string[]
  hardwareConcurrency: number
  deviceMemory?: number
  maxTouchPoints: number
  pdfViewerEnabled: boolean
  platform: string
  vendor: string
  oscpu?: string
  architecture: string
  bitness: string
  mobile: boolean
  model: string
  platformVersion: string
  screen: {
    width: number
    height: number
    availWidth: number
    availHeight: number
    colorDepth: number
    pixelDepth: number
    devicePixelRatio: number
  }
  webgl: {
    vendor: string
    renderer: string
  }
  gpu: {
    vendor: string
    architecture: string
    device: string
    description: string
    isFallbackAdapter: boolean
  }
  gpuCapability: {
    features: string[]
    limits: Record<string, number>
    wgslLanguageFeatures: string[]
    preferredCanvasFormat: 'rgba8unorm' | 'bgra8unorm'
  }
  webglShaderPrecision: {
    // key: `${shaderType}:${precisionType}` → { rangeMin, rangeMax, precision }
    // shaderType: 35632=FRAGMENT, 35633=VERTEX
    // precisionType: 35840=LOW_FLOAT, 35841=MEDIUM_FLOAT, 35842=HIGH_FLOAT,
    //                35843=LOW_INT,   35844=MEDIUM_INT,   35845=HIGH_INT
    table: Record<string, { rangeMin: number; rangeMax: number; precision: number }>
  }
  mediaDevices: Array<{
    kind: 'audioinput' | 'audiooutput' | 'videoinput'
    label: string
    deviceId: string
    groupId: string
  }>
  fonts: {
    families: string[]
  }
  permissions: {
    camera: FingerprintPermissionState
    microphone: FingerprintPermissionState
    speakerSelection: FingerprintPermissionState
    localFonts: FingerprintPermissionState
  }
  canvasNoise: number
  audioNoise: number
  audioSeed: number
  timezoneZone: string
  domRectNoise: number
  textMetricsNoise: number
  mathFingerprint: { noise: number }
  speechVoices: Array<{
    name: string
    lang: string
    localService: boolean
    voiceURI: string
    default: boolean
  }>
  webrtcCandidatePolicy: 'obfuscate' | 'disable_non_proxied_udp' | 'default'
  batteryLevel: number
  batteryCharging: boolean
}

type UserAgentState = {
  userAgent: string
  browser: 'chrome' | 'firefox' | 'opera' | 'safari' | 'edge' | 'unknown'
  os: 'windows' | 'linux' | 'macOS' | 'iOS' | 'android' | 'unknown'
  version: {
    browser: { major: number; full: string }
    underHood?: { major: number; full: string }
  }
  device?: {
    manufacturer: string
    model: string
    type: 'mobile' | 'tablet'
    osVersion: string
  }
  fingerprint?: FingerprintProfile
}

export type ReadonlyUserAgentState = DeepReadonly<UserAgentState>
