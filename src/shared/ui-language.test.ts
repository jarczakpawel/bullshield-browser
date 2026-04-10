import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  getBrowserUiLocale,
  getUiLocaleOverride,
  normalizeUiLocale,
  resolveUiLocale,
  setUiLocaleOverride,
} from './ui-language'

describe('ui-language', () => {
  afterEach(() => {
    setUiLocaleOverride(undefined)
    vi.unstubAllGlobals()
  })

  test('normalizes supported locale codes', () => {
    expect(normalizeUiLocale('pl-PL')).toBe('pl')
    expect(normalizeUiLocale('pt-BR')).toBe('pt_BR')
    expect(normalizeUiLocale('zh-TW')).toBe('zh_TW')
    expect(normalizeUiLocale('es-419')).toBe('es_419')
  })

  test('resolves auto preference from browser language', () => {
    vi.stubGlobal('chrome', {
      i18n: {
        getUILanguage: () => 'de-DE',
      },
    })

    expect(getBrowserUiLocale()).toBe('de')
    expect(resolveUiLocale('auto')).toBe('de')
  })

  test('tracks the current locale override', () => {
    setUiLocaleOverride('uk')
    expect(getUiLocaleOverride()).toBe('uk')
    setUiLocaleOverride(undefined)
    expect(getUiLocaleOverride()).toBeUndefined()
  })
})
