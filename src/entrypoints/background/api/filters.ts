import Rule = chrome.declarativeNetRequest.Rule
import type { ReadonlySettingsState, ReadonlyUserAgentState } from '~/shared/types'
import { setRequestHeaders, unsetRequestHeaders } from '../hooks'

/** Returns true if the extension is applicable for the given domain name. */
export async function isApplicableForDomain(settings: ReadonlySettingsState, domain: string): Promise<boolean> {
  const isInList = settings.blacklist.domains.some((item): boolean => item === domain || domain.endsWith(`.${item}`))

  switch (settings.blacklist.mode) {
    case 'blacklist':
      return !isInList

    case 'whitelist':
      return isInList
  }
}

/** Reloads the request headers based on the current settings and user-agent. */
export async function reloadRequestHeaders(
  settings: ReadonlySettingsState,
  current: ReadonlyUserAgentState | undefined
): Promise<Array<Rule> | void> {
  if (settings.enabled && current?.userAgent?.trim()) {
    return await setRequestHeaders(
      current,
      settings.fingerprint.clientHints,
      settings.blacklist.mode === 'blacklist'
        ? { exceptDomains: settings.blacklist.domains }
        : { applyToDomains: settings.blacklist.domains }
    )
  }

  await unsetRequestHeaders()
}
