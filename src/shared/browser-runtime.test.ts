import { describe, expect, test } from 'vitest'
import { createRuntimeMetadata, resolveBrowserRuntimeFamily } from './browser-runtime'

describe('resolveBrowserRuntimeFamily', () => {
  test('maps firefox to firefox family', () => {
    expect(resolveBrowserRuntimeFamily('firefox')).toBe('firefox')
  })

  test('maps chromium-based browsers to chromium family', () => {
    expect(resolveBrowserRuntimeFamily('chrome')).toBe('chromium')
    expect(resolveBrowserRuntimeFamily('edge')).toBe('chromium')
    expect(resolveBrowserRuntimeFamily('opera')).toBe('chromium')
  })

  test('falls back to chromium for undefined host', () => {
    expect(resolveBrowserRuntimeFamily(undefined)).toBe('chromium')
  })
})

describe('createRuntimeMetadata', () => {
  test('stores host browser family, not profile browser family', () => {
    expect(createRuntimeMetadata('firefox')).toStrictEqual({ hostBrowserFamily: 'firefox' })
    expect(createRuntimeMetadata('chrome')).toStrictEqual({ hostBrowserFamily: 'chromium' })
  })
})
