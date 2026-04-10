import type { BrowserName } from './detect-browser'
import { deepFreeze } from './freeze'

export type BrowserRuntimeFamily = 'chromium' | 'firefox'
export type BrowserSupportLevel = 'full' | 'partial' | 'none'
export type WebPlatformWorkerExposure = 'none' | 'partial' | 'full'

export type RuntimeMetadata = Readonly<{
  hostBrowserFamily: BrowserRuntimeFamily
}>

export const browserRuntimeFamilies = deepFreeze(['chromium', 'firefox'] as const)

export const browserRuntimeFamilyLabels: Readonly<Record<BrowserRuntimeFamily, string>> = deepFreeze({
  chromium: 'Chromium',
  firefox: 'Firefox',
})

export const browserSupportLevelLabels: Readonly<Record<BrowserSupportLevel, string>> = deepFreeze({
  full: 'full',
  partial: 'partial',
  none: 'none',
})

export const webPlatformWorkerExposureLabels: Readonly<Record<WebPlatformWorkerExposure, string>> = deepFreeze({
  none: 'window only',
  partial: 'visible on some worker-facing web APIs',
  full: 'worker reachable',
})

export const resolveBrowserRuntimeFamily = (browser: BrowserName | undefined): BrowserRuntimeFamily => {
  switch (browser) {
    case 'firefox':
      return 'firefox'
    case 'chrome':
    case 'edge':
    case 'opera':
    default:
      return 'chromium'
  }
}

export const createRuntimeMetadata = (hostBrowser: BrowserName | undefined): RuntimeMetadata => ({
  hostBrowserFamily: resolveBrowserRuntimeFamily(hostBrowser),
})
