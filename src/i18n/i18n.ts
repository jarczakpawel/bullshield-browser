import { getUiLocaleOverride } from '~/shared/ui-language'
import { locales } from './locales'
import { type Localization } from './types'

const cache: Record<string, string> = {}

export default function (key: keyof Localization, fallback?: string): string {
  const override = getUiLocaleOverride()

  if (override) {
    const overrideCacheKey = `${override}:${key}`

    if (cache[overrideCacheKey]) {
      return cache[overrideCacheKey]
    }

    const localized = locales[override]?.[key] || locales.en?.[key]

    if (localized) {
      cache[overrideCacheKey] = localized
      return localized
    }
  }

  const chromeCacheKey = `chrome:${key}`

  if (cache[chromeCacheKey]) {
    return cache[chromeCacheKey]
  }

  if (typeof chrome === 'object' && typeof chrome['i18n'] === 'object') {
    const localized = chrome.i18n.getMessage(key)

    if (localized.length > 0) {
      cache[chromeCacheKey] = localized
      return localized
    }
  }

  if (fallback) {
    return fallback
  }

  return key
}
