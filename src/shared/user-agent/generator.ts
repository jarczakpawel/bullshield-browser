import {
  chrome as chromeVersion,
  edge as edgeVersion,
  firefox as firefoxVersion,
  opera as operaVersion,
  safari as safariVersion,
} from './browser-versions'
import { androidDevices, type AndroidDeviceProfile } from './android-devices'
import { appleMobileProfiles, type AppleMobileProfile } from './apple-mobile-profiles'
import {
  chromeLinuxProfiles,
  firefoxLinuxProfiles,
  macOsProfiles,
  windowsProfiles,
} from './desktop-profiles'

const randomItem = <T>(items: ReadonlyArray<T>): T => items[Math.floor(Math.random() * items.length)]
const extractMajor = (full: string): number => parseInt(full.split('.')[0], 10)

const chromeMacPlatform = (): string => `Macintosh; Intel Mac OS X ${randomItem(macOsProfiles)}`
const firefoxMacPlatform = (): string => `Macintosh; Intel Mac OS X ${randomItem(macOsProfiles)}`
const safariMacPlatform = (): string => `Macintosh; Intel Mac OS X ${randomItem(macOsProfiles)}`
const chromeWindowsPlatform = (): string => randomItem(windowsProfiles)
const firefoxWindowsPlatform = (): string => randomItem(windowsProfiles)
const chromeLinuxPlatform = (): string => randomItem(chromeLinuxProfiles)
const firefoxLinuxPlatform = (): string => randomItem(firefoxLinuxProfiles)
const appleMobileBuild = (): string => '15E148'
const normalizeAppleMobileOsVersion = (osVersion: string): string => osVersion.replace(/_/g, '.')
const appleMobileUaOsVersion = (osVersion: string): string => normalizeAppleMobileOsVersion(osVersion).replace(/\./g, '_')
const safariVersionFromAppleMobileOs = (osVersion: string): string => normalizeAppleMobileOsVersion(osVersion).split('.').slice(0, 2).join('.')

const generators: {
  chrome: {
    linux: (deps: Record<'chromeVersion', string>) => string
    mac: (deps: Record<'chromeVersion', string>) => string
    windows: (deps: Record<'chromeVersion', string>) => string
    android: (deps: Record<'chromeVersion' | 'androidVersion' | 'model' | 'isTablet', string | boolean>) => string
  }
  firefox: {
    linux: (deps: Record<'firefoxVersion', string>) => string
    mac: (deps: Record<'firefoxVersion', string>) => string
    windows: (deps: Record<'firefoxVersion', string>) => string
    android: (deps: Record<'firefoxVersion' | 'androidVersion' | 'model' | 'isTablet', string | boolean>) => string
  }
  safari: {
    iphone: (deps: Record<'safariVersion' | 'iosVersion', string>) => string
    mac: (deps: Record<'safariVersion', string>) => string
  }
  opera: {
    windows: (deps: Record<'chromeVersion' | 'operaVersion', string>) => string
    mac: (deps: Record<'chromeVersion' | 'operaVersion', string>) => string
  }
  edge: {
    windows: (deps: Record<'chromeVersion' | 'edgeVersion', string>) => string
    mac: (deps: Record<'chromeVersion' | 'edgeVersion', string>) => string
  }
} = {
  chrome: {
    linux: ({ chromeVersion }) =>
      `Mozilla/5.0 (${chromeLinuxPlatform()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`,

    mac: ({ chromeVersion }) =>
      `Mozilla/5.0 (${chromeMacPlatform()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`,

    windows: ({ chromeVersion }) =>
      `Mozilla/5.0 (${chromeWindowsPlatform()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`,

    android: ({ chromeVersion, androidVersion, model, isTablet }) =>
      `Mozilla/5.0 (Linux; Android ${androidVersion}; ${model}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}${isTablet ? ' Safari/537.36' : ' Mobile Safari/537.36'}`,
  },

  firefox: {
    linux: ({ firefoxVersion }) =>
      `Mozilla/5.0 (${firefoxLinuxPlatform()}; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`,

    mac: ({ firefoxVersion }) =>
      `Mozilla/5.0 (${firefoxMacPlatform()}; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`,

    windows: ({ firefoxVersion }) =>
      `Mozilla/5.0 (${firefoxWindowsPlatform()}; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`,

    android: ({ firefoxVersion, androidVersion, model, isTablet }) =>
      `Mozilla/5.0 (Android ${androidVersion}; ${isTablet ? 'Tablet' : 'Mobile'}; ${model}; rv:${firefoxVersion}) Gecko/${firefoxVersion} Firefox/${firefoxVersion}`,
  },

  safari: {
    iphone: ({ safariVersion, iosVersion }) =>
      `Mozilla/5.0 (iPhone; CPU iPhone OS ${appleMobileUaOsVersion(iosVersion)} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${safariVersion} Mobile/${appleMobileBuild()} Safari/604.1`,

    mac: ({ safariVersion }) =>
      `Mozilla/5.0 (${safariMacPlatform()}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${safariVersion} Safari/605.1.15`,
  },

  opera: {
    windows: ({ chromeVersion, operaVersion }) => `${generators.chrome.windows({ chromeVersion })} OPR/${operaVersion}`,
    mac: ({ chromeVersion, operaVersion }) => `${generators.chrome.mac({ chromeVersion })} OPR/${operaVersion}`,
  },

  edge: {
    windows: ({ chromeVersion, edgeVersion }) => `${generators.chrome.windows({ chromeVersion })} Edg/${edgeVersion}`,
    mac: ({ chromeVersion, edgeVersion }) => `${generators.chrome.mac({ chromeVersion })} Edg/${edgeVersion}`,
  },
}

type MobileDeviceState = {
  manufacturer: string
  model: string
  type: 'mobile' | 'tablet'
  osVersion: string
}

type GeneratedUserAgent = {
  userAgent: string
  version: {
    browser: { major: number; full: string }
    underHood?: { type: 'chrome'; major: number; full: string }
  }
  device?: MobileDeviceState
}

const normalizeAndroidVersion = (version: string): string => version.trim() || '14'

const chooseAndroidDevice = (hint?: string): AndroidDeviceProfile => {
  if (!hint?.trim()) {
    return randomItem(androidDevices)
  }

  const q = hint.trim().toLowerCase()
  const matchers = [
    (d: AndroidDeviceProfile): boolean => d.model.toLowerCase() === q,
    (d: AndroidDeviceProfile): boolean => d.manufacturer.toLowerCase() === q,
    (d: AndroidDeviceProfile): boolean => d.model.toLowerCase().includes(q),
    (d: AndroidDeviceProfile): boolean => d.manufacturer.toLowerCase().includes(q),
  ]

  for (const matcher of matchers) {
    const hits = androidDevices.filter(matcher)
    if (hits.length) {
      return randomItem(hits)
    }
  }

  return {
    manufacturer: '',
    model: hint,
    formFactor: /\btab|tablet|sm-t|sm-x|tb[0-9]/i.test(hint) ? 'tablet' : 'mobile',
    androidVersions: ['14'],
  }
}

const chooseAppleMobileProfile = (hint?: string): AppleMobileProfile => {
  if (!hint?.trim()) {
    return randomItem(appleMobileProfiles)
  }

  const q = hint.trim().toLowerCase()
  const exact = appleMobileProfiles.filter((device) => device.model.toLowerCase() === q)
  if (exact.length) {
    return randomItem(exact)
  }

  const partial = appleMobileProfiles.filter((device) => device.model.toLowerCase().includes(q))
  if (partial.length) {
    return randomItem(partial)
  }

  return randomItem(appleMobileProfiles)
}

const chooseAndroidVersion = (device: AndroidDeviceProfile): string => randomItem(device.androidVersions)
const chooseAppleMobileOsVersion = (device: AppleMobileProfile): string => randomItem(device.osVersions)

const maxChromeMajorForAndroid = (androidVersion: string, maxMajor?: number): number | undefined => {
  const major = parseInt(androidVersion.split('.')[0], 10)

  if (major < 10) {
    return maxMajor ? Math.min(maxMajor, 138) : 138
  }

  return maxMajor
}

const buildDeviceState = (
  manufacturer: string,
  model: string,
  type: 'mobile' | 'tablet',
  osVersion: string
): MobileDeviceState => ({ manufacturer, model, type, osVersion })

export default function generate(
  target:
    | 'chrome_linux'
    | 'chrome_mac'
    | 'chrome_win'
    | 'chrome_android'
    | 'firefox_linux'
    | 'firefox_mac'
    | 'firefox_win'
    | 'firefox_android'
    | 'safari_iphone'
    | 'safari_mac'
    | 'opera_win'
    | 'opera_mac'
    | 'edge_win'
    | 'edge_mac',
  opt?: Partial<{
    version: string
    mobileVendor: string
    maxMajor: number
    majorDelta: number
    underHoodMaxMajor: number
    underHoodMajorDelta: number
  }>
): GeneratedUserAgent {
  switch (target) {
    case 'chrome_linux': {
      const [major, full] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : chromeVersion(opt?.maxMajor, opt?.majorDelta)

      return {
        userAgent: generators.chrome.linux({ chromeVersion: full }),
        version: { browser: { major, full } },
      }
    }

    case 'chrome_mac': {
      const [major, full] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : chromeVersion(opt?.maxMajor, opt?.majorDelta)

      return {
        userAgent: generators.chrome.mac({ chromeVersion: full }),
        version: { browser: { major, full } },
      }
    }

    case 'chrome_win': {
      const [major, full] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : chromeVersion(opt?.maxMajor, opt?.majorDelta)

      return {
        userAgent: generators.chrome.windows({ chromeVersion: full }),
        version: { browser: { major, full } },
      }
    }

    case 'chrome_android': {
      const device = chooseAndroidDevice(opt?.mobileVendor)
      const osVersion = chooseAndroidVersion(device)
      const [major, full] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : chromeVersion(maxChromeMajorForAndroid(osVersion, opt?.maxMajor), opt?.majorDelta)

      return {
        userAgent: generators.chrome.android({
          chromeVersion: full,
          androidVersion: osVersion,
          model: device.model,
          isTablet: device.formFactor === 'tablet',
        }),
        version: { browser: { major, full } },
        device: buildDeviceState(device.manufacturer, device.model, device.formFactor, osVersion),
      }
    }

    case 'firefox_linux': {
      const [major, full] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : firefoxVersion(opt?.maxMajor, opt?.majorDelta)

      return {
        userAgent: generators.firefox.linux({ firefoxVersion: full }),
        version: { browser: { major, full } },
      }
    }

    case 'firefox_mac': {
      const [major, full] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : firefoxVersion(opt?.maxMajor, opt?.majorDelta)

      return {
        userAgent: generators.firefox.mac({ firefoxVersion: full }),
        version: { browser: { major, full } },
      }
    }

    case 'firefox_win': {
      const [major, full] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : firefoxVersion(opt?.maxMajor, opt?.majorDelta)

      return {
        userAgent: generators.firefox.windows({ firefoxVersion: full }),
        version: { browser: { major, full } },
      }
    }

    case 'firefox_android': {
      const device = chooseAndroidDevice(opt?.mobileVendor)
      const osVersion = chooseAndroidVersion(device)
      const [major, full] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : firefoxVersion(opt?.maxMajor, opt?.majorDelta)

      return {
        userAgent: generators.firefox.android({
          firefoxVersion: full,
          androidVersion: osVersion,
          model: device.model,
          isTablet: device.formFactor === 'tablet',
        }),
        version: { browser: { major, full } },
        device: buildDeviceState(device.manufacturer, device.model, device.formFactor, osVersion),
      }
    }

    case 'safari_iphone': {
      const device = chooseAppleMobileProfile(opt?.mobileVendor)
      const osVersion = chooseAppleMobileOsVersion(device)
      const full = opt?.version || safariVersionFromAppleMobileOs(osVersion)
      const major = extractMajor(full)

      return {
        userAgent: generators.safari.iphone({ safariVersion: full, iosVersion: osVersion }),
        version: { browser: { major, full } },
        device: buildDeviceState('Apple', device.model, 'mobile', normalizeAppleMobileOsVersion(osVersion)),
      }
    }

    case 'safari_mac': {
      const [major, full] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : safariVersion(opt?.maxMajor, opt?.majorDelta)

      return {
        userAgent: generators.safari.mac({ safariVersion: full }),
        version: { browser: { major, full } },
      }
    }

    case 'opera_win': {
      const [chromeMajor, chromeFull] = chromeVersion(opt?.underHoodMaxMajor, opt?.underHoodMajorDelta)
      const [operaMajor, operaFull] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : operaVersion(opt?.maxMajor, opt?.majorDelta)

      return {
        userAgent: generators.opera.windows({ chromeVersion: chromeFull, operaVersion: operaFull }),
        version: {
          browser: { major: operaMajor, full: operaFull },
          underHood: { type: 'chrome', major: chromeMajor, full: chromeFull },
        },
      }
    }

    case 'opera_mac': {
      const [chromeMajor, chromeFull] = chromeVersion(opt?.underHoodMaxMajor, opt?.underHoodMajorDelta)
      const [operaMajor, operaFull] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : operaVersion(opt?.maxMajor, opt?.majorDelta)

      return {
        userAgent: generators.opera.mac({ chromeVersion: chromeFull, operaVersion: operaFull }),
        version: {
          browser: { major: operaMajor, full: operaFull },
          underHood: { type: 'chrome', major: chromeMajor, full: chromeFull },
        },
      }
    }

    case 'edge_win': {
      const [chromeMajor, chromeFull] = chromeVersion(opt?.underHoodMaxMajor, opt?.underHoodMajorDelta)
      const [edgeMajor, edgeFull] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : edgeVersion(opt?.maxMajor, opt?.majorDelta)

      return {
        userAgent: generators.edge.windows({ chromeVersion: chromeFull, edgeVersion: edgeFull }),
        version: {
          browser: { major: edgeMajor, full: edgeFull },
          underHood: { type: 'chrome', major: chromeMajor, full: chromeFull },
        },
      }
    }

    case 'edge_mac': {
      const [chromeMajor, chromeFull] = chromeVersion(opt?.underHoodMaxMajor, opt?.underHoodMajorDelta)
      const [edgeMajor, edgeFull] = opt?.version
        ? [extractMajor(opt.version), opt.version]
        : edgeVersion(opt?.maxMajor, opt?.majorDelta)

      return {
        userAgent: generators.edge.mac({ chromeVersion: chromeFull, edgeVersion: edgeFull }),
        version: {
          browser: { major: edgeMajor, full: edgeFull },
          underHood: { type: 'chrome', major: chromeMajor, full: chromeFull },
        },
      }
    }

    default:
      throw new Error(`Unsupported generator type: ${target}`)
  }
}

export const normalizeGeneratedAndroidVersion = normalizeAndroidVersion
