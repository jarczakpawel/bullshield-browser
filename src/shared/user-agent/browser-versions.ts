/** Generate a random number between a range. */
const fromRange = (min: number, max: number): number => {
  min = Math.ceil(min)

  return Math.floor(Math.random() * (Math.floor(max) - min + 1)) + min
}

/** @link https://chromereleases.googleblog.com/search/label/Desktop%20Update */
export const chrome = (maxMajor?: number, majorDelta: number = 2): [major: number, full: string] => {
  const variants = {
    major: { min: 136, max: 138 },
    patch: { min: 6834, max: 7204 },
    build: { min: 85, max: 101 },
  }

  if (maxMajor) {
    variants.major.max = Math.max(maxMajor, 0)
    variants.major.min = Math.max(maxMajor - majorDelta, 0)
  }

  const major = fromRange(variants.major.min, variants.major.max)

  return [
    major,
    `${major}.0.${fromRange(variants.patch.min, variants.patch.max)}.${fromRange(variants.build.min, variants.build.max)}`,
  ]
}

/** @link https://www.mozilla.org/en-US/firefox/releases/ */
export const firefox = (maxMajor?: number, majorDelta: number = 2): [major: number, full: string] => {
  const variants = {
    major: { min: 138, max: 140 },
  }

  if (maxMajor) {
    variants.major.max = Math.max(maxMajor, 0)
    variants.major.min = Math.max(maxMajor - majorDelta, 0)
  }

  const major = fromRange(variants.major.min, variants.major.max)

  return [major, `${major}.0${Math.random() < 0.3 ? 'esr' : ''}`]
}

/** @link https://en.wikipedia.org/wiki/Opera_version_history */
export const opera = (maxMajor?: number, majorDelta: number = 2): [major: number, full: string] => {
  const variants = {
    major: { min: 116, max: 119 },
    patch: { min: 5067, max: 5322 },
    build: { min: 16, max: 198 },
  }

  if (maxMajor) {
    variants.major.max = Math.max(maxMajor, 0)
    variants.major.min = Math.max(maxMajor - majorDelta, 0)
  }

  const major = fromRange(variants.major.min, variants.major.max)

  return [
    major,
    `${major}.0.${fromRange(variants.patch.min, variants.patch.max)}.${fromRange(variants.build.min, variants.build.max)}`,
  ]
}

const safariVersions: ReadonlyArray<string> = ['17.6', '17.6.1', '18.0', '18.1', '18.1.1', '18.2', '18.3', '18.3.1', '18.6']

export const safari = (maxMajor?: number, majorDelta: number = 1): [major: number, full: string] => {
  const normalizedMaxMajor = maxMajor && maxMajor < 100 ? maxMajor : undefined
  const filtered = normalizedMaxMajor
    ? safariVersions.filter((version) => {
        const major = parseInt(version.split('.')[0], 10)

        return major <= normalizedMaxMajor && major >= Math.max(normalizedMaxMajor - majorDelta, 0)
      })
    : safariVersions
  const full = filtered.length ? filtered[Math.floor(Math.random() * filtered.length)] : safariVersions[safariVersions.length - 1]

  return [parseInt(full.split('.')[0], 10), full]
}

/** @link https://docs.microsoft.com/en-us/deployedge/microsoft-edge-relnote-stable-channel */
export const edge = (maxMajor?: number, majorDelta: number = 2): [major: number, full: string] => {
  const variants = {
    major: { min: 136, max: 138 },
    patch: { min: 2903, max: 3351 },
    build: { min: 99, max: 112 },
  }

  if (maxMajor) {
    variants.major.max = Math.max(maxMajor, 0)
    variants.major.min = Math.max(maxMajor - majorDelta, 0)
  }

  const major = fromRange(variants.major.min, variants.major.max)

  return [
    major,
    `${major}.0.${fromRange(variants.patch.min, variants.patch.max)}.${fromRange(variants.build.min, variants.build.max)}`,
  ]
}
