export type BrowserName = 'chrome' | 'opera' | 'edge' | 'firefox' | 'safari'

export default function (): BrowserName | undefined {
  // order is important (based on https://stackoverflow.com/a/9851769/2252921)

  // @ts-expect-error window['opr'] is not defined in typescript
  if (self.window && (self.window['opr'] || self.window['opera'])) {
    return 'opera'
  } else {
    // @ts-expect-error 'opr' is not defined in typescript
    if (self['opr']) {
      return 'opera'
    }
  }

  // @ts-expect-error window['browser'] is not defined in typescript
  if (typeof self['browser'] === 'object' && typeof self['browser'].runtime === 'object') {
    return 'firefox'
  } else if (/Firefox|FxiOS/i.test(self.navigator.userAgent)) {
    return 'firefox'
  }

  if (self.navigator && /Edg/i.test(self.navigator.userAgent)) {
    return 'edge'
  }

  if (self.navigator && /Safari/i.test(self.navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Opera|Firefox|FxiOS/i.test(self.navigator.userAgent)) {
    return 'safari'
  }

  if (self.window && (self.window['chrome'] || typeof chrome === 'object')) {
    return 'chrome'
  } else {
    if (!!self.chrome && !!self.chrome.runtime && !!self.chrome.runtime.id) {
      return 'chrome'
    }
  }

  return undefined
}
