import { describe, expect, it } from 'vitest'
import { payloadCookiePathsForUrl } from './payload-cookie-paths'

describe('payloadCookiePathsForUrl', () => {
  it('returns most-specific path first and includes every visible ancestor path', () => {
    const paths = payloadCookiePathsForUrl(new URL('https://example.com/a/b/c'))
    expect(paths).toStrictEqual(['/a/b/c', '/a/b', '/a', '/'])
  })

  it('normalizes trailing slash paths without creating duplicates', () => {
    const paths = payloadCookiePathsForUrl(new URL('https://example.com/a/b/'))
    expect(paths).toStrictEqual(['/a/b', '/a', '/'])
  })

  it('keeps root path as a single entry', () => {
    const paths = payloadCookiePathsForUrl(new URL('https://example.com/'))
    expect(paths).toStrictEqual(['/'])
  })
})
