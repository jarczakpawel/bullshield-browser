export const payloadCookiePathsForUrl = (url: URL): readonly string[] => {
  const normalizedPath = (() => {
    const path = url.pathname || '/'
    if (path === '/') {
      return '/'
    }

    return path.endsWith('/') ? path.slice(0, -1) || '/' : path
  })()

  const paths = new Set<string>(['/'])

  if (normalizedPath !== '/') {
    const segments = normalizedPath.split('/').filter(Boolean)
    let current = ''

    for (const segment of segments) {
      current += `/${segment}`
      paths.add(current)
    }
  }

  return Array.from(paths).sort((left, right) => right.length - left.length)
}
