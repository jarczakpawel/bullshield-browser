import { canonizeDomain, detectBrowser } from '~/shared'
import { browserBrands, isMobile, platform } from '~/shared/client-hint'
import { buildFingerprintProfile } from '~/shared/fingerprint/profile'
import { architectureFor, bitnessFor, formFactorsFor, platformVersionFor, supportsUAClientHints, wow64For } from '~/shared/fingerprint/ua-ch'
import type { ReadonlySettingsState, ReadonlyUserAgentState } from '~/shared/types'

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

type DebuggeeSession = chrome.debugger.Debuggee & { sessionId?: string }

type UserAgentMetadata = {
  brands: Array<{ brand: string; version: string }>
  fullVersionList: Array<{ brand: string; version: string }>
  fullVersion: string
  platform: string
  platformVersion: string
  architecture: string
  model: string
  mobile: boolean
  bitness: string
  wow64: boolean
  formFactors?: string[]
}

type HostNavigatorUAData = {
  brands?: Array<{ brand: string; version: string }>
  mobile?: boolean
  platform?: string
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>
}

type HostNavigator = Navigator & {
  userAgentData?: HostNavigatorUAData
  maxTouchPoints?: number
}

const settingsDefaults: Pick<ReadonlySettingsState, 'enabled' | 'jsProtection' | 'blacklist' | 'fingerprint'> = {
  enabled: true,
  jsProtection: { enabled: true },
  fingerprint: {
    screen: 'random',
    localeMode: 'random',
    localePreset: 'en-US',
    timezone: 'random',
    timezonePreset: 'Europe/Warsaw',
    clientHints: 'random',
    cssMediaQuery: {
      mode: 'real',
      preset: '1920x1080@1',
    },
  } as ReadonlySettingsState['fingerprint'],
  blacklist: {
    mode: 'blacklist',
    domains: ['localhost', '127.0.0.1'],
  },
}

const protocolVersion = '1.3'
const autoAttachFilter = [
  { type: 'iframe', exclude: false },
  { type: 'service_worker', exclude: false },
  { type: 'shared_worker', exclude: false },
  { type: 'worker', exclude: false },
]

let latestSettings: MaybeSettings
let latestUserAgent: MaybeUserAgent

const attachedTabs = new Set<number>()
const attachingTabs = new Set<number>()
const childSessionsByTab = new Map<number, Set<string>>()
const attachedRootTargets = new Set<string>()
const rootTargetOriginById = new Map<string, string>()

function mergeSettings(value: Partial<ReadonlySettingsState> | undefined): ReadonlySettingsState {
  return {
    ...settingsDefaults,
    ...value,
    jsProtection: {
      ...settingsDefaults.jsProtection,
      ...(value?.jsProtection || {}),
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
          ? value.blacklist.domains.map(canonizeDomain)
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

const supportsDebugger = (): boolean => detectBrowser() !== 'firefox' && typeof chrome.debugger === 'object'

const isHttpUrl = (url: string): boolean => /^https?:\/\//i.test(url)

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

async function ensureState(): Promise<[MaybeSettings, MaybeUserAgent]> {
  if (!latestSettings) {
    latestSettings = await initialSettingsPromise
  }

  if (!latestUserAgent) {
    latestUserAgent = await initialUserAgentPromise
  }

  return [latestSettings, latestUserAgent]
}

function navigatorPlatformFor(os: ReadonlyUserAgentState['os']): string {
  switch (os) {
    case 'windows':
      return 'Win32'
    case 'linux':
      return 'Linux x86_64'
    case 'android':
      return 'Linux armv8l'
    case 'macOS':
      return 'MacIntel'
    case 'iOS':
      return 'iPhone'
    default:
      return ''
  }
}


function localeChain(primary: string): string[] {
  const normalized = String(primary || '').trim()
  if (!normalized) {
    return ['en-US', 'en']
  }

  const base = normalized.split('-')[0]
  return normalized === base ? [normalized] : [...new Set([normalized, base])]
}

function localeMode(): 'random' | 'real' | 'static' {
  const value = latestSettings?.fingerprint?.localeMode
  return value === 'random' || value === 'real' || value === 'static' ? value : 'random'
}

function timezoneMode(): 'random' | 'real' | 'off' | 'static' {
  const value = latestSettings?.fingerprint?.timezone
  return value === 'random' || value === 'real' || value === 'off' || value === 'static' ? value : 'random'
}

function effectiveLocaleFor(ua: ReadonlyUserAgentState): string | undefined {
  if (localeMode() === 'static') {
    const preset = latestSettings?.fingerprint?.localePreset
    return typeof preset === 'string' && preset.trim() ? preset.trim() : 'en-US'
  }

  const langs = ua.fingerprint?.languages
  if (langs && langs.length > 0) {
    return langs[0]
  }

  const lang = ua.fingerprint?.language
  return typeof lang === 'string' && lang ? lang : undefined
}

function effectiveLanguagesFor(ua: ReadonlyUserAgentState): string[] {
  if (localeMode() === 'static') {
    return localeChain(latestSettings?.fingerprint?.localePreset || 'en-US')
  }

  const langs = ua.fingerprint?.languages
  if (langs && langs.length > 0) {
    return [...langs]
  }

  const lang = ua.fingerprint?.language
  return typeof lang === 'string' && lang ? localeChain(lang) : ['en-US', 'en']
}

function effectiveTimeZoneFor(ua: ReadonlyUserAgentState): string | undefined {
  const mode = timezoneMode()

  if (mode === 'off') {
    return 'UTC'
  }

  if (mode === 'static') {
    const preset = latestSettings?.fingerprint?.timezonePreset
    return typeof preset === 'string' && preset.trim() ? preset.trim() : 'UTC'
  }

  const zone = ua.fingerprint?.timezoneZone
  return typeof zone === 'string' && zone ? zone : undefined
}

function debuggerTimezoneOverrideFor(mode: 'random' | 'real' | 'off' | 'static', zone: string | undefined): string {
  if (mode === 'real') {
    return ''
  }

  if (mode === 'off') {
    return 'UTC'
  }

  return zone || ''
}

function modelFor(ua: ReadonlyUserAgentState): string {
  if (ua.os !== 'android') {
    return ''
  }

  if (ua.device?.model) {
    return ua.device.model
  }

  const match = ua.userAgent.match(/Android\s+[^;]+;\s*([^;)]+?)(?:\)|;)/i)

  return match?.[1]?.trim() || ''
}

function userAgentMetadataFor(ua: ReadonlyUserAgentState): UserAgentMetadata {
  const brands = (() => {
    switch (ua.browser) {
      case 'chrome':
        return browserBrands('chrome', ua.version.browser.major)
      case 'opera':
        return browserBrands('opera', ua.version.browser.major, ua.version.underHood?.major || 0)
      case 'edge':
        return browserBrands('edge', ua.version.browser.major, ua.version.underHood?.major || 0)
      default:
        return []
    }
  })()

  const fullVersionList = (() => {
    switch (ua.browser) {
      case 'chrome':
        return browserBrands('chrome', ua.version.browser.full)
      case 'opera':
        return browserBrands('opera', ua.version.browser.full, ua.version.underHood?.full || '')
      case 'edge':
        return browserBrands('edge', ua.version.browser.full, ua.version.underHood?.full || '')
      default:
        return []
    }
  })()

  return {
    brands: brands.map(({ brand, version }) => ({ brand, version })),
    fullVersionList: fullVersionList.map(({ brand, version }) => ({ brand, version })),
    fullVersion: ua.version.browser.full,
    platform: platform(ua.os),
    platformVersion: platformVersionFor(ua),
    architecture: architectureFor(ua, ua.fingerprint?.gpu?.vendor),
    model: modelFor(ua),
    mobile: ua.os === 'android' ? ua.device?.type !== 'tablet' : isMobile(ua.os),
    bitness: bitnessFor(ua.os),
    wow64: wow64For(ua),
    formFactors: formFactorsFor(ua),
  }
}

async function hostUserAgentMetadata(): Promise<UserAgentMetadata | undefined> {
  const uaData = (navigator as HostNavigator).userAgentData

  if (!uaData) {
    return undefined
  }

  const brands = Array.isArray(uaData.brands) ? uaData.brands : []
  let fullVersionList = brands
  let fullVersion = brands[0]?.version || ''
  let platformVersion = '0.0.0'
  let architecture = ''
  let model = ''
  let bitness = ''
  let wow64 = false

  if (typeof uaData.getHighEntropyValues === 'function') {
    try {
      const values = await uaData.getHighEntropyValues([
        'fullVersionList',
        'platformVersion',
        'architecture',
        'model',
        'bitness',
        'wow64',
        'uaFullVersion',
      ])

      if (Array.isArray(values.fullVersionList)) {
        fullVersionList = values.fullVersionList as Array<{ brand: string; version: string }>
      }

      if (typeof values.platformVersion === 'string') {
        platformVersion = values.platformVersion
      }

      if (typeof values.architecture === 'string') {
        architecture = values.architecture
      }

      if (typeof values.model === 'string') {
        model = values.model
      }

      if (typeof values.bitness === 'string') {
        bitness = values.bitness
      }

      if (typeof values.wow64 === 'boolean') {
        wow64 = values.wow64
      }

      if (typeof values.uaFullVersion === 'string' && values.uaFullVersion) {
        fullVersion = values.uaFullVersion
      }
    } catch {
      // ignore
    }
  }

  if (!fullVersion && fullVersionList[0]?.version) {
    fullVersion = fullVersionList[0].version
  }

  return {
    brands: brands.map(({ brand, version }) => ({ brand, version })),
    fullVersionList: fullVersionList.map(({ brand, version }) => ({ brand, version })),
    fullVersion,
    platform: typeof uaData.platform === 'string' && uaData.platform ? uaData.platform : 'Unknown',
    platformVersion,
    architecture,
    model,
    mobile: !!uaData.mobile,
    bitness,
    wow64,
  }
}

async function hostLanguageList(): Promise<string[]> {
  if (typeof chrome !== 'undefined' && chrome.i18n?.getAcceptLanguages) {
    try {
      const languages = await new Promise<string[]>((resolve) => chrome.i18n.getAcceptLanguages((values) => resolve(values || [])))
      const filtered = languages.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      if (filtered.length > 0) {
        return filtered
      }
    } catch {
      // ignore
    }
  }

  const languages = Array.isArray(navigator.languages)
    ? navigator.languages.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : typeof navigator.language === 'string' && navigator.language.trim().length > 0
      ? [navigator.language]
      : []

  return languages.length > 0 ? languages : ['en-US', 'en']
}

async function hostPrimaryLocale(): Promise<string> {
  const languages = await hostLanguageList()
  if (languages.length > 0) {
    return languages[0]
  }

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    if (typeof locale === 'string' && locale.trim().length > 0) {
      return locale
    }
  } catch {
    // ignore
  }

  if (typeof navigator.language === 'string' && navigator.language.trim().length > 0) {
    return navigator.language
  }

  if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) {
    const locale = chrome.i18n.getUILanguage()
    if (typeof locale === 'string' && locale.trim().length > 0) {
      return locale
    }
  }

  return 'en-US'
}

function acceptLanguageFromList(languages: string[]): string {
  if (languages.length === 0) {
    return 'en-US,en;q=0.9'
  }

  return languages
    .slice(0, 5)
    .map((value, index) => {
      if (index === 0) {
        return value
      }

      const q = Math.max(0.1, 1 - index * 0.1)

      return `${value};q=${q.toFixed(1)}`
    })
    .join(',')
}

async function hostAcceptLanguage(): Promise<string> {
  return acceptLanguageFromList(await hostLanguageList())
}

async function applyHostToDebuggee(target: DebuggeeSession): Promise<void> {
  const hostMetadata = await hostUserAgentMetadata()
  const mobile = hostMetadata?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  const hostTouchPoints = Math.max((navigator as HostNavigator).maxTouchPoints || 0, mobile ? 1 : 0)
  const command: {
    userAgent: string
    acceptLanguage: string
    platform: string
    userAgentMetadata?: UserAgentMetadata
  } = {
    userAgent: navigator.userAgent,
    acceptLanguage: await hostAcceptLanguage(),
    platform: typeof navigator.platform === 'string' ? navigator.platform : '',
  }

  if (hostMetadata) {
    command.userAgentMetadata = hostMetadata
  }

  await chrome.debugger.sendCommand(target, 'Emulation.setUserAgentOverride', command)
  await chrome.debugger.sendCommand(target, 'Emulation.clearDeviceMetricsOverride').catch(() => undefined)
  await chrome.debugger.sendCommand(target, 'Emulation.setLocaleOverride', { locale: '' }).catch(() => undefined)
  await chrome.debugger.sendCommand(target, 'Emulation.setTimezoneOverride', { timezoneId: '' }).catch(() => undefined)
  await chrome.debugger.sendCommand(target, 'Emulation.setTouchEmulationEnabled', {
    enabled: hostTouchPoints > 0,
    maxTouchPoints: hostTouchPoints,
  }).catch(() => undefined)
  await chrome.debugger.sendCommand(target, 'Emulation.setEmitTouchEventsForMouse', {
    enabled: hostTouchPoints > 0,
    configuration: hostTouchPoints > 0 ? 'mobile' : 'desktop',
  }).catch(() => undefined)
}

async function applyHostToTabDebuggees(tabId: number): Promise<void> {
  const results = await Promise.allSettled(debuggeesForTab(tabId).map((target) => applyHostToDebuggee(target)))
  const primaryResult = results[0]

  if (primaryResult?.status === 'rejected') {
    throw primaryResult.reason
  }
}

async function attachAndApplyHost(tabId: number): Promise<void> {
  if (attachedTabs.has(tabId)) {
    await applyHostToTabDebuggees(tabId)
    return
  }

  if (attachingTabs.has(tabId)) {
    return
  }

  attachingTabs.add(tabId)

  try {
    await chrome.debugger.attach({ tabId }, protocolVersion)
    attachedTabs.add(tabId)

    await chrome.debugger.sendCommand({ tabId }, 'Target.setAutoAttach', {
      autoAttach: true,
      waitForDebuggerOnStart: true,
      flatten: true,
      filter: autoAttachFilter,
    })

    await applyHostToTabDebuggees(tabId)
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

    if (!message.includes('already attached')) {
      attachedTabs.delete(tabId)
      clearChildSessions(tabId)
    }
  } finally {
    attachingTabs.delete(tabId)
  }
}

async function applyHostToRootTarget(targetId: string): Promise<void> {
  if (!attachedRootTargets.has(targetId)) {
    await chrome.debugger.attach({ targetId }, protocolVersion)
    attachedRootTargets.add(targetId)
  }

  await applyHostToDebuggee({ targetId })
}

async function resetRootTargetsForOrigin(origin: string): Promise<void> {
  const targets = await chrome.debugger.getTargets()
  const matches = targets.filter((target) => isRootWorkerTarget(target) && originFromUrl(target.url) === origin)

  await Promise.allSettled(
    matches.map(async (target) => {
      rootTargetOriginById.set(target.id, origin)
      await applyHostToRootTarget(target.id)
    })
  )
}

function addChildSession(tabId: number, sessionId: string): void {
  let sessions = childSessionsByTab.get(tabId)

  if (!sessions) {
    sessions = new Set<string>()
    childSessionsByTab.set(tabId, sessions)
  }

  sessions.add(sessionId)
}

function removeChildSession(tabId: number, sessionId: string): void {
  const sessions = childSessionsByTab.get(tabId)

  if (!sessions) {
    return
  }

  sessions.delete(sessionId)

  if (sessions.size === 0) {
    childSessionsByTab.delete(tabId)
  }
}

function clearChildSessions(tabId: number): void {
  childSessionsByTab.delete(tabId)
}

function isRootWorkerTarget(target: chrome.debugger.TargetInfo): boolean {
  return !target.tabId && target.type !== 'page' && target.type !== 'background_page'
}

function originFromUrl(url: string): string | undefined {
  if (!isHttpUrl(url)) {
    return undefined
  }

  try {
    return new URL(url).origin
  } catch {
    return undefined
  }
}

async function detachRootTarget(targetId: string): Promise<void> {
  rootTargetOriginById.delete(targetId)

  if (!attachedRootTargets.has(targetId)) {
    return
  }

  try {
    await chrome.debugger.detach({ targetId })
  } catch {
    // ignore
  }

  attachedRootTargets.delete(targetId)
}

async function detachRootTargetsForOrigin(origin: string): Promise<void> {
  await Promise.allSettled(
    [...attachedRootTargets]
      .filter((targetId) => rootTargetOriginById.get(targetId) === origin)
      .map((targetId) => detachRootTarget(targetId))
  )
}

async function applyToRootTarget(targetId: string, ua: ReadonlyUserAgentState): Promise<void> {
  if (!attachedRootTargets.has(targetId)) {
    await chrome.debugger.attach({ targetId }, protocolVersion)
    attachedRootTargets.add(targetId)
  }

  await applyToDebuggee({ targetId }, ua)
}

async function syncRootTargetsForOrigin(origin: string, ua: ReadonlyUserAgentState): Promise<void> {
  const targets = await chrome.debugger.getTargets()

  const matches = targets.filter((target) => isRootWorkerTarget(target) && originFromUrl(target.url) === origin)

  await Promise.allSettled(
    matches.map(async (target) => {
      rootTargetOriginById.set(target.id, origin)
      await applyToRootTarget(target.id, ua)
    })
  )
}

async function reconcileRootTargets(): Promise<void> {
  if (!supportsDebugger()) {
    return
  }

  const [settings, ua] = await ensureState()

  if (!settings || !ua || !settings.enabled || !settings.jsProtection.enabled) {
    await Promise.allSettled([...attachedRootTargets].map((targetId) => detachRootTarget(targetId)))
    return
  }

  const tabs = await chrome.tabs.query({})
  const allowedOrigins = new Set<string>()

  for (const tab of tabs) {
    if (typeof tab.id !== 'number' || !tab.url || !isHttpUrl(tab.url)) {
      continue
    }

    let parsed: URL

    try {
      parsed = new URL(tab.url)
    } catch {
      continue
    }

    if (!isApplicableForDomain(settings, parsed.hostname)) {
      continue
    }

    allowedOrigins.add(parsed.origin)
  }

  await Promise.allSettled(
    [...attachedRootTargets]
      .filter((targetId) => !allowedOrigins.has(rootTargetOriginById.get(targetId) || ''))
      .map((targetId) => detachRootTarget(targetId))
  )

  await Promise.allSettled([...allowedOrigins].map((origin) => syncRootTargetsForOrigin(origin, ua)))
}

function debuggeesForTab(tabId: number): Array<DebuggeeSession> {
  const targets: Array<DebuggeeSession> = [{ tabId }]
  const sessions = childSessionsByTab.get(tabId)

  if (!sessions || sessions.size === 0) {
    return targets
  }

  for (const sessionId of sessions) {
    targets.push({ tabId, sessionId })
  }

  return targets
}


const cssMediaStaticPresets: Readonly<Record<string, Readonly<{ width: number; height: number; devicePixelRatio: number; touch: boolean }>>> = Object.freeze({
  '360x640@3': Object.freeze({ width: 360, height: 640, devicePixelRatio: 3, touch: true }),
  '375x667@2': Object.freeze({ width: 375, height: 667, devicePixelRatio: 2, touch: true }),
  '390x844@3': Object.freeze({ width: 390, height: 844, devicePixelRatio: 3, touch: true }),
  '412x915@2.625': Object.freeze({ width: 412, height: 915, devicePixelRatio: 2.625, touch: true }),
  '430x932@3': Object.freeze({ width: 430, height: 932, devicePixelRatio: 3, touch: true }),
  '768x1024@2': Object.freeze({ width: 768, height: 1024, devicePixelRatio: 2, touch: true }),
  '820x1180@2': Object.freeze({ width: 820, height: 1180, devicePixelRatio: 2, touch: true }),
  '1366x768@1': Object.freeze({ width: 1366, height: 768, devicePixelRatio: 1, touch: false }),
  '1536x864@1.25': Object.freeze({ width: 1536, height: 864, devicePixelRatio: 1.25, touch: false }),
  '1920x1080@1': Object.freeze({ width: 1920, height: 1080, devicePixelRatio: 1, touch: false }),
  '1920x1080@1.25': Object.freeze({ width: 1920, height: 1080, devicePixelRatio: 1.25, touch: false }),
  '2560x1440@1': Object.freeze({ width: 2560, height: 1440, devicePixelRatio: 1, touch: false }),
  '2560x1440@1.25': Object.freeze({ width: 2560, height: 1440, devicePixelRatio: 1.25, touch: false }),
  '2560x1600@2': Object.freeze({ width: 2560, height: 1600, devicePixelRatio: 2, touch: false }),
  '2880x1800@2': Object.freeze({ width: 2880, height: 1800, devicePixelRatio: 2, touch: false }),
  '3840x2160@1': Object.freeze({ width: 3840, height: 2160, devicePixelRatio: 1, touch: false }),
  '3840x2160@1.5': Object.freeze({ width: 3840, height: 2160, devicePixelRatio: 1.5, touch: false }),
})

function cssMediaMode(): 'real' | 'random' | 'static' {
  return latestSettings?.fingerprint?.cssMediaQuery?.mode ?? 'real'
}

function cssMediaPreset() : string {
  return latestSettings?.fingerprint?.cssMediaQuery?.preset ?? '1920x1080@1'
}

function cssTouchPointsFor(ua: ReadonlyUserAgentState): number {
  const mode = cssMediaMode()

  if (mode === 'real') {
    const hostMetadataMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    return Math.max((navigator as HostNavigator).maxTouchPoints || 0, hostMetadataMobile ? 1 : 0)
  }

  if (mode === 'static') {
    const preset = cssMediaStaticPresets[cssMediaPreset()] || cssMediaStaticPresets['1920x1080@1']
    return preset.touch ? Math.max(1, ua.fingerprint?.maxTouchPoints || 1) : 0
  }

  return Math.max(0, ua.fingerprint?.maxTouchPoints || 0)
}

function screenMetricsOverrideFor(ua: ReadonlyUserAgentState): Record<string, unknown> | undefined {
  const mode = cssMediaMode()

  if (mode === 'real') {
    return undefined
  }

  if (mode === 'static') {
    const preset = cssMediaStaticPresets[cssMediaPreset()] || cssMediaStaticPresets['1920x1080@1']
    const portrait = preset.height >= preset.width
    const innerWidth = preset.width
    const innerHeight = preset.touch ? preset.height : Math.max(1, preset.height - 133)
    return {
      width: innerWidth,
      height: innerHeight,
      deviceScaleFactor: preset.devicePixelRatio,
      mobile: preset.touch,
      scale: 1,
      screenWidth: preset.width,
      screenHeight: preset.height,
      positionX: 0,
      positionY: 0,
      screenOrientation: {
        type: portrait ? 'portraitPrimary' : 'landscapePrimary',
        angle: portrait ? 0 : 90,
      },
    }
  }

  const fp = ua.fingerprint
  if (!fp) {
    return undefined
  }

  const touch = fp.maxTouchPoints > 0
  const portrait = fp.screen.height >= fp.screen.width
  const verticalChrome = touch ? Math.max(0, fp.screen.height - fp.screen.availHeight) : 72
  const innerWidth = fp.screen.availWidth
  const innerHeight = Math.max(1, fp.screen.availHeight - (touch ? 0 : Math.max(0, verticalChrome - 32)))

  return {
    width: innerWidth,
    height: innerHeight,
    deviceScaleFactor: fp.screen.devicePixelRatio,
    mobile: touch,
    scale: 1,
    screenWidth: fp.screen.width,
    screenHeight: fp.screen.height,
    positionX: 0,
    positionY: 0,
    screenOrientation: {
      type: portrait ? 'portraitPrimary' : 'landscapePrimary',
      angle: portrait ? 0 : 90,
    },
  }
}

async function applyToDebuggee(target: DebuggeeSession, ua: ReadonlyUserAgentState): Promise<void> {
  // Build Accept-Language from the same source as navigator.languages (profile.languages)
  // so the network header and JS layer always match.
  const activeLocaleMode = localeMode()
  const acceptLanguage = activeLocaleMode === 'real'
    ? await hostAcceptLanguage()
    : acceptLanguageFromList(effectiveLanguagesFor(ua))

  const command: {
    userAgent: string
    acceptLanguage: string
    platform: string
    userAgentMetadata?: UserAgentMetadata
  } = {
    userAgent: ua.userAgent,
    acceptLanguage,
    platform: navigatorPlatformFor(ua.os),
  }

  const chMode: string = latestSettings?.fingerprint?.clientHints ?? 'random'
  const browserSupportsCH = supportsUAClientHints(ua)

  if (chMode === 'random' && browserSupportsCH) {
    command.userAgentMetadata = userAgentMetadataFor(ua)
  } else if (chMode === 'real' && browserSupportsCH) {
    const hostMetadata = await hostUserAgentMetadata()
    if (hostMetadata) {
      command.userAgentMetadata = hostMetadata
    }
  }

  await chrome.debugger.sendCommand(target, 'Emulation.setUserAgentOverride', command)

  const locale = activeLocaleMode === 'real' ? await hostPrimaryLocale() : effectiveLocaleFor(ua) || ''
  await chrome.debugger.sendCommand(target, 'Emulation.setLocaleOverride', { locale }).catch(() => undefined)

  const timezoneId = debuggerTimezoneOverrideFor(timezoneMode(), effectiveTimeZoneFor(ua))
  await chrome.debugger.sendCommand(target, 'Emulation.setTimezoneOverride', { timezoneId }).catch(() => undefined)

  const screenMetrics = screenMetricsOverrideFor(ua)
  if (screenMetrics) {
    await chrome.debugger.sendCommand(target, 'Emulation.setDeviceMetricsOverride', screenMetrics)
  } else {
    await chrome.debugger.sendCommand(target, 'Emulation.clearDeviceMetricsOverride')
  }

  const maxTouchPoints = cssTouchPointsFor(ua)
  const touchEnabled = maxTouchPoints > 0

  await chrome.debugger.sendCommand(target, 'Emulation.setTouchEmulationEnabled', {
    enabled: touchEnabled,
    maxTouchPoints,
  }).catch(() => undefined)
  await chrome.debugger.sendCommand(target, 'Emulation.setEmitTouchEventsForMouse', {
    enabled: touchEnabled,
    configuration: touchEnabled ? 'mobile' : 'desktop',
  }).catch(() => undefined)
}

async function applyToTabDebuggees(tabId: number, ua: ReadonlyUserAgentState): Promise<void> {
  const results = await Promise.allSettled(debuggeesForTab(tabId).map((target) => applyToDebuggee(target, ua)))

  const primaryResult = results[0]

  if (primaryResult?.status === 'rejected') {
    throw primaryResult.reason
  }
}

async function detachTab(tabId: number): Promise<void> {
  attachingTabs.delete(tabId)
  clearChildSessions(tabId)

  if (!attachedTabs.has(tabId)) {
    return
  }

  try {
    await chrome.debugger.detach({ tabId })
  } catch {
    // ignore
  }

  attachedTabs.delete(tabId)
}

async function attachAndApply(tabId: number, ua: ReadonlyUserAgentState): Promise<void> {
  if (attachedTabs.has(tabId)) {
    await applyToTabDebuggees(tabId, ua)
    return
  }

  if (attachingTabs.has(tabId)) {
    return
  }

  attachingTabs.add(tabId)

  try {
    await chrome.debugger.attach({ tabId }, protocolVersion)
    attachedTabs.add(tabId)

    await chrome.debugger.sendCommand({ tabId }, 'Target.setAutoAttach', {
      autoAttach: true,
      waitForDebuggerOnStart: true,
      flatten: true,
      filter: autoAttachFilter,
    })

    await applyToTabDebuggees(tabId, ua)
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

    if (!message.includes('already attached')) {
      attachedTabs.delete(tabId)
      clearChildSessions(tabId)
    }
  } finally {
    attachingTabs.delete(tabId)
  }
}

async function reconcileTab(tabId: number, url?: string): Promise<void> {
  if (!supportsDebugger()) {
    return
  }

  const [settings, ua] = await ensureState()

  if (!settings || !ua || !settings.enabled || !settings.jsProtection.enabled) {
    await detachTab(tabId)
    return
  }

  const value = url || (await chrome.tabs.get(tabId).catch(() => undefined))?.url

  if (!value || !isHttpUrl(value)) {
    await detachTab(tabId)
    return
  }

  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    await detachTab(tabId)
    return
  }

  if (!isApplicableForDomain(settings, parsed.hostname)) {
    await detachTab(tabId)
    return
  }

  await attachAndApply(tabId, ua)
  await reconcileRootTargets()
}

async function reconcileAllTabs(): Promise<void> {
  if (!supportsDebugger()) {
    return
  }

  const tabs = await chrome.tabs.query({})

  await Promise.allSettled(tabs.map((tab) => (typeof tab.id === 'number' ? reconcileTab(tab.id, tab.url) : undefined)))
  await reconcileRootTargets()
}

export async function refreshDebuggerUserAgentForTab(tabId: number): Promise<void> {
  if (!supportsDebugger()) {
    return
  }

  const [settings, ua] = await ensureState()

  const tab = await chrome.tabs.get(tabId).catch(() => undefined)

  if (!settings || !ua || !settings.enabled || !settings.jsProtection.enabled) {
    if (!tab?.url || !isHttpUrl(tab.url)) {
      await detachTab(tabId)
      return
    }

    try {
      const parsed = new URL(tab.url)
      await attachAndApplyHost(tabId)
      await resetRootTargetsForOrigin(parsed.origin)
      await detachTab(tabId)
      await detachRootTargetsForOrigin(parsed.origin)
    } catch {
      await detachTab(tabId)
    }

    return
  }


  if (!tab?.url || !isHttpUrl(tab.url)) {
    await detachTab(tabId)
    return
  }

  let parsed: URL

  try {
    parsed = new URL(tab.url)
  } catch {
    await detachTab(tabId)
    return
  }

  if (!isApplicableForDomain(settings, parsed.hostname)) {
    await detachTab(tabId)
    return
  }

  await detachTab(tabId)
  await detachRootTargetsForOrigin(parsed.origin)
  await attachAndApply(tabId, ua)
  await syncRootTargetsForOrigin(parsed.origin, ua)
}

if (supportsDebugger()) {
  chrome.debugger.onEvent.addListener(async (source, method, params) => {
    if (typeof source.tabId !== 'number') {
      return
    }

    if (method === 'Target.detachedFromTarget') {
      const detachedParams = params as { sessionId?: string } | undefined

      if (detachedParams?.sessionId) {
        removeChildSession(source.tabId, detachedParams.sessionId)
      }

      return
    }

    if (method !== 'Target.attachedToTarget') {
      return
    }

    const attachedParams = params as { sessionId: string; waitingForDebugger?: boolean } | undefined

    if (!attachedParams?.sessionId) {
      return
    }

    addChildSession(source.tabId, attachedParams.sessionId)

    const ua = latestUserAgent || (await initialUserAgentPromise)

    if (!ua) {
      return
    }

    const childTarget = { tabId: source.tabId, sessionId: attachedParams.sessionId }

    try {
      await chrome.debugger.sendCommand(childTarget, 'Target.setAutoAttach', {
        autoAttach: true,
        waitForDebuggerOnStart: true,
        flatten: true,
        filter: autoAttachFilter,
      })
    } catch {
      // ignore
    }

    try {
      await applyToDebuggee(childTarget, ua)
    } catch {
      // ignore
    }

    if (attachedParams.waitingForDebugger) {
      try {
        await chrome.debugger.sendCommand(childTarget, 'Runtime.runIfWaitingForDebugger')
      } catch {
        // ignore
      }
    }
  })

  chrome.debugger.onDetach.addListener((source) => {
    if (typeof source.tabId === 'number') {
      attachedTabs.delete(source.tabId)
      attachingTabs.delete(source.tabId)
      clearChildSessions(source.tabId)
    }

    if (typeof source.targetId === 'string') {
      attachedRootTargets.delete(source.targetId)
      rootTargetOriginById.delete(source.targetId)
    }
  })
}

chrome.webNavigation.onBeforeNavigate.addListener(async ({ frameId, tabId, url }) => {
  if (frameId !== 0) {
    return
  }

  await reconcileTab(tabId, url)
})

chrome.webNavigation.onCommitted.addListener(async ({ frameId, tabId, url }) => {
  if (frameId !== 0) {
    return
  }

  await reconcileTab(tabId, url)
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url && changeInfo.status !== 'loading') {
    return
  }

  await reconcileTab(tabId, changeInfo.url || tab.url)
})

chrome.tabs.onRemoved.addListener((tabId) => {
  attachedTabs.delete(tabId)
  attachingTabs.delete(tabId)
  clearChildSessions(tabId)

  void reconcileRootTargets()
})

export const updateDebuggerUserAgentState = (settings: MaybeSettings, userAgent: MaybeUserAgent): void => {
  latestSettings = settings ? mergeSettings(settings) : settings
  latestUserAgent = normalizeStoredUserAgentState(userAgent)

  void reconcileAllTabs()
}


export const __test__ = {
  debuggerTimezoneOverrideFor,
  mergeSettings,
}
