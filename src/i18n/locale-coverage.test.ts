import { describe, expect, test } from 'vitest'
import type { LocaleCode, Localization } from './types'
import { locales } from './locales'
import { popupTranslations, popupSupportedLocales } from '../entrypoints/popup/shared/text'
import { surfaceLocales, surfaceSupportedLocales } from '../entrypoints/options/shared/surface-text'

type PopupTextMap = Record<keyof typeof popupTranslations.en, string>
type SurfaceTextMap = Record<keyof typeof surfaceLocales.en, string>

describe('locale coverage', () => {
  test('chrome i18n locales cover every declared locale code', () => {
    const expected: readonly LocaleCode[] = [
      'ar', 'am', 'bg', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'en_AU', 'en_GB', 'en_US', 'es', 'es_419', 'et',
      'fa', 'fi', 'fil', 'fr', 'gu', 'he', 'hi', 'hr', 'hu', 'id', 'it', 'ja', 'kn', 'ko', 'lt', 'lv', 'ml', 'mr',
      'ms', 'nl', 'no', 'pl', 'pt_BR', 'pt_PT', 'ro', 'ru', 'sk', 'sl', 'sr', 'sv', 'sw', 'ta', 'te', 'th', 'tr',
      'uk', 'vi', 'zh_CN', 'zh_TW',
    ]

    const enLocale = locales.en as Localization<string>
    const enKeys = Object.keys(enLocale)

    expect(Object.keys(locales).sort()).toEqual([...expected].sort())

    for (const code of expected) {
      const locale = locales[code] as Localization<string>
      expect(locale).toBeDefined()
      expect(Object.keys(locale).sort()).toEqual([...enKeys].sort())
    }
  })

  test('popup locale packs stay key-complete against en', () => {
    const popupEn = popupTranslations.en as PopupTextMap
    const enKeys = Object.keys(popupEn)

    for (const code of popupSupportedLocales) {
      const popupLocale = popupTranslations[code] as PopupTextMap
      expect(Object.keys(popupLocale).sort()).toEqual([...enKeys].sort())
    }
  })

  test('surface locale packs stay key-complete against en', () => {
    const surfaceEn = surfaceLocales.en as SurfaceTextMap
    const enKeys = Object.keys(surfaceEn)

    for (const code of surfaceSupportedLocales) {
      const surfaceLocale = surfaceLocales[code] as SurfaceTextMap
      expect(Object.keys(surfaceLocale).sort()).toEqual([...enKeys].sort())
    }
  })

  test('runtime ui locales cover every declared locale code', () => {
    const required: readonly LocaleCode[] = [
      'ar', 'am', 'bg', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'en_AU', 'en_GB', 'en_US', 'es', 'es_419', 'et',
      'fa', 'fi', 'fil', 'fr', 'gu', 'he', 'hi', 'hr', 'hu', 'id', 'it', 'ja', 'kn', 'ko', 'lt', 'lv', 'ml', 'mr',
      'ms', 'nl', 'no', 'pl', 'pt_BR', 'pt_PT', 'ro', 'ru', 'sk', 'sl', 'sr', 'sv', 'sw', 'ta', 'te', 'th', 'tr',
      'uk', 'vi', 'zh_CN', 'zh_TW',
    ]

    for (const code of required) {
      expect(popupSupportedLocales).toContain(code)
      expect(surfaceSupportedLocales).toContain(code)
    }
  })

  test('major ui locales translate visible labels away from english', () => {
    const probePopupKeys: readonly (keyof typeof popupTranslations.en)[] = ['overview', 'history', 'details']
    const probeSurfaceKeys: readonly (keyof typeof surfaceLocales.en)[] = ['fingerprint_title', 'privacy_controls_title']
    const major: readonly LocaleCode[] = [
      'de', 'es', 'fr', 'it', 'pt_BR', 'ru', 'uk', 'tr', 'ja', 'ko', 'zh_CN', 'zh_TW', 'ar', 'am', 'bg', 'bn', 'ca',
      'cs', 'da', 'el', 'et', 'fa', 'fi', 'fil', 'gu', 'he', 'hi', 'hr', 'hu', 'id', 'kn', 'lt', 'lv', 'ml', 'mr',
      'ms', 'nl', 'no', 'ro', 'sk', 'sl', 'sr', 'sv', 'sw', 'ta', 'te', 'th', 'vi',
    ]

    const popupEn = popupTranslations.en as PopupTextMap
    const surfaceEn = surfaceLocales.en as SurfaceTextMap

    for (const code of major) {
      const popupLocale = popupTranslations[code] as PopupTextMap
      const surfaceLocale = surfaceLocales[code] as SurfaceTextMap

      expect(probePopupKeys.some((key) => popupLocale[key] !== popupEn[key])).toBe(true)
      expect(probeSurfaceKeys.some((key) => surfaceLocale[key] !== surfaceEn[key])).toBe(true)
    }
  })

  test('major core locales translate onboarding labels away from english', () => {
    const probeCoreKeys: readonly (keyof Localization<string>)[] = [
      'onboarding_first_run_title',
      'onboarding_permissions_title',
      'grant_permission_button',
    ]
    const major: readonly LocaleCode[] = [
      'de', 'es', 'fr', 'it', 'pt_BR', 'ru', 'uk', 'tr', 'ja', 'ko', 'zh_CN', 'zh_TW', 'ar', 'am', 'bg', 'bn', 'ca',
      'cs', 'da', 'el', 'et', 'fa', 'fi', 'fil', 'gu', 'he', 'hi', 'hr', 'hu', 'id', 'kn', 'lt', 'lv', 'ml', 'mr',
      'ms', 'nl', 'no', 'ro', 'sk', 'sl', 'sr', 'sv', 'sw', 'ta', 'te', 'th', 'vi',
    ]

    const enLocale = locales.en as Localization<string>

    for (const code of major) {
      const locale = locales[code] as Localization<string>
      expect(probeCoreKeys.some((key) => locale[key] !== enLocale[key])).toBe(true)
    }
  })
})
