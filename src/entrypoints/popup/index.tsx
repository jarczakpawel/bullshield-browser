import React, { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import {
  type BrowserType,
  type OSType,
  ensureActivationReady,
  generatorTypesToSets,
  getUiLanguagePreference,
  isActivationReady,
  resolveUiLocale,
  setUiLocaleOverride,
  setsToGeneratorTypes,
  watchUiLanguagePreference,
} from '~/shared'
import { send } from '~/shared/messaging'
import type { ReadonlySettingsState, ReadonlyUserAgentHistoryEntry, ReadonlyUserAgentState } from '~/shared/types'
import { Header, ActiveUserAgent, EnabledOnDomain, QuickSelect, type QuickSelectProps, Actions } from './components'
import { i18n } from '~/i18n'
import { popupText } from './shared/text'
import { pageText } from '../options/shared/surface-text'
import '~/theme/theme.css'
import './index.css'
import styles from './layout.module.css'

type Pane = 'overview' | 'history'

type DetailSnapshot = ReadonlyUserAgentState | ReadonlyUserAgentHistoryEntry['snapshot']

type DetailSection = {
  title: string
  rows: Array<[string, string]>
}

type DetailContext = {
  title: string
  profileString?: string
  sections: DetailSection[]
  emptyText: string
}

const formatAddedAt = (value: string): string => {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

const toSample = (values: ReadonlyArray<string>, max: number = 6): string => {
  if (!values.length) {
    return popupText('not_available')
  }

  const sample = values.slice(0, max)
  return values.length > max ? `${sample.join(', ')} +${values.length - max}` : sample.join(', ')
}

const boolText = (value: boolean): string => popupText(value ? 'bool_yes' : 'bool_no')

const permissionStateText = (value: 'granted' | 'denied' | 'prompt'): string => {
  switch (value) {
    case 'granted':
      return popupText('permission_state_allowed')
    case 'denied':
      return popupText('permission_state_blocked')
    default:
      return popupText('permission_state_ask')
  }
}

const objectSample = (value: Record<string, number>, max: number = 6): string => {
  const entries = Object.entries(value)
  if (!entries.length) {
    return popupText('not_available')
  }

  const sample = entries.slice(0, max).map(([key, raw]) => `${key}=${raw}`)
  return entries.length > max ? `${sample.join(', ')} +${entries.length - max}` : sample.join(', ')
}

const webglPrecisionSample = (value: Record<string, { rangeMin: number; rangeMax: number; precision: number }>): string => {
  const entries = Object.entries(value)
  if (!entries.length) {
    return popupText('not_available')
  }

  const sample = entries.slice(0, 4).map(([key, item]) => `${key}=${(item as { precision: number }).precision}`)
  return entries.length > 4 ? `${sample.join(', ')} +${entries.length - 4}` : sample.join(', ')
}

const optionalValue = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null || value === '') {
    return popupText('not_available')
  }

  return String(value)
}


const localeChain = (primary: string): string[] => {
  const normalized = String(primary || '').trim()
  if (!normalized) {
    return ['en-US', 'en']
  }

  const base = normalized.split('-')[0]
  return normalized === base ? [normalized] : [...new Set([normalized, base])]
}

const hostLanguages = (): string[] => {
  const values = Array.isArray(navigator.languages)
    ? navigator.languages.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : typeof navigator.language === 'string' && navigator.language.trim().length > 0
      ? [navigator.language]
      : []

  return values.length > 0 ? values : ['en-US', 'en']
}

const hostLanguage = (): string => hostLanguages()[0] || 'en-US'

const hostIntlOptions = (): Intl.ResolvedDateTimeFormatOptions | undefined => {
  try {
    return new Intl.DateTimeFormat().resolvedOptions()
  } catch {
    return undefined
  }
}

const hostLocale = (): string => hostLanguage() || hostIntlOptions()?.locale || 'en-US'
const hostTimeZone = (): string => hostIntlOptions()?.timeZone || popupText('not_available')

const hostScreenSummary = (): string => `${window.screen.width}x${window.screen.height} @ ${window.devicePixelRatio || window.screen.width / Math.max(window.innerWidth || 1, 1) || 1}`
const hostAvailScreenSummary = (): string => `${window.screen.availWidth}x${window.screen.availHeight}`
const hostDpr = (): string => String(window.devicePixelRatio || 1)
const hostColorDepth = (): string => String(window.screen.colorDepth)
const hostPixelDepth = (): string => String(window.screen.pixelDepth)

const hostWebglInfo = (): { vendor: string; renderer: string } => {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl || typeof WebGLRenderingContext === 'undefined') {
      return { vendor: popupText('not_available'), renderer: popupText('not_available') }
    }
    const webgl = gl as WebGLRenderingContext
    const ext = webgl.getExtension('WEBGL_debug_renderer_info')
    const vendor = ext ? webgl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : webgl.getParameter(webgl.VENDOR)
    const renderer = ext ? webgl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : webgl.getParameter(webgl.RENDERER)
    return {
      vendor: typeof vendor === 'string' && vendor ? vendor : popupText('not_available'),
      renderer: typeof renderer === 'string' && renderer ? renderer : popupText('not_available'),
    }
  } catch {
    return { vendor: popupText('not_available'), renderer: popupText('not_available') }
  }
}

const hostWebgl = hostWebglInfo()

const modeOrValue = (mode: 'random' | 'real' | 'off' | 'static', randomValue: string, realValue?: string, staticValue?: string): string => {
  if (mode === 'real') {
    return realValue || pageText('mode_real')
  }
  if (mode === 'static') {
    return staticValue || pageText('mode_static')
  }
  if (mode === 'off') {
    return pageText('mode_off')
  }
  return randomValue
}

const detailSections = (snapshot?: DetailSnapshot, settings?: ReadonlySettingsState, addedAt?: string): DetailSection[] => {

  if (!snapshot) {
    return []
  }

  const sections: DetailSection[] = []
  const coreRows: Array<[string, string]> = []

  if (addedAt) {
    coreRows.push([popupText('added'), formatAddedAt(addedAt)])
  }

  coreRows.push([popupText('browser'), snapshot.browser])
  coreRows.push([popupText('os'), snapshot.os])
  coreRows.push([popupText('version'), snapshot.version.browser.full])

  if (snapshot.version.underHood?.full) {
    coreRows.push([popupText('under_hood'), snapshot.version.underHood.full])
  }

  if (snapshot.device) {
    coreRows.push([popupText('device'), `${snapshot.device.manufacturer} ${snapshot.device.model}`.trim()])
    coreRows.push([popupText('device_type'), snapshot.device.type])
    coreRows.push([popupText('device_os'), snapshot.device.osVersion])
  }

  sections.push({ title: popupText('core'), rows: coreRows })

  if (snapshot.fingerprint) {
    const { fingerprint } = snapshot

    sections.push({
      title: popupText('navigator_identity'),
      rows: [
        [popupText('language'), modeOrValue(settings?.fingerprint.localeMode || 'random', fingerprint.language, hostLocale(), settings?.fingerprint.localeMode === 'static' ? settings.fingerprint.localePreset : undefined)],
        [popupText('languages'), modeOrValue(settings?.fingerprint.localeMode || 'random', fingerprint.languages.join(', '), hostLanguages().join(', '), settings?.fingerprint.localeMode === 'static' ? localeChain(settings.fingerprint.localePreset).join(', ') : undefined)],
        [popupText('platform'), fingerprint.platform],
        [popupText('vendor'), optionalValue(fingerprint.vendor)],
        [popupText('oscpu'), optionalValue(fingerprint.oscpu)],
        [popupText('cores'), modeOrValue(settings?.fingerprint.hardwareConcurrency || 'random', String(fingerprint.hardwareConcurrency), String(navigator.hardwareConcurrency || popupText('not_available')))],
        [popupText('memory'), modeOrValue(settings?.fingerprint.deviceMemory || 'random', fingerprint.deviceMemory ? `${fingerprint.deviceMemory} GB` : popupText('not_available'), typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number' ? `${(navigator as Navigator & { deviceMemory?: number }).deviceMemory} GB` : popupText('not_available'))],
        [popupText('touch_points'), String(fingerprint.maxTouchPoints)],
        [popupText('client_hints_arch'), fingerprint.architecture],
        [popupText('client_hints_bitness'), fingerprint.bitness],
        [popupText('client_hints_model'), optionalValue(fingerprint.model)],
        [popupText('platform_version'), optionalValue(fingerprint.platformVersion)],
        [popupText('mobile'), boolText(fingerprint.mobile)],
        [popupText('pdf_viewer'), boolText(fingerprint.pdfViewerEnabled)],
      ],
    })

    sections.push({
      title: popupText('display'),
      rows: [
        [popupText('screen'), modeOrValue(settings?.fingerprint.screen || 'random', `${fingerprint.screen.width}x${fingerprint.screen.height} @ ${fingerprint.screen.devicePixelRatio}`, hostScreenSummary())],
        [popupText('avail_screen'), modeOrValue(settings?.fingerprint.screen || 'random', `${fingerprint.screen.availWidth}x${fingerprint.screen.availHeight}`, hostAvailScreenSummary())],
        [popupText('dpr'), modeOrValue(settings?.fingerprint.screen || 'random', String(fingerprint.screen.devicePixelRatio), hostDpr())],
        [popupText('color_depth'), modeOrValue(settings?.fingerprint.screen || 'random', String(fingerprint.screen.colorDepth), hostColorDepth())],
        [popupText('pixel_depth'), modeOrValue(settings?.fingerprint.screen || 'random', String(fingerprint.screen.pixelDepth), hostPixelDepth())],
        [pageText('fingerprint_css_media_title'), modeOrValue(settings?.fingerprint.cssMediaQuery.mode || 'real', `${fingerprint.screen.width}x${fingerprint.screen.height} @ ${fingerprint.screen.devicePixelRatio}`, hostScreenSummary(), settings?.fingerprint.cssMediaQuery.mode === 'static' ? settings.fingerprint.cssMediaQuery.preset : undefined)],
      ],
    })

    sections.push({
      title: popupText('graphics'),
      rows: [
        [popupText('webgl_vendor'), modeOrValue(settings?.fingerprint.webgl || 'random', fingerprint.webgl.vendor, hostWebgl.vendor)],
        [popupText('webgl_renderer'), modeOrValue(settings?.fingerprint.webgl || 'random', fingerprint.webgl.renderer, hostWebgl.renderer)],
        [popupText('gpu_vendor'), fingerprint.gpu.vendor],
        [popupText('gpu_architecture'), fingerprint.gpu.architecture],
        [popupText('gpu_device'), fingerprint.gpu.device],
        [popupText('gpu_description'), fingerprint.gpu.description],
        [popupText('gpu_fallback'), boolText(fingerprint.gpu.isFallbackAdapter)],
        [popupText('gpu_features'), String(fingerprint.gpuCapability.features.length)],
        [popupText('gpu_features_sample'), toSample(fingerprint.gpuCapability.features)],
        [popupText('gpu_limits'), String(Object.keys(fingerprint.gpuCapability.limits).length)],
        [popupText('gpu_limits_sample'), objectSample(fingerprint.gpuCapability.limits)],
        [popupText('wgsl_features'), String(fingerprint.gpuCapability.wgslLanguageFeatures.length)],
        [popupText('wgsl_features_sample'), toSample(fingerprint.gpuCapability.wgslLanguageFeatures)],
        [popupText('preferred_canvas_format'), fingerprint.gpuCapability.preferredCanvasFormat],
        [popupText('webgl_precision'), String(Object.keys(fingerprint.webglShaderPrecision.table).length)],
        [popupText('webgl_precision_sample'), webglPrecisionSample(fingerprint.webglShaderPrecision.table)],
      ],
    })

    sections.push({
      title: popupText('media_permissions'),
      rows: [
        [popupText('media_devices'), String(fingerprint.mediaDevices.length)],
        [popupText('media_kinds'), toSample(fingerprint.mediaDevices.map((device) => device.kind), 8)],
        [popupText('media_labels_sample'), toSample(fingerprint.mediaDevices.map((device) => device.label).filter(Boolean), 4)],
        [popupText('fonts_count'), modeOrValue(settings?.fingerprint.fonts || 'random', String(fingerprint.fonts.families.length))],
        [popupText('fonts_sample'), modeOrValue(settings?.fingerprint.fonts || 'random', toSample(fingerprint.fonts.families))],
        [popupText('permission_camera'), permissionStateText(fingerprint.permissions.camera)],
        [popupText('permission_microphone'), permissionStateText(fingerprint.permissions.microphone)],
        [popupText('permission_speaker'), permissionStateText(fingerprint.permissions.speakerSelection)],
        [popupText('permission_local_fonts'), permissionStateText(fingerprint.permissions.localFonts)],
        [popupText('speech_voices'), modeOrValue(settings?.fingerprint.speechVoices || 'random', String(fingerprint.speechVoices.length))],
        [popupText('speech_voices_sample'), modeOrValue(settings?.fingerprint.speechVoices || 'random', toSample(fingerprint.speechVoices.map((voice) => `${voice.name} (${voice.lang})`), 4))],
      ],
    })

    sections.push({
      title: popupText('privacy_noise'),
      rows: [
        [popupText('timezone'), modeOrValue(settings?.fingerprint.timezone || 'random', fingerprint.timezoneZone, hostTimeZone(), settings?.fingerprint.timezone === 'static' ? settings.fingerprint.timezonePreset : undefined)],
        [popupText('webrtc_policy'), modeOrValue(settings?.fingerprint.webrtc || 'random', fingerprint.webrtcCandidatePolicy)],
        [popupText('canvas_noise'), modeOrValue(settings?.fingerprint.canvas || 'random', String(fingerprint.canvasNoise))],
        [popupText('audio_noise'), modeOrValue(settings?.fingerprint.audio || 'random', String(fingerprint.audioNoise))],
        [popupText('audio_seed'), modeOrValue(settings?.fingerprint.audio || 'random', String(fingerprint.audioSeed))],
        [popupText('domrect_noise'), modeOrValue(settings?.fingerprint.domRect || 'random', String(fingerprint.domRectNoise))],
        [popupText('text_metrics_noise'), modeOrValue(settings?.fingerprint.textMetrics || 'random', String(fingerprint.textMetricsNoise))],
        [popupText('math_noise'), modeOrValue(settings?.fingerprint.mathFingerprint || 'random', String(fingerprint.mathFingerprint.noise))],
        [popupText('battery_level'), modeOrValue(settings?.fingerprint.battery || 'random', `${Math.round(fingerprint.batteryLevel * 100)}%`)],
        [popupText('battery_charging'), modeOrValue(settings?.fingerprint.battery || 'random', boolText(fingerprint.batteryCharging))],
      ],
    })
  }

  return sections.filter((section) => section.rows.length)
}

const historySummary = (snapshot: DetailSnapshot): string => {
  const parts: string[] = [snapshot.browser, snapshot.os, snapshot.version.browser.full]

  if (snapshot.device) {
    parts.push(`${snapshot.device.manufacturer} ${snapshot.device.model}`.trim())
  }

  if (snapshot.fingerprint) {
    parts.push(`${snapshot.fingerprint.screen.width}x${snapshot.fingerprint.screen.height}`)
  }

  return parts.join(' - ')
}

const renderDetailSections = (sections: DetailSection[]): React.JSX.Element => (
  <div className={styles.detailSections}>
    {sections.map((section) => (
      <section key={section.title} className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>{section.title}</div>
        <div className={styles.metaGrid}>
          {section.rows.map(([label, value]) => (
            <React.Fragment key={`${section.title}-${label}`}>
              <div className={styles.metaLabel}>{label}</div>
              <div className={styles.metaValue}>{value}</div>
            </React.Fragment>
          ))}
        </div>
      </section>
    ))}
  </div>
)

const App = (): React.JSX.Element => {
  const [, setUiLanguageTick] = useState(0)

  useEffect(() => {
    return watchUiLanguagePreference((preference) => {
      setUiLocaleOverride(resolveUiLocale(preference))
      setUiLanguageTick((value) => value + 1)
    })
  }, [])

  const [pane, setPane] = useState<Pane>('overview')
  const [version, setVersion] = useState<string>()
  const [isEnabled, setIsEnabled] = useState(false)
  const [currentUserAgent, setCurrentUserAgent] = useState<string>()
  const [settingsState, setSettingsState] = useState<ReadonlySettingsState>()
  const [currentUserAgentState, setCurrentUserAgentState] = useState<ReadonlyUserAgentState>()
  const [currentTabDomain, setCurrentTabDomain] = useState<string>()
  const [currentTabId, setCurrentTabId] = useState<number>()
  const [quickSelectDefaults, setQuickSelectDefaults] = useState<QuickSelectProps['defaults']>()
  const [isEnabledOnCurrentDomain, setIsEnabledOnCurrentDomain] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<ReadonlyArray<ReadonlyUserAgentHistoryEntry>>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>()
  const reloadTimer = useRef<NodeJS.Timeout>(undefined)

  useEffect(() => {
    document.title = `${i18n('manifest_name', 'Bullshield')} - ${popupText(pane)}`
  }, [pane])

  const resolveOperationalEnabled = useCallback(async (enabled: boolean): Promise<boolean> => enabled && (await isActivationReady()), [])

  const selectedHistoryEntry = useMemo(
    () => historyEntries.find((entry) => entry.id === selectedHistoryId) || historyEntries[0],
    [historyEntries, selectedHistoryId]
  )

  const detailContext = useMemo<DetailContext>(() => {
    return currentUserAgentState
      ? {
          title: popupText('details'),
          profileString: currentUserAgentState.userAgent,
          sections: detailSections(currentUserAgentState, settingsState),
          emptyText: popupText('no_active_profile_short'),
        }
      : {
          title: popupText('details'),
          sections: [],
          emptyText: popupText('no_active_profile_short'),
        }
  }, [currentUserAgentState, settingsState])

  const selectedHistoryContext = useMemo<DetailContext | undefined>(() => {
    if (!selectedHistoryEntry) {
      return undefined
    }

    return {
      title: popupText('selected_entry'),
      profileString: selectedHistoryEntry.snapshot.userAgent,
      sections: detailSections(selectedHistoryEntry.snapshot, selectedHistoryEntry.settingsSnapshot, selectedHistoryEntry.addedAt),
      emptyText: popupText('select_saved_profile'),
    }
  }, [selectedHistoryEntry])

  const loadState = useCallback((): void => {
    Promise.all([
      send({
        version: undefined,
        settings: undefined,
        currentUserAgent: undefined,
        currentUserAgentState: undefined,
        historyList: undefined,
      }),
      isActivationReady(),
    ])
      .then(([payload, activationReady]): void => {
        const { version, settings, currentUserAgent, currentUserAgentState, historyList } = payload

        if (version instanceof Error) throw version
        if (settings instanceof Error) throw settings
        if (currentUserAgent instanceof Error) throw currentUserAgent
        if (currentUserAgentState instanceof Error) throw currentUserAgentState
        if (historyList instanceof Error) throw historyList

        setVersion(version)
        setIsEnabled(settings.enabled && activationReady)
        setCurrentUserAgent(currentUserAgent)
        setSettingsState(settings)
        setCurrentUserAgentState(currentUserAgentState)
        setHistoryEntries(historyList)
        setSelectedHistoryId((prev) => prev || historyList[0]?.id)

        const [browsers, os] = generatorTypesToSets(settings.generator.types)
        setQuickSelectDefaults({ browsers: [...browsers], os: [...os], syncOs: settings.generator.syncOsWithHost })
      })
      .catch((err) => {
        throw err
      })
  }, [])

  const reloadCurrentTab = useCallback(
    async (throttle: number): Promise<void> => {
      if (reloadTimer.current) {
        clearTimeout(reloadTimer.current)
      }

      reloadTimer.current = setTimeout(async () => {
        try {
          if (typeof currentTabId === 'number') {
            const { refreshActiveTab } = await send({ refreshActiveTab: [currentTabId] })
            if (refreshActiveTab instanceof Error) {
              throw refreshActiveTab
            }
          }
        } finally {
          if (reloadTimer.current) {
            clearTimeout(reloadTimer.current)
          }
          reloadTimer.current = undefined
        }
      }, throttle)
    },
    [currentTabId]
  )

  const handleEnable = useCallback(
    async (enabled: boolean): Promise<void> => {
      if (enabled && !(await ensureActivationReady())) {
        return
      }

      const { updateSettings } = await send({ updateSettings: [{ enabled }] })
      if (updateSettings instanceof Error) {
        throw updateSettings
      }

      setIsEnabled(await resolveOperationalEnabled(updateSettings.enabled))
      await reloadCurrentTab(500)
    },
    [reloadCurrentTab, resolveOperationalEnabled]
  )

  const handleRenewUserAgent = useCallback(async (): Promise<void> => {
    const { renewUserAgent } = await send({ renewUserAgent: undefined })
    if (renewUserAgent instanceof Error) {
      throw renewUserAgent
    }

    const { currentUserAgentState } = await send({ currentUserAgentState: undefined })
    if (currentUserAgentState instanceof Error) {
      throw currentUserAgentState
    }

    setCurrentUserAgent(renewUserAgent)
    setCurrentUserAgentState(currentUserAgentState)
    await reloadCurrentTab(3000)
  }, [reloadCurrentTab])

  const handleEnabledOnCurrentDomainChange = useCallback(
    async (enabled: boolean): Promise<void> => {
      if (!currentTabDomain) {
        return
      }

      const { settings } = await send({ settings: undefined })
      if (settings instanceof Error) {
        throw settings
      }

      let domains: Array<string>

      switch (settings.blacklist.mode) {
        case 'blacklist':
          domains = enabled
            ? settings.blacklist.domains.filter((d) => d !== currentTabDomain)
            : settings.blacklist.domains.concat(currentTabDomain)
          break
        case 'whitelist':
          domains = enabled
            ? settings.blacklist.domains.concat(currentTabDomain)
            : settings.blacklist.domains.filter((d) => d !== currentTabDomain)
          break
      }

      await send({ updateSettings: [{ blacklist: { domains } }] })
      setIsEnabledOnCurrentDomain(enabled)
      await reloadCurrentTab(500)
    },
    [currentTabDomain, reloadCurrentTab]
  )

  const handleQuickSelectChange = useCallback(
    async ({ browsers, os, syncOs }: { browsers: Array<BrowserType>; os: Array<OSType>; syncOs: boolean }) => {
      const { updateSettings } = await send({
        updateSettings: [
          {
            generator: {
              types: setsToGeneratorTypes(browsers, os.length ? os : 'any'),
              syncOsWithHost: syncOs,
            },
          },
        ],
      })

      if (updateSettings instanceof Error) {
        throw updateSettings
      }

      const { renewUserAgent } = await send({ renewUserAgent: undefined })
      if (renewUserAgent instanceof Error) {
        throw renewUserAgent
      }

      const { currentUserAgentState } = await send({ currentUserAgentState: undefined })
      if (currentUserAgentState instanceof Error) {
        throw currentUserAgentState
      }

      setCurrentUserAgent(renewUserAgent)
      setCurrentUserAgentState(currentUserAgentState)
      await reloadCurrentTab(3000)
    },
    [reloadCurrentTab]
  )

  const handleOpenOptions = useCallback(async (): Promise<void> => {
    await chrome.runtime.openOptionsPage()
    window.close()
  }, [])

  const handleAddToHistory = useCallback(async (): Promise<void> => {
    const { addCurrentToHistory } = await send({ addCurrentToHistory: undefined })
    if (addCurrentToHistory instanceof Error) {
      throw addCurrentToHistory
    }

    setHistoryEntries((prev) => [addCurrentToHistory, ...prev])
    setSelectedHistoryId(addCurrentToHistory.id)
    setPane('history')
  }, [])

  const handleApplyHistoryEntry = useCallback(async (): Promise<void> => {
    if (!selectedHistoryEntry) {
      return
    }

    const { applyHistoryEntry } = await send({ applyHistoryEntry: [selectedHistoryEntry.id] })
    if (applyHistoryEntry instanceof Error) {
      throw applyHistoryEntry
    }

    setCurrentUserAgent(applyHistoryEntry.userAgent)
    setCurrentUserAgentState(applyHistoryEntry)
    setPane('overview')
    await reloadCurrentTab(1200)
  }, [reloadCurrentTab, selectedHistoryEntry])

  const handleRemoveHistoryEntry = useCallback(async (id: string): Promise<void> => {
    if (!window.confirm(popupText('confirm_remove_entry'))) {
      return
    }

    const { removeHistoryEntry } = await send({ removeHistoryEntry: [id] })
    if (removeHistoryEntry instanceof Error) {
      throw removeHistoryEntry
    }

    setHistoryEntries(removeHistoryEntry)
    setSelectedHistoryId(removeHistoryEntry[0]?.id)
  }, [])

  const handleClearHistory = useCallback(async (): Promise<void> => {
    if (!window.confirm(popupText('confirm_clear_history'))) {
      return
    }

    const { clearHistory } = await send({ clearHistory: undefined })
    if (clearHistory instanceof Error) {
      throw clearHistory
    }

    setHistoryEntries([])
    setSelectedHistoryId(undefined)
  }, [])

  useEffect(() => {
    loadState()

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs): void => {
      if (tabs.length && tabs[0].url) {
        try {
          const domain = new URL(tabs[0].url).hostname
          setCurrentTabDomain(domain)
          setCurrentTabId(tabs[0].id)

          send({ isApplicableForDomain: [domain] }).then(({ isApplicableForDomain }): void => {
            if (isApplicableForDomain instanceof Error) {
              throw isApplicableForDomain
            }

            setIsEnabledOnCurrentDomain(isApplicableForDomain)
          })
        } catch {
          setCurrentTabDomain(undefined)
          setCurrentTabId(tabs[0].id)
          setIsEnabledOnCurrentDomain(false)
        }
      }
    })

    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener(loadState)
      return () => chrome.storage.onChanged.removeListener(loadState)
    }
  }, [loadState])

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandTitle}>Bullshield</div>
          <div className={styles.brandSub}>{popupText('brand_subtitle')}</div>
        </div>

        <div className={styles.nav}>
          <button
            className={`${styles.navButton} ${pane === 'overview' ? styles.active : ''}`}
            onClick={() => setPane('overview')}
          >
            {popupText('overview')}
          </button>
          <button
            className={`${styles.navButton} ${pane === 'history' ? styles.active : ''}`}
            onClick={() => setPane('history')}
          >
            {popupText('history')}
          </button>
        </div>

        <div className={styles.sidebarBottom}>
          <button className={styles.menuButton} onClick={handleOpenOptions}>
            {i18n('open_settings')}
          </button>
          <div className={styles.sidebarMeta}>v{version || '1.0.0'}</div>
        </div>
      </aside>

      {pane === 'overview' && (
        <aside className={styles.detailsRail}>
          <div className={styles.detailsRailInner}>
            <div className={styles.detailsRailTitle}>{detailContext.title}</div>
            {detailContext.sections.length ? (
              <div className={styles.detailsBody}>
                {detailContext.profileString ? (
                  <div>
                    <div className={styles.historyActionsTitle}>{popupText('profile_string')}</div>
                    <div className={styles.uaBlock}>{detailContext.profileString}</div>
                  </div>
                ) : null}
                {renderDetailSections(detailContext.sections)}
              </div>
            ) : (
              <div className={styles.emptyState}>{detailContext.emptyText}</div>
            )}
          </div>
        </aside>
      )}

      <main className={styles.content}>
        {pane === 'overview' ? (
          <div className={styles.panel}>
            <Header isExtensionEnabled={isEnabled} />
            <ActiveUserAgent userAgent={currentUserAgent} />
            <EnabledOnDomain isEnabled={isEnabledOnCurrentDomain} onChange={handleEnabledOnCurrentDomainChange} />
            <QuickSelect
              key={`${quickSelectDefaults?.browsers.join(',') || 'none'}|${quickSelectDefaults?.os.join(',') || 'none'}|${quickSelectDefaults?.syncOs ? '1' : '0'}`}
              defaults={quickSelectDefaults}
              onChange={handleQuickSelectChange}
            />
            <Actions
              isExtensionEnabled={isEnabled}
              onPauseResumeClick={handleEnable}
              onRefreshClick={handleRenewUserAgent}
              onAddToHistoryClick={handleAddToHistory}
            />
          </div>
        ) : (
          <div className={styles.panel}>
            <div className={styles.historyHeader}>
              <div className={styles.historyTitleLarge}>{popupText('history')}</div>
              <div className={styles.historyHeaderActions}>
                <button className={styles.primaryButton} onClick={handleApplyHistoryEntry} disabled={!selectedHistoryEntry}>
                  {popupText('use_selected_profile')}
                </button>
                <button className={styles.dangerButton} onClick={handleClearHistory} disabled={!historyEntries.length}>
                  {popupText('clear_history')}
                </button>
              </div>
            </div>
            <div className={styles.historyLayout}>
              <section className={styles.historyList}>
                <div className={styles.historyListInner}>
                  {historyEntries.length ? (
                    historyEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`${styles.historyItem} ${selectedHistoryEntry?.id === entry.id ? styles.active : ''}`}
                        onClick={() => setSelectedHistoryId(entry.id)}
                      >
                        <div className={styles.historyItemTop}>
                          <div className={styles.historyTitle}>{entry.snapshot.userAgent}</div>
                          <button
                            type="button"
                            className={styles.historyDeleteButton}
                            title={popupText('remove_selected_entry')}
                            aria-label={popupText('remove_selected_entry')}
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleRemoveHistoryEntry(entry.id)
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div className={styles.historySummary}>{historySummary(entry.snapshot)}</div>
                        <div className={styles.historyDate}>{formatAddedAt(entry.addedAt)}</div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>{popupText('history_empty')}</div>
                  )}
                </div>
              </section>

              <section className={styles.historyActionsCard}>
                {selectedHistoryContext ? (
                  <div className={styles.historyActionsBody}>
                    <div className={styles.historyActionsTop}>
                      <div className={styles.historyActionsTitle}>{selectedHistoryContext.title}</div>
                    </div>
                    {selectedHistoryContext.profileString ? <div className={styles.uaBlock}>{selectedHistoryContext.profileString}</div> : null}
                    {renderDetailSections(selectedHistoryContext.sections)}
                  </div>
                ) : (
                  <div className={styles.emptyState}>{popupText('select_saved_profile')}</div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

const mount = async (): Promise<void> => {
  const initialUiLanguage = await getUiLanguagePreference()
  setUiLocaleOverride(resolveUiLocale(initialUiLanguage))

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

void mount()
