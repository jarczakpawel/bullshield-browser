import structuredClone from '@ungap/structured-clone'
import type { ReadonlySettingsState, ReadonlyUserAgentState, SettingsGeneratorType } from '~/shared/types'
import { generateUserAgent } from '~/shared/user-agent'
import { buildFingerprintProfile } from '~/shared/fingerprint/profile'
import type { DeepWriteable } from '~/types'
import {
  Settings,
  CurrentUserAgent,
  LatestBrowserVersions,
  type ReadonlyVersionsState,
} from '../persistent'

type MutableUserAgentState = DeepWriteable<ReadonlyUserAgentState>
type HostOS = 'linux' | 'android' | 'mac' | 'win' | 'cros' | 'openbsd' | 'fuchsia' | 'ios'

const toMutableState = (state: ReadonlyUserAgentState): MutableUserAgentState =>
  structuredClone(state) as MutableUserAgentState

const withFingerprintProfile = (state: ReadonlyUserAgentState): ReadonlyUserAgentState =>
  Object.freeze({
    ...state,
    fingerprint: buildFingerprintProfile(state),
  })

export default async function renewUserAgent(
  s: Settings,
  current: CurrentUserAgent,
  hostOS: HostOS,
  latestVersions: LatestBrowserVersions
): Promise<
  Readonly<{
    source: 'generator'
    previous?: ReadonlyUserAgentState
    new: ReadonlyUserAgentState
  }>
> {
  const previous = await current.get()
  const settings = await s.get()
  const [latest] = await latestVersions.get()
  const generated = generatedUserAgent(settings, hostOS, latest)

  const saved = await current.update(toMutableState(generated))

  return Object.freeze({ source: 'generator', previous, new: saved })
}

const hostCompatibleTypesFor = (hostOS: HostOS): ReadonlyArray<SettingsGeneratorType> => {
  switch (hostOS) {
    case 'mac':
      return ['chrome_mac', 'firefox_mac', 'safari_mac', 'opera_mac', 'edge_mac']
    case 'ios':
      return ['safari_iphone']
    case 'linux':
    case 'openbsd':
    case 'fuchsia':
    case 'cros':
      return ['chrome_linux', 'firefox_linux']
    case 'android':
      return ['chrome_android', 'firefox_android']
    default:
      return ['chrome_win', 'firefox_win', 'opera_win', 'edge_win']
  }
}

const generatedUserAgent = (
  settings: ReadonlySettingsState,
  hostOS: HostOS,
  latest?: ReadonlyVersionsState
): ReadonlyUserAgentState => {
  const requestedTypes: Array<SettingsGeneratorType> = settings.generator.types.length ? [...settings.generator.types] : ['chrome_win']
  const allowedHostTypes = hostCompatibleTypesFor(hostOS)
  const allowedHostTypesSet = new Set(allowedHostTypes)
  const selectedPool = (() => {
    const compatible = requestedTypes.filter((type) => allowedHostTypesSet.has(type))

    if (hostOS === 'ios') {
      return compatible.length ? compatible : [...allowedHostTypes]
    }

    if (settings.generator.syncOsWithHost) {
      return compatible.length ? compatible : [...allowedHostTypes]
    }

    return requestedTypes
  })()
  const selectedType = selectedPool[Math.floor(Math.random() * selectedPool.length)]

  const generated = generateUserAgent(
    selectedType,
    (() => {
      switch (selectedType) {
        case 'chrome_win':
        case 'chrome_mac':
        case 'chrome_linux':
        case 'chrome_android':
          return { maxMajor: latest?.chrome }
        case 'firefox_win':
        case 'firefox_mac':
        case 'firefox_linux':
        case 'firefox_android':
          return { maxMajor: latest?.firefox }
        case 'opera_win':
        case 'opera_mac':
          return { maxMajor: latest?.opera, underHoodMaxMajor: latest?.chrome }
        case 'safari_iphone':
        case 'safari_mac':
          return { maxMajor: latest?.safari }
        case 'edge_win':
        case 'edge_mac':
          return { maxMajor: latest?.edge, underHoodMaxMajor: latest?.chrome }
        default:
          return { maxMajor: latest?.chrome }
      }
    })()
  )

  return withFingerprintProfile(
    Object.freeze({
      userAgent: generated.userAgent,
      browser: ((): ReadonlyUserAgentState['browser'] => {
        switch (selectedType) {
          case 'chrome_win':
          case 'chrome_mac':
          case 'chrome_linux':
          case 'chrome_android':
            return 'chrome'
          case 'firefox_win':
          case 'firefox_mac':
          case 'firefox_linux':
          case 'firefox_android':
            return 'firefox'
          case 'opera_win':
          case 'opera_mac':
            return 'opera'
          case 'safari_iphone':
          case 'safari_mac':
            return 'safari'
          case 'edge_win':
          case 'edge_mac':
            return 'edge'
          default:
            return 'unknown'
        }
      })(),
      os: ((): ReadonlyUserAgentState['os'] => {
        switch (selectedType) {
          case 'chrome_win':
          case 'firefox_win':
          case 'opera_win':
          case 'edge_win':
            return 'windows'
          case 'chrome_linux':
          case 'firefox_linux':
            return 'linux'
          case 'chrome_mac':
          case 'firefox_mac':
          case 'safari_mac':
          case 'opera_mac':
          case 'edge_mac':
            return 'macOS'
          case 'safari_iphone':
            return 'iOS'
          case 'chrome_android':
          case 'firefox_android':
            return 'android'
          default:
            return 'unknown'
        }
      })(),
      version: {
        browser: { major: generated.version.browser.major, full: generated.version.browser.full },
        underHood: generated.version.underHood
          ? { major: generated.version.underHood.major, full: generated.version.underHood.full }
          : undefined,
      },
      device: generated.device,
    })
  )
}
