import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { send } from '~/shared/messaging'
import { browserRuntimeFamilyLabels, detectBrowser, privacySurfaceDescriptors, resolveBrowserRuntimeFamily } from '~/shared'
import type { CssMediaSpoofMode, LocaleSpoofMode, SurfaceSpoofMode, TimezoneSpoofMode } from '~/shared/types'
import { throwIfErr } from '../../shared'
import styles from './page.module.css'
import { useTitle, useSaveSettings } from '../../shared/hooks'
import { pageText, type SurfaceTextKey } from '../../shared/surface-text'
import { Switch } from '../../shared/components'

type SurfaceKey = keyof {
  hardwareConcurrency: unknown
  deviceMemory: unknown
  screen: unknown
  fonts: unknown
  webgl: unknown
  canvas: unknown
  audio: unknown
  domRect: unknown
  textMetrics: unknown
  mathFingerprint: unknown
  speechVoices: unknown
  webrtc: unknown
  battery: unknown
  clientHints: unknown
}

type SurfaceDescriptor = { key: SurfaceKey; titleKey: SurfaceTextKey; hintKey: SurfaceTextKey }

const SURFACES: SurfaceDescriptor[] = [
  { key: 'hardwareConcurrency', titleKey: 'fp_hardwareConcurrency_title', hintKey: 'fp_hardwareConcurrency_hint' },
  { key: 'deviceMemory', titleKey: 'fp_deviceMemory_title', hintKey: 'fp_deviceMemory_hint' },
  { key: 'screen', titleKey: 'fp_screen_title', hintKey: 'fp_screen_hint' },
  { key: 'fonts', titleKey: 'fp_fonts_title', hintKey: 'fp_fonts_hint' },
  { key: 'webgl', titleKey: 'fp_webgl_title', hintKey: 'fp_webgl_hint' },
  { key: 'canvas', titleKey: 'fp_canvas_title', hintKey: 'fp_canvas_hint' },
  { key: 'audio', titleKey: 'fp_audio_title', hintKey: 'fp_audio_hint' },
  { key: 'domRect', titleKey: 'fp_domRect_title', hintKey: 'fp_domRect_hint' },
  { key: 'textMetrics', titleKey: 'fp_textMetrics_title', hintKey: 'fp_textMetrics_hint' },
  { key: 'mathFingerprint', titleKey: 'fp_mathFingerprint_title', hintKey: 'fp_mathFingerprint_hint' },
  { key: 'speechVoices', titleKey: 'fp_speechVoices_title', hintKey: 'fp_speechVoices_hint' },
  { key: 'webrtc', titleKey: 'fp_webrtc_title', hintKey: 'fp_webrtc_hint' },
  { key: 'battery', titleKey: 'fp_battery_title', hintKey: 'fp_battery_hint' },
  { key: 'clientHints', titleKey: 'fp_clientHints_title', hintKey: 'fp_clientHints_hint' },
]

const STATIC_PRESETS = [
  '360x640@3',
  '375x667@2',
  '390x844@3',
  '412x915@2.625',
  '430x932@3',
  '768x1024@2',
  '820x1180@2',
  '1366x768@1',
  '1536x864@1.25',
  '1920x1080@1',
  '1920x1080@1.25',
  '2560x1440@1',
  '2560x1440@1.25',
  '2560x1600@2',
  '2880x1800@2',
  '3840x2160@1',
  '3840x2160@1.5',
] as const

const LOCALE_PRESETS = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pl-PL', 'nl-NL'] as const
const TIMEZONE_PRESETS = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Amsterdam',
  'Australia/Sydney',
] as const

const privacyTitleKey = (id: string): SurfaceTextKey => {
  switch (id) {
    case 'localFonts': return 'privacy_local_fonts_title'
    case 'mediaDevices': return 'privacy_media_devices_title'
    case 'webGpu': return 'privacy_webgpu_title'
    case 'pdfViewer': return 'privacy_pdf_viewer_title'
    case 'sensitiveDeviceApis': return 'privacy_sensitive_apis_title'
    default: return 'privacy_controls_title'
  }
}

const riskLevelText = (value: 'medium' | 'high'): string => {
  switch (value) {
    case 'high':
      return pageText('risk_high')
    case 'medium':
    default:
      return pageText('risk_medium')
  }
}

const privacyHintKey = (id: string): SurfaceTextKey => {
  switch (id) {
    case 'localFonts': return 'privacy_local_fonts_hint'
    case 'mediaDevices': return 'privacy_media_devices_hint'
    case 'webGpu': return 'privacy_webgpu_hint'
    case 'pdfViewer': return 'privacy_pdf_viewer_hint'
    case 'sensitiveDeviceApis': return 'privacy_sensitive_apis_hint'
    default: return 'privacy_controls_intro'
  }
}

export default function FingerprintSettings(): React.JSX.Element {
  useTitle(pageText('fingerprint_title'))

  const saveSettings = useSaveSettings()
  const currentBrowserFamily = resolveBrowserRuntimeFamily(detectBrowser())
  const currentBrowserLabel = browserRuntimeFamilyLabels[currentBrowserFamily]

  const [modes, setModes] = useState<Record<SurfaceKey, SurfaceSpoofMode>>({
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
  })
  const [localeMode, setLocaleMode] = useState<LocaleSpoofMode>('random')
  const [localePreset, setLocalePreset] = useState<string>('en-US')
  const localeModeRef = React.useRef<LocaleSpoofMode>('random')
  const localePresetRef = React.useRef<string>('en-US')
  const [timezoneMode, setTimezoneMode] = useState<TimezoneSpoofMode>('random')
  const [timezonePreset, setTimezonePreset] = useState<string>('Europe/Warsaw')
  const timezoneModeRef = React.useRef<TimezoneSpoofMode>('random')
  const timezonePresetRef = React.useRef<string>('Europe/Warsaw')
  const [cssMediaMode, setCssMediaMode] = useState<CssMediaSpoofMode>('real')
  const [cssMediaPreset, setCssMediaPreset] = useState<string>('1920x1080@1')
  const cssMediaModeRef = React.useRef<CssMediaSpoofMode>('real')
  const cssMediaPresetRef = React.useRef<string>('1920x1080@1')
  const [blockLocalFonts, setBlockLocalFonts] = useState<boolean>(false)
  const [blockMediaDeviceEnumeration, setBlockMediaDeviceEnumeration] = useState<boolean>(false)
  const [blockWebGpu, setBlockWebGpu] = useState<boolean>(false)
  const [hidePdfViewer, setHidePdfViewer] = useState<boolean>(false)
  const [hideSensitiveDeviceApis, setHideSensitiveDeviceApis] = useState<boolean>(false)
  const [hasActiveProfile, setHasActiveProfile] = useState<boolean>(false)

  useEffect(() => {
    send({ settings: undefined, currentUserAgentState: undefined }).then(({ settings, currentUserAgentState }) => {
      if (settings instanceof Error) throw settings
      if (currentUserAgentState instanceof Error) throw currentUserAgentState

      const { cssMediaQuery, localeMode, localePreset, timezone, timezonePreset, ...flatModes } = settings.fingerprint as typeof settings.fingerprint & {
        cssMediaQuery?: { mode?: CssMediaSpoofMode; preset?: string }
        localeMode?: LocaleSpoofMode
        localePreset?: string
        timezone?: TimezoneSpoofMode
        timezonePreset?: string
      }

      setModes((prev) => ({ ...prev, ...(flatModes as Partial<Record<SurfaceKey, SurfaceSpoofMode>>) }))
      const nextLocaleMode = localeMode || 'random'
      const nextLocalePreset = localePreset || 'en-US'
      const nextTimezoneMode = timezone || 'random'
      const nextTimezonePreset = timezonePreset || 'Europe/Warsaw'
      const nextCssMediaMode = cssMediaQuery?.mode || 'real'
      const nextCssMediaPreset = cssMediaQuery?.preset || '1920x1080@1'

      localeModeRef.current = nextLocaleMode
      localePresetRef.current = nextLocalePreset
      timezoneModeRef.current = nextTimezoneMode
      timezonePresetRef.current = nextTimezonePreset
      cssMediaModeRef.current = nextCssMediaMode
      cssMediaPresetRef.current = nextCssMediaPreset

      setLocaleMode(nextLocaleMode)
      setLocalePreset(nextLocalePreset)
      setTimezoneMode(nextTimezoneMode)
      setTimezonePreset(nextTimezonePreset)
      setCssMediaMode(nextCssMediaMode)
      setCssMediaPreset(nextCssMediaPreset)
      setBlockLocalFonts(settings.privacy.blockLocalFonts)
      setBlockMediaDeviceEnumeration(settings.privacy.blockMediaDeviceEnumeration)
      setBlockWebGpu(settings.privacy.blockWebGpu)
      setHidePdfViewer(settings.privacy.hidePdfViewer)
      setHideSensitiveDeviceApis(settings.privacy.hideSensitiveDeviceApis)
      setHasActiveProfile(Boolean(currentUserAgentState?.fingerprint))
    })
  }, [])

  const handleModeChange = useCallback((key: SurfaceKey, value: SurfaceSpoofMode) => {
    setModes((prev) => {
      const next = { ...prev, [key]: value }
      saveSettings({ fingerprint: { [key]: value } }, 300).catch(throwIfErr)
      return next
    })
  }, [saveSettings])

  const saveLocale = useCallback((nextMode: LocaleSpoofMode, nextPreset: string) => {
    saveSettings({ fingerprint: { localeMode: nextMode, localePreset: nextPreset } }, 300).catch(throwIfErr)
  }, [saveSettings])

  const saveTimezone = useCallback((nextMode: TimezoneSpoofMode, nextPreset: string) => {
    saveSettings({ fingerprint: { timezone: nextMode, timezonePreset: nextPreset } }, 300).catch(throwIfErr)
  }, [saveSettings])

  const saveCssMediaQuery = useCallback((nextMode: CssMediaSpoofMode, nextPreset: string) => {
    saveSettings({ fingerprint: { cssMediaQuery: { mode: nextMode, preset: nextPreset } } }, 300).catch(throwIfErr)
  }, [saveSettings])

  const privacySurfaceState = {
    blockLocalFonts: [blockLocalFonts, setBlockLocalFonts],
    blockMediaDeviceEnumeration: [blockMediaDeviceEnumeration, setBlockMediaDeviceEnumeration],
    blockWebGpu: [blockWebGpu, setBlockWebGpu],
    hidePdfViewer: [hidePdfViewer, setHidePdfViewer],
    hideSensitiveDeviceApis: [hideSensitiveDeviceApis, setHideSensitiveDeviceApis],
  } as const

  const surfaceCards = useMemo(() => SURFACES.map((surface) => (
    <SurfaceCard
      key={surface.key}
      title={pageText(surface.titleKey)}
      hint={pageText(surface.hintKey)}
      value={modes[surface.key]}
      onChange={(value) => handleModeChange(surface.key, value)}
    />
  )), [handleModeChange, modes])

  return (
    <>
      <h1>{pageText('fingerprint_title')}</h1>
      <p>{pageText('fingerprint_intro')}</p>

      <div style={stackStyle}>
        {surfaceCards.slice(0, 3)}
        <LocaleCard
          mode={localeMode}
          preset={localePreset}
          onModeChange={(nextMode) => {
            localeModeRef.current = nextMode
            setLocaleMode(nextMode)
            saveLocale(nextMode, localePresetRef.current)
          }}
          onPresetChange={(nextPreset) => {
            localePresetRef.current = nextPreset
            setLocalePreset(nextPreset)
            saveLocale(localeModeRef.current, nextPreset)
          }}
        />
        <TimezoneCard
          mode={timezoneMode}
          preset={timezonePreset}
          onModeChange={(nextMode) => {
            timezoneModeRef.current = nextMode
            setTimezoneMode(nextMode)
            saveTimezone(nextMode, timezonePresetRef.current)
          }}
          onPresetChange={(nextPreset) => {
            timezonePresetRef.current = nextPreset
            setTimezonePreset(nextPreset)
            saveTimezone(timezoneModeRef.current, nextPreset)
          }}
        />
        <CssMediaCard
          mode={cssMediaMode}
          preset={cssMediaPreset}
          onModeChange={(nextMode) => {
            cssMediaModeRef.current = nextMode
            setCssMediaMode(nextMode)
            saveCssMediaQuery(nextMode, cssMediaPresetRef.current)
          }}
          onPresetChange={(nextPreset) => {
            cssMediaPresetRef.current = nextPreset
            setCssMediaPreset(nextPreset)
            saveCssMediaQuery(cssMediaModeRef.current, nextPreset)
          }}
        />
        {surfaceCards.slice(3)}

        <SectionCard
          title={pageText('privacy_controls_title')}
          intro={pageText('privacy_controls_intro')}
          badges={[
            `${pageText('current_browser_runtime_family')}: ${currentBrowserLabel}`,
            `${pageText('active_profile_available')}: ${hasActiveProfile ? pageText('yes') : pageText('no')}`,
          ]}
        />

        {privacySurfaceDescriptors.map((surface) => {
          const [checked, setChecked] = privacySurfaceState[surface.settingKey]

          return (
            <PrivacySurfaceCard
              key={surface.id}
              title={pageText(privacyTitleKey(surface.id))}
              hint={pageText(privacyHintKey(surface.id))}
              checked={checked}
              onChange={async (value) => {
                setChecked(value)
                await saveSettings({ privacy: { [surface.settingKey]: value } }, 350)
              }}
              metadata={[
                `${pageText('risk')}: ${riskLevelText(surface.riskLevel)}`,
                `${pageText('permission')}: ${surface.requiresPermission ? pageText('yes') : pageText('no')}`,
                `${pageText('secure_context')}: ${surface.secureContextOnly ? pageText('yes') : pageText('no')}`,
              ]}
            />
          )
        })}
      </div>
    </>
  )
}

function SurfaceCard({
  title,
  hint,
  value,
  onChange,
}: {
  title: string
  hint: string
  value: SurfaceSpoofMode
  onChange: (value: SurfaceSpoofMode) => void
}): React.JSX.Element {
  const modeLabels: Record<SurfaceSpoofMode, string> = {
    random: pageText('mode_random'),
    real: pageText('mode_real'),
    off: pageText('mode_off'),
  }

  return (
    <div style={cardStyle}>
      <div>
        <div style={titleStyle}>{title}</div>
        <div style={hintStyle}>{hint}</div>
        <div style={metaStyle}>
          {pageText('current')}: <strong>{modeLabels[value]}</strong>
        </div>
      </div>
      <div style={controlColumnStyle}>
        <select value={value} onChange={(e) => onChange(e.target.value as SurfaceSpoofMode)} className={styles.select}>
          <option value="random">{modeLabels.random}</option>
          <option value="real">{modeLabels.real}</option>
          <option value="off">{modeLabels.off}</option>
        </select>
      </div>
    </div>
  )
}

function LocaleCard({
  mode,
  preset,
  onModeChange,
  onPresetChange,
}: {
  mode: LocaleSpoofMode
  preset: string
  onModeChange: (value: LocaleSpoofMode) => void
  onPresetChange: (value: string) => void
}): React.JSX.Element {
  const localeModeLabels: Record<LocaleSpoofMode, string> = {
    random: pageText('mode_random'),
    real: pageText('mode_real'),
    static: pageText('mode_static'),
  }
  const currentValue = mode === 'static' ? `${localeModeLabels.static} - ${preset}` : localeModeLabels[mode]

  return (
    <div style={cardStyle}>
      <div>
        <div style={titleStyle}>{pageText('runtime_surface_intl')}</div>
        <div style={hintStyle}>{`${localeModeLabels.random} / ${localeModeLabels.real} / ${localeModeLabels.static}`}</div>
        <div style={metaStyle}>
          {pageText('current')}: <strong>{currentValue}</strong>
        </div>
      </div>
      <div style={controlColumnStyle}>
        <select value={mode} onChange={(e) => onModeChange(e.target.value as LocaleSpoofMode)} className={styles.select}>
          <option value="random">{localeModeLabels.random}</option>
          <option value="real">{localeModeLabels.real}</option>
          <option value="static">{localeModeLabels.static}</option>
        </select>
        <label className={styles.subLabel}>{pageText('static_preset')}</label>
        <select value={preset} onChange={(e) => onPresetChange(e.target.value)} className={styles.select} disabled={mode !== 'static'}>
          {LOCALE_PRESETS.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function TimezoneCard({
  mode,
  preset,
  onModeChange,
  onPresetChange,
}: {
  mode: TimezoneSpoofMode
  preset: string
  onModeChange: (value: TimezoneSpoofMode) => void
  onPresetChange: (value: string) => void
}): React.JSX.Element {
  const timezoneModeLabels: Record<TimezoneSpoofMode, string> = {
    random: pageText('mode_random'),
    real: pageText('mode_real'),
    off: pageText('mode_off'),
    static: pageText('mode_static'),
  }
  const currentValue = mode === 'static' ? `${timezoneModeLabels.static} - ${preset}` : timezoneModeLabels[mode]

  return (
    <div style={cardStyle}>
      <div>
        <div style={titleStyle}>{pageText('fp_timezone_title')}</div>
        <div style={hintStyle}>{`${timezoneModeLabels.random} / ${timezoneModeLabels.real} / ${timezoneModeLabels.off} / ${timezoneModeLabels.static}`}</div>
        <div style={metaStyle}>
          {pageText('current')}: <strong>{currentValue}</strong>
        </div>
      </div>
      <div style={controlColumnStyle}>
        <select value={mode} onChange={(e) => onModeChange(e.target.value as TimezoneSpoofMode)} className={styles.select}>
          <option value="random">{timezoneModeLabels.random}</option>
          <option value="real">{timezoneModeLabels.real}</option>
          <option value="off">{timezoneModeLabels.off}</option>
          <option value="static">{timezoneModeLabels.static}</option>
        </select>
        <label className={styles.subLabel}>{pageText('static_preset')}</label>
        <select value={preset} onChange={(e) => onPresetChange(e.target.value)} className={styles.select} disabled={mode !== 'static'}>
          {TIMEZONE_PRESETS.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function CssMediaCard({
  mode,
  preset,
  onModeChange,
  onPresetChange,
}: {
  mode: CssMediaSpoofMode
  preset: string
  onModeChange: (value: CssMediaSpoofMode) => void
  onPresetChange: (value: string) => void
}): React.JSX.Element {
  const cssModeLabels: Record<CssMediaSpoofMode, string> = {
    real: pageText('mode_real'),
    random: pageText('mode_from_screen'),
    static: pageText('mode_static'),
  }
  const currentValue = mode === 'static' ? `${cssModeLabels.static} - ${preset}` : cssModeLabels[mode]

  return (
    <div style={cardStyle}>
      <div>
        <div style={titleStyle}>{pageText('fingerprint_css_media_title')}</div>
        <div style={hintStyle}>{pageText('fingerprint_css_media_hint')}</div>
        <div style={metaStyle}>
          {pageText('current')}: <strong>{currentValue}</strong>
        </div>
      </div>
      <div style={controlColumnStyle}>
        <select value={mode} onChange={(e) => onModeChange(e.target.value as CssMediaSpoofMode)} className={styles.select}>
          <option value="real">{cssModeLabels.real}</option>
          <option value="random">{cssModeLabels.random}</option>
          <option value="static">{cssModeLabels.static}</option>
        </select>
        <label className={styles.subLabel}>{pageText('static_preset')}</label>
        <select value={preset} onChange={(e) => onPresetChange(e.target.value)} className={styles.select} disabled={mode !== 'static'}>
          {STATIC_PRESETS.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
        <div style={hintStyle}>{pageText('fingerprint_css_media_static_hint')}</div>
      </div>
    </div>
  )
}

function SectionCard({ title, intro, badges = [] }: { title: string; intro: string; badges?: string[] }): React.JSX.Element {
  return (
    <div style={sectionCardStyle}>
      <div style={titleStyle}>{title}</div>
      <div style={hintStyle}>{intro}</div>
      {badges.length > 0 && <div style={badgeRowStyle}>{badges.map((badge) => <Badge key={badge} text={badge} />)}</div>}
    </div>
  )
}

function PrivacySurfaceCard({
  title,
  hint,
  checked,
  onChange,
  metadata,
}: {
  title: string
  hint: string
  checked: boolean | undefined
  onChange: (value: boolean) => void | Promise<void>
  metadata: string[]
}): React.JSX.Element {
  return (
    <div style={cardStyle}>
      <div>
        <div style={titleStyle}>{title}</div>
        <div style={hintStyle}>{hint}</div>
        <div style={badgeRowStyle}>{metadata.map((item) => <Badge key={item} text={item} />)}</div>
      </div>
      <div style={switchColumnStyle}>
        <Switch checked={checked} onChange={onChange} />
      </div>
    </div>
  )
}

function Badge({ text, strong = false }: { text: string; strong?: boolean }): React.JSX.Element {
  return <span style={{ ...badgeStyle, fontWeight: strong ? 700 : 500 }}>{text}</span>
}

const stackStyle: React.CSSProperties = {
  display: 'grid',
  gap: '14px',
}

const sectionCardStyle: React.CSSProperties = {
  border: '1px solid var(--color-ui-border-light)',
  borderRadius: '12px',
  padding: '16px 18px',
  background: 'rgba(255, 255, 255, 0.02)',
}

const cardStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 260px',
  gap: '18px',
  border: '1px solid var(--color-ui-border-light)',
  borderRadius: '12px',
  padding: '16px 18px',
  background: 'rgba(255, 255, 255, 0.02)',
}

const titleStyle: React.CSSProperties = {
  fontWeight: 700,
  marginBottom: '8px',
}

const hintStyle: React.CSSProperties = {
  opacity: 0.78,
  fontSize: '0.9em',
  lineHeight: 1.5,
}

const metaStyle: React.CSSProperties = {
  marginTop: '12px',
  fontSize: '0.9em',
}

const controlColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  justifyContent: 'center',
}

const switchColumnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
}

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '12px',
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '28px',
  padding: '4px 10px',
  borderRadius: '999px',
  border: '1px solid var(--color-ui-border-light)',
  background: 'rgba(255, 255, 255, 0.04)',
  fontSize: '0.82em',
}
