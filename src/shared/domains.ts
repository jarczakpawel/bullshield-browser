import { parse } from 'ipaddr.js'
import punycode from 'punycode/'

export const canonizeDomain = (domain: string): string => {
  const clean = domain
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')

  if (!clean.match(/^[-.:a-zA-Z\d]{2,}$/)) {
    return punycode.toASCII(clean)
  }

  return clean
}

export const deCanonizeDomain = (domain: string): string =>
  punycode.toUnicode(
    domain
      .toLowerCase()
      .replace(/\s/g, '')
      .replace(/\.{2,}/g, '.')
  )

const containsLetterRe = /[a-z]/i
const simpleDomainCheckRe = /^(|[a-z0-9-]+([-.][a-z0-9-]+)*\.)[a-z][a-z0-9-]*$/i

export const validateDomainOrIP = (domain: string): boolean => {
  if (!domain) {
    return false
  }

  try {
    const ip = parse(domain)
    const kind = ip.kind()

    if (kind === 'ipv4' && domain !== ip.toNormalizedString()) {
      return false
    }

    const parts = ip.toByteArray()

    return kind === 'ipv4'
      ? parts.length === 4 && parts.every((part) => part >= 0 && part <= 255)
      : parts.length === 16 && parts.every((part) => part >= 0 && part <= 255)
  } catch {
    return containsLetterRe.test(domain) && simpleDomainCheckRe.test(domain)
  }
}
