import type { ReadonlyUserAgentState } from '~/shared/types'

/**
 * Single source of truth for UA Client Hints derived values.
 *
 * These three functions must be used in ALL layers that emit UA-CH data:
 *   - profile.ts      (JS fingerprint surface)
 *   - http-requests.ts (declarativeNetRequest headers)
 *   - debugger-user-agent.ts (CDP Emulation.setUserAgentOverride)
 *   - inject.ts        (navigator.userAgentData.getHighEntropyValues)
 *
 * Never copy-paste the switch blocks below. Import from here.
 */

/**
 * Returns the Sec-CH-UA-Platform-Version value for a given UA state.
 *
 * Priority: if fingerprint.platformVersion is already set (from profile), use it.
 * Otherwise derive from UA metadata.
 *
 * iOS uses the actual device osVersion (e.g. "17.4") and pads to three components,
 * producing a three-component version string (e.g. "17.4.0"), consistent with how
 * real Safari/Chrome on iOS reports it via UA-CH.
 */
export const platformVersionFor = (ua: ReadonlyUserAgentState): string => {
  if (ua.fingerprint?.platformVersion) {
    return ua.fingerprint.platformVersion
  }

  switch (ua.os) {
    case 'windows':
      return '15.0.0'

    case 'linux':
      return '6.8.0'

    case 'macOS':
      return '14.6.1'

    case 'iOS': {
      // Normalise device.osVersion to three-component string: "17.4" → "17.4.0"
      const raw = (ua.device?.osVersion || '17.4').replace(/_/g, '.')
      const parts = raw.split('.').filter(Boolean)
      while (parts.length < 3) parts.push('0')
      // Trim trailing ".0.0" so "17.4.0" stays as "17.4.0" but "17.0.0.0" becomes "17.0.0"
      return parts.slice(0, 3).join('.')
    }

    case 'android': {
      const raw = (ua.device?.osVersion || '14').replace(/_/g, '.')
      const parts = raw.split('.').filter(Boolean)
      if (!parts.length) return ''
      while (parts.length < 3) parts.push('0')
      return parts.slice(0, 3).join('.')
    }

    default:
      return ''
  }
}

/**
 * Returns the Sec-CH-UA-Architecture value for a given OS.
 * Mobile OSes report 'arm', everything else 'x86'.
 */
export const architectureFor = (
  ua: ReadonlyUserAgentState,
  gpuVendor?: string
): string => {
  switch (ua.os) {
    case 'android':
    case 'iOS':
      return 'arm'
    case 'macOS':
      // Apple Silicon (M1/M2/M3) → arm; Intel Mac → x86
      return gpuVendor === 'apple' ? 'arm' : 'x86'
    default:
      return 'x86'
  }
}

/**
 * Returns the Sec-CH-UA-Bitness value for a given OS.
 * Mobile OSes leave bitness empty (browsers don't expose it there),
 * desktop OSes report '64'.
 */
export const bitnessFor = (os: ReadonlyUserAgentState['os']): string => {
  switch (os) {
    case 'android':
    case 'iOS':
      return ''
    default:
      return '64'
  }
}

/**
 * Returns the wow64 field for CDP Emulation.setUserAgentOverride.
 * WoW64 = 32-bit process on 64-bit Windows (rare). Detectable from the UA token "WOW64".
 * Non-Windows or unknown → false.
 */
export const wow64For = (ua: ReadonlyUserAgentState): boolean => {
  if (ua.os !== 'windows') return false
  return /WOW64/i.test(ua.userAgent)
}


export const supportsUAClientHints = (ua: ReadonlyUserAgentState): boolean => {
  switch (ua.browser) {
    case 'chrome':
      return ua.version.browser.major >= 90
    case 'edge':
      return ua.version.browser.major >= 90
    case 'opera':
      return ua.version.browser.major >= 76
    default:
      return false
  }
}

export const formFactorsFor = (ua: ReadonlyUserAgentState): string[] => {
  if (ua.device?.type === 'tablet') return ['Tablet']
  if (ua.os === 'android' || ua.os === 'iOS' || ua.device?.type === 'mobile') return ['Mobile']
  return ['Desktop']
}
