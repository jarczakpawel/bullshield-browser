import { buildPrivacySurfacePolicy, canonizeDomain, createRuntimeMetadata, getRuntimeSurfaceSupportLevels } from '~/shared'
import { buildFingerprintProfile } from '~/shared/fingerprint/profile'
import type { ContentScriptPayload, ReadonlySettingsState, ReadonlyUserAgentState } from '~/shared/types'
import { browserBrands, isMobile, platform } from '~/shared/client-hint'
import detectBrowser from '~/shared/detect-browser'
import { payloadCookiePathsForUrl } from './payload-cookie-paths'

type MaybeSettings = ReadonlySettingsState | undefined

type MaybeUserAgent = ReadonlyUserAgentState | undefined

type LegacyUseragentInfo = {
  info?: {
    useragent?: string
    userAgent?: string
    osType?: 'windows' | 'linux' | 'macOS' | 'iOS' | 'android' | 'unknown'
    browser?: 'chrome' | 'firefox' | 'opera' | 'safari' | 'edge' | 'unknown'
    browserVersion?: { major: number; full: string }
    brandBrowserVersion?: { major: number; full: string }
  }
}

const defaultFingerprintSettings: ReadonlySettingsState['fingerprint'] = {
  hardwareConcurrency: 'random',
  deviceMemory: 'random',
  screen: 'random',
  fonts: 'random',
  webgl: 'random',
  canvas: 'random',
  audio: 'random',
  localeMode: 'random',
  localePreset: 'en-US',
  timezone: 'random',
  timezonePreset: 'Europe/Warsaw',
  domRect: 'random',
  textMetrics: 'random',
  mathFingerprint: 'random',
  speechVoices: 'random',
  webrtc: 'random',
  battery: 'random',
  clientHints: 'random',
  cssMediaQuery: {
    mode: 'real',
    preset: '1920x1080@1',
  },
}

const defaultFingerprintModes: ContentScriptPayload['fingerprintModes'] = {
  hardwareConcurrency: 'random',
  deviceMemory: 'random',
  screen: 'random',
  fonts: 'random',
  webgl: 'random',
  canvas: 'random',
  audio: 'random',
  domRect: 'random',
  textMetrics: 'random',
  mathFingerprint: 'random',
  speechVoices: 'random',
  webrtc: 'random',
  battery: 'random',
  clientHints: 'random',
}

const settingsDefaults: Pick<ReadonlySettingsState, 'enabled' | 'jsProtection' | 'privacy' | 'fingerprint' | 'blacklist'> = {
  enabled: true,
  jsProtection: { enabled: true },
  privacy: {
    blockLocalFonts: false,
    blockMediaDeviceEnumeration: false,
    blockWebGpu: false,
    hidePdfViewer: false,
    hideSensitiveDeviceApis: false,
  },
  fingerprint: defaultFingerprintSettings,
  blacklist: {
    mode: 'blacklist',
    domains: ['localhost', '127.0.0.1'],
  },
}

const hostRuntime = createRuntimeMetadata(detectBrowser())
const hostRuntimeSurfaceSupportLevels = getRuntimeSurfaceSupportLevels(hostRuntime.hostBrowserFamily)

const cookieName = `${__UNIQUE_HEADER_KEY_NAME__.toLowerCase().replace(/[^a-z0-9]/g, '_')}_payload`
const payloadMetaCookieName = `${cookieName}_meta`
const payloadChunkCookiePrefix = `${cookieName}_part_`
const payloadChunkSize = 3000
const maxPayloadChunks = 32
const cookieTtlSeconds = 60

let latestSettings: MaybeSettings
let latestUserAgent: MaybeUserAgent

function mergeSettings(value: Partial<ReadonlySettingsState> | undefined): ReadonlySettingsState {
  return {
    ...settingsDefaults,
    ...value,
    jsProtection: {
      ...settingsDefaults.jsProtection,
      ...(value?.jsProtection || {}),
    },
    privacy: {
      ...settingsDefaults.privacy,
      ...(value?.privacy || {}),
    },
    fingerprint: {
      ...settingsDefaults.fingerprint,
      ...(value?.fingerprint || {}),
      cssMediaQuery: {
        ...settingsDefaults.fingerprint.cssMediaQuery,
        ...(value?.fingerprint?.cssMediaQuery || {}),
      },
    },
    blacklist: {
      ...settingsDefaults.blacklist,
      ...(value?.blacklist || {}),
      domains:
        value?.blacklist?.domains && value.blacklist.domains.length > 0
          ? value.blacklist.domains
          : settingsDefaults.blacklist.domains,
    },
  } as ReadonlySettingsState
}

function normalizeStoredUserAgentState(value: unknown): MaybeUserAgent {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  if ('info' in value && typeof (value as LegacyUseragentInfo).info === 'object') {
    const legacy = value as LegacyUseragentInfo
    const userAgent = typeof legacy.info?.userAgent === 'string' && legacy.info.userAgent.trim()
      ? legacy.info.userAgent.trim()
      : typeof legacy.info?.useragent === 'string'
        ? legacy.info.useragent.trim()
        : ''

    if (!userAgent) {
      return undefined
    }

    const baseState: ReadonlyUserAgentState = {
      userAgent,
      browser: legacy.info?.browser || 'unknown',
      os: legacy.info?.osType || 'unknown',
      version: {
        browser: legacy.info?.brandBrowserVersion || legacy.info?.browserVersion || { major: 0, full: '0.0.0' },
        underHood: legacy.info?.brandBrowserVersion ? legacy.info?.browserVersion : undefined,
      },
    }

    return {
      ...baseState,
      fingerprint: buildFingerprintProfile(baseState),
    }
  }

  const state = value as Partial<ReadonlyUserAgentState>

  if (typeof state.userAgent !== 'string' || !state.userAgent.trim()) {
    return undefined
  }

  const baseState: ReadonlyUserAgentState = {
    ...(state as ReadonlyUserAgentState),
    userAgent: state.userAgent.trim(),
    browser: state.browser || 'unknown',
    os: state.os || 'unknown',
    version: {
      browser: state.version?.browser || { major: 0, full: '0.0.0' },
      underHood: state.version?.underHood,
    },
  }

  return {
    ...baseState,
    fingerprint: baseState.fingerprint || buildFingerprintProfile(baseState),
  }
}

const initialSettingsPromise: Promise<MaybeSettings> = (async () => {
  try {
    const syncData = await chrome.storage.sync.get('settings-struct-v3')

    if (syncData && syncData['settings-struct-v3']) {
      latestSettings = mergeSettings(syncData['settings-struct-v3'] as Partial<ReadonlySettingsState>)
      return latestSettings
    }
  } catch {
    // ignore
  }

  try {
    const localData = await chrome.storage.local.get('settings-struct-v3')

    if (localData && localData['settings-struct-v3']) {
      latestSettings = mergeSettings(localData['settings-struct-v3'] as Partial<ReadonlySettingsState>)
      return latestSettings
    }
  } catch {
    // ignore
  }

  latestSettings = mergeSettings(undefined)

  return latestSettings
})()

const initialUserAgentPromise: Promise<MaybeUserAgent> = chrome.storage.local
  .get('useragent-state')
  .then((data) => {
    if (data && data['useragent-state']) {
      latestUserAgent = normalizeStoredUserAgentState(data['useragent-state'])
      return latestUserAgent
    }

    return latestUserAgent
  })
  .catch(() => latestUserAgent)

function isApplicableForDomain(settings: ReadonlySettingsState, domain: string): boolean {
  const normalized = canonizeDomain(domain)
  const isInList = settings.blacklist.domains.some((item) => normalized === item || normalized.endsWith(`.${item}`))

  switch (settings.blacklist.mode) {
    case 'blacklist':
      return !isInList

    case 'whitelist':
      return isInList
  }
}

const serialize = (payload: ContentScriptPayload): string =>
  btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

const splitSerializedPayload = (serialized: string): Array<string> => {
  if (!serialized) {
    return []
  }

  const parts: Array<string> = []

  for (let offset = 0; offset < serialized.length; offset += payloadChunkSize) {
    parts.push(serialized.slice(offset, offset + payloadChunkSize))
  }

  return parts
}

function toPayload(ua: ReadonlyUserAgentState, settings: ReadonlySettingsState): ContentScriptPayload {
  const brandsMajor = (() => {
    switch (ua.browser) {
      case 'chrome':
        return browserBrands('chrome', ua.version.browser.major)
      case 'opera':
        return browserBrands('opera', ua.version.browser.major, ua.version.underHood?.major || 0)
      case 'edge':
        return browserBrands('edge', ua.version.browser.major, ua.version.underHood?.major || 0)
    }

    return []
  })()

  const brandsFull = (() => {
    switch (ua.browser) {
      case 'chrome':
        return browserBrands('chrome', ua.version.browser.full)
      case 'opera':
        return browserBrands('opera', ua.version.browser.full, ua.version.underHood?.full || '')
      case 'edge':
        return browserBrands('edge', ua.version.browser.full, ua.version.underHood?.full || '')
    }

    return []
  })()

  return {
    current: ua,
    brands: {
      major: brandsMajor,
      full: brandsFull,
    },
    platform: platform(ua.os),
    isMobile: ua.os === 'android' ? ua.device?.type !== 'tablet' : isMobile(ua.os),
    runtime: { ...hostRuntime, surfaceSupportLevels: hostRuntimeSurfaceSupportLevels },
    privacy: { ...settings.privacy },
    privacyPolicy: buildPrivacySurfacePolicy(settings.privacy),
    fingerprintModes: {
      ...defaultFingerprintModes,
      ...Object.fromEntries(Object.entries(settings.fingerprint || {}).filter(([key]) => !['cssMediaQuery', 'localeMode', 'localePreset', 'timezone', 'timezonePreset'].includes(key))),
    },
    localeMode: settings.fingerprint?.localeMode || 'random',
    localePreset: settings.fingerprint?.localePreset || 'en-US',
    timezoneMode: settings.fingerprint?.timezone || 'random',
    timezonePreset: settings.fingerprint?.timezonePreset || 'Europe/Warsaw',
    cssMediaQuery: {
      mode: settings.fingerprint?.cssMediaQuery?.mode || 'real',
      preset: settings.fingerprint?.cssMediaQuery?.preset || '1920x1080@1',
    },
  }
}

async function clearPayloadCookie(url: URL): Promise<void> {
  await Promise.allSettled(
    payloadCookiePathsForUrl(url).flatMap((path) => {
      const cookieUrl = url.origin + path
      const names = [cookieName, payloadMetaCookieName, ...Array.from({ length: maxPayloadChunks }, (_, index) => `${payloadChunkCookiePrefix}${index}`)]

      return names.map(async (name) => {
        try {
          await chrome.cookies.remove({ url: cookieUrl, name })
        } catch {
          // ignore
        }
      })
    })
  )
}

async function ensureState(): Promise<[MaybeSettings, MaybeUserAgent]> {
  if (!latestSettings) {
    latestSettings = await initialSettingsPromise
  }

  if (!latestUserAgent) {
    latestUserAgent = await initialUserAgentPromise
  }

  return [latestSettings, latestUserAgent]
}

chrome.webNavigation.onBeforeNavigate.addListener(async ({ frameId, url }) => {
  if (frameId !== 0) {
    return
  }

  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return
  }

  const [settings, current] = await ensureState()

  if (!settings || !current || !current.userAgent.trim() || !settings.enabled || !settings.jsProtection.enabled) {
    await clearPayloadCookie(parsed)
    return
  }

  if (!isApplicableForDomain(settings, parsed.hostname)) {
    await clearPayloadCookie(parsed)
    return
  }

  try {
    const cookiePath = payloadCookiePathsForUrl(parsed)[0] || '/'
    const serialized = serialize(toPayload(current, settings))
    const parts = splitSerializedPayload(serialized)

    if (parts.length === 0 || parts.length > maxPayloadChunks) {
      await clearPayloadCookie(parsed)
      return
    }

    await clearPayloadCookie(parsed)

    const baseCookie = {
      url: parsed.origin + cookiePath,
      path: cookiePath,
      secure: parsed.protocol === 'https:',
      sameSite: 'lax' as chrome.cookies.SameSiteStatus,
      expirationDate: Math.floor(Date.now() / 1000) + cookieTtlSeconds,
    }

    await chrome.cookies.set({
      ...baseCookie,
      name: payloadMetaCookieName,
      value: String(parts.length),
    })

    await Promise.all(
      parts.map((value, index) =>
        chrome.cookies.set({
          ...baseCookie,
          name: `${payloadChunkCookiePrefix}${index}`,
          value,
        })
      )
    )
  } catch {
    // ignore
  }
})


export async function clearNavigationPayloadForUrl(url: string): Promise<void> {
  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return
  }

  await clearPayloadCookie(parsed)
}

export const pagePayloadCookieName = cookieName

export const updateNavigationPayloadState = (settings: MaybeSettings, userAgent: MaybeUserAgent): void => {
  latestSettings = settings
  latestUserAgent = normalizeStoredUserAgentState(userAgent)
}
