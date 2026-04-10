import { locales, type LocaleCode } from '~/i18n'

const storageKey = 'ui-language-v1'
const supportedUiLocales = Object.keys(locales) as LocaleCode[]
const supportedUiLocaleSet = new Set<LocaleCode>(supportedUiLocales)

export type UiLanguagePreference = 'auto' | LocaleCode

let localeOverride: LocaleCode | undefined
let uiLanguagePreference: UiLanguagePreference = 'auto'
const uiLanguageListeners = new Set<(preference: UiLanguagePreference) => void>()

const readFrom = async (area: chrome.storage.StorageArea): Promise<UiLanguagePreference | undefined> => {
  try {
    const items = await area.get(storageKey)

    if (chrome.runtime.lastError) {
      return undefined
    }

    return normalizeUiLanguagePreference(items?.[storageKey])
  } catch {
    return undefined
  }
}

const getStorageArea = async (): Promise<chrome.storage.StorageArea | undefined> => {
  if (typeof chrome !== 'object' || !chrome.storage) {
    return undefined
  }

  const syncAvailable = await chrome.storage.sync.get(null).then(() => !chrome.runtime.lastError).catch(() => false)

  if (syncAvailable) {
    return chrome.storage.sync
  }

  const localAvailable = await chrome.storage.local.get(null).then(() => !chrome.runtime.lastError).catch(() => false)

  if (localAvailable) {
    return chrome.storage.local
  }

  return undefined
}

export const normalizeUiLocale = (value: string | undefined): LocaleCode => {
  const normalized = String(value || 'en').replace('-', '_').trim()

  if (supportedUiLocaleSet.has(normalized as LocaleCode)) {
    return normalized as LocaleCode
  }

  const lowered = normalized.toLowerCase()

  if (lowered == 'en_au') return 'en_AU'
  if (lowered == 'en_gb') return 'en_GB'
  if (lowered == 'en_us') return 'en_US'
  if (lowered == 'es_419') return 'es_419'
  if (lowered == 'pt_br') return 'pt_BR'
  if (lowered == 'pt_pt') return 'pt_PT'
  if (lowered == 'zh_cn') return 'zh_CN'
  if (lowered == 'zh_tw') return 'zh_TW'

  if (lowered.startsWith('ar')) return 'ar'
  if (lowered.startsWith('am')) return 'am'
  if (lowered.startsWith('bg')) return 'bg'
  if (lowered.startsWith('bn')) return 'bn'
  if (lowered.startsWith('ca')) return 'ca'
  if (lowered.startsWith('cs')) return 'cs'
  if (lowered.startsWith('da')) return 'da'
  if (lowered.startsWith('de')) return 'de'
  if (lowered.startsWith('el')) return 'el'
  if (lowered.startsWith('en')) return 'en'
  if (lowered.startsWith('es')) return 'es'
  if (lowered.startsWith('et')) return 'et'
  if (lowered.startsWith('fa')) return 'fa'
  if (lowered.startsWith('fi')) return 'fi'
  if (lowered.startsWith('fil')) return 'fil'
  if (lowered.startsWith('fr')) return 'fr'
  if (lowered.startsWith('gu')) return 'gu'
  if (lowered.startsWith('he')) return 'he'
  if (lowered.startsWith('hi')) return 'hi'
  if (lowered.startsWith('hr')) return 'hr'
  if (lowered.startsWith('hu')) return 'hu'
  if (lowered.startsWith('id')) return 'id'
  if (lowered.startsWith('it')) return 'it'
  if (lowered.startsWith('ja')) return 'ja'
  if (lowered.startsWith('kn')) return 'kn'
  if (lowered.startsWith('ko')) return 'ko'
  if (lowered.startsWith('lt')) return 'lt'
  if (lowered.startsWith('lv')) return 'lv'
  if (lowered.startsWith('ml')) return 'ml'
  if (lowered.startsWith('mr')) return 'mr'
  if (lowered.startsWith('ms')) return 'ms'
  if (lowered.startsWith('nl')) return 'nl'
  if (lowered.startsWith('no')) return 'no'
  if (lowered.startsWith('pl')) return 'pl'
  if (lowered.startsWith('pt')) return 'pt_BR'
  if (lowered.startsWith('ro')) return 'ro'
  if (lowered.startsWith('ru')) return 'ru'
  if (lowered.startsWith('sk')) return 'sk'
  if (lowered.startsWith('sl')) return 'sl'
  if (lowered.startsWith('sr')) return 'sr'
  if (lowered.startsWith('sv')) return 'sv'
  if (lowered.startsWith('sw')) return 'sw'
  if (lowered.startsWith('ta')) return 'ta'
  if (lowered.startsWith('te')) return 'te'
  if (lowered.startsWith('th')) return 'th'
  if (lowered.startsWith('tr')) return 'tr'
  if (lowered.startsWith('uk')) return 'uk'
  if (lowered.startsWith('vi')) return 'vi'
  if (lowered.startsWith('zh')) return 'zh_CN'

  return 'en'
}

export const normalizeUiLanguagePreference = (value: unknown): UiLanguagePreference => {
  if (value === 'auto') {
    return 'auto'
  }

  if (typeof value === 'string') {
    return normalizeUiLocale(value)
  }

  return 'auto'
}

export const getBrowserUiLocale = (): LocaleCode => {
  if (typeof chrome === 'object' && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
    return normalizeUiLocale(chrome.i18n.getUILanguage())
  }

  if (typeof navigator === 'object') {
    return normalizeUiLocale(navigator.language)
  }

  return 'en'
}

export const resolveUiLocale = (preference: UiLanguagePreference): LocaleCode => {
  return preference === 'auto' ? getBrowserUiLocale() : normalizeUiLocale(preference)
}

export const getUiLocaleOverride = (): LocaleCode | undefined => localeOverride

export const setUiLocaleOverride = (locale: LocaleCode | undefined): void => {
  localeOverride = locale
}

export const getCachedUiLanguagePreference = (): UiLanguagePreference => uiLanguagePreference

const updateUiLanguagePreference = (preference: UiLanguagePreference, notify: boolean): void => {
  const normalized = normalizeUiLanguagePreference(preference)

  if (uiLanguagePreference === normalized) {
    return
  }

  uiLanguagePreference = normalized

  if (!notify) {
    return
  }

  for (const listener of uiLanguageListeners) {
    listener(normalized)
  }
}

export const getUiLanguagePreference = async (): Promise<UiLanguagePreference> => {
  const storage = await getStorageArea()

  if (!storage) {
    updateUiLanguagePreference('auto', false)
    return 'auto'
  }

  const preferred = await readFrom(storage)

  if (preferred) {
    updateUiLanguagePreference(preferred, false)
    return preferred
  }

  if (storage !== chrome.storage.local) {
    const fallback = await readFrom(chrome.storage.local)

    if (fallback) {
      updateUiLanguagePreference(fallback, false)
      return fallback
    }
  }

  updateUiLanguagePreference('auto', false)
  return 'auto'
}

export const setUiLanguagePreference = async (preference: UiLanguagePreference): Promise<void> => {
  const normalized = normalizeUiLanguagePreference(preference)
  updateUiLanguagePreference(normalized, true)

  const storage = await getStorageArea()

  if (!storage) {
    return
  }

  await storage.set({ [storageKey]: normalized })
}

export const watchUiLanguagePreference = (callback: (preference: UiLanguagePreference) => void): (() => void) => {
  uiLanguageListeners.add(callback)

  if (typeof chrome !== 'object' || !chrome.storage?.onChanged) {
    return () => {
      uiLanguageListeners.delete(callback)
    }
  }

  const listener = (changes: Record<string, chrome.storage.StorageChange>): void => {
    if (!(storageKey in changes)) {
      return
    }

    const nextPreference = normalizeUiLanguagePreference(changes[storageKey].newValue)

    if (nextPreference === uiLanguagePreference) {
      return
    }

    updateUiLanguagePreference(nextPreference, true)
  }

  chrome.storage.onChanged.addListener(listener)

  return () => {
    uiLanguageListeners.delete(callback)
    chrome.storage.onChanged.removeListener(listener)
  }
}

export const getUiLocaleLabel = (locale: LocaleCode): string => {
  const tag = locale.replace('_', '-')
  const [languageCode, regionCode] = tag.split('-')

  try {
    const languageName = new Intl.DisplayNames([tag], { type: 'language' }).of(languageCode) || tag

    if (!regionCode) {
      return languageName
    }

    const regionName = new Intl.DisplayNames([tag], { type: 'region' }).of(regionCode.toUpperCase())
    return regionName ? `${languageName} (${regionName})` : languageName
  } catch {
    return tag
  }
}

export const getUiLocaleCodeLabel = (locale: LocaleCode): string => locale.replace('_', '-')

export { supportedUiLocales }
