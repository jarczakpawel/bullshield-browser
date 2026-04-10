import structuredClone from '@ungap/structured-clone'
import { detectBrowser, getActivationState, hasSeenOnboarding, openOnboardingPage, watchOnboardingStateChange, watchPermissionsChange } from '~/shared'
import type { ReadonlySettingsState, ReadonlyUserAgentState } from '~/shared/types'
import { type HandlersMap, listen as listenRuntime } from '~/shared/messaging'
import { isApplicableForDomain, reloadRequestHeaders, renewUserAgent } from './api'
import {
  registerContentScripts,
  clearNavigationPayloadForUrl,
  refreshDebuggerUserAgentForTab,
  unsetRequestHeaders,
  updateDebuggerUserAgentState,
  updateNavigationPayloadState,
} from './hooks'
import { registerHotkeys } from './hotkeys'
import { CurrentUserAgent, Settings, StorageArea, LatestBrowserVersions, UserAgentHistory } from './persistent'
import { Timer } from './timer'
import type { DeepWriteable } from '~/types'
import { setExtensionIcon, setExtensionTitle } from './ui'

/** Debug logging */
const debug = (msg: string, ...args: Array<unknown>): void => console.debug(`%c😈 ${msg}`, 'font-weight:bold', ...args)
/** Convert milliseconds to seconds */
const m2s = (millis: number): number => Math.round(millis / 1000)

async function waitForTabLoading(tabId: number): Promise<void> {
  await new Promise<void>((resolve) => {
    const listener = (updatedTabId: number, changeInfo: { status?: string }): void => {
      if (updatedTabId !== tabId || changeInfo.status !== 'loading') {
        return
      }

      chrome.tabs.onUpdated.removeListener(listener)
      resolve()
    }

    chrome.tabs.onUpdated.addListener(listener)
  })
}

async function hardResetTabNavigation(tabId: number, url: string): Promise<void> {
  await chrome.tabs.update(tabId, { url: 'about:blank' })
  await waitForTabLoading(tabId)
  await chrome.tabs.update(tabId, { url })
}

const getEffectiveSettings = (
  settings: ReadonlySettingsState,
  activationReady: boolean
): ReadonlySettingsState => (activationReady || !settings.enabled ? settings : { ...settings, enabled: false })

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install' && !(await hasSeenOnboarding())) {
    await openOnboardingPage()
  }
})

chrome.runtime.onStartup.addListener(() => {
  void (async () => {
    const activationReady = (await getActivationState()).ready
    const settings = new Settings(new StorageArea('settings-struct-v3', 'sync', 'local'), detectBrowser())
    const currentSettings = getEffectiveSettings(await settings.get(), activationReady)

    if (!currentSettings.enabled || !currentSettings.renew.onStartup) {
      return
    }

    const hostOS = (await chrome.runtime.getPlatformInfo()).os
    const currentUserAgent = new CurrentUserAgent(new StorageArea('useragent-state', 'local'))
    const latestBrowserVersions = new LatestBrowserVersions()

    await renewUserAgent(settings, currentUserAgent, hostOS, latestBrowserVersions)
  })().catch((error: unknown) => {
    console.error(error)
  })
})

// run the background script
;(async () => {
  // register the content scripts
  await registerContentScripts()

  // detect the host OS
  const hostOS = (await chrome.runtime.getPlatformInfo()).os

  // at least FireFox does not allow the extension to work with all URLs by default, and the user must grant the
  // necessary permissions. in addition, the user can revoke the permissions at any time, so we need to monitor the
  // changes in the permissions and open the onboarding page if the necessary permissions are missing
  let activationReady = (await getActivationState()).ready

  // settings are stored in the 'sync' storage area because they need to be synchronized between different devices,
  // and only if the 'sync' storage area is not available, we use the 'local' storage area
  const settings = new Settings(new StorageArea('settings-struct-v3', 'sync', 'local'), detectBrowser())
  let initSettings = await settings.get()
  debug('settings', initSettings)

  // for the current user-agent, we need to use the 'local' storage area because it supports much more frequent
  // updates and does not require synchronization between devices. do not use the 'sync' storage area for this purpose
  const currentUserAgent = new CurrentUserAgent(new StorageArea('useragent-state', 'local'))
  let initCurrentUserAgent = await currentUserAgent.get()
  debug('current user-agent', initCurrentUserAgent)

  const userAgentHistory = new UserAgentHistory(new StorageArea('useragent-history-v1', 'local'))
  debug('user-agent history size', (await userAgentHistory.get()).length)

  const initEffectiveSettings = getEffectiveSettings(initSettings, activationReady)
  updateNavigationPayloadState(initEffectiveSettings, initCurrentUserAgent)
  updateDebuggerUserAgentState(initEffectiveSettings, initCurrentUserAgent)

  const latestBrowserVersions = new LatestBrowserVersions()
  debug('bundled browser versions', ...(await latestBrowserVersions.get()))

  // handlers is a map of functions that can be called from the popup or content scripts (and not only from them).
  // think about them as a kind of API for the extension
  const handlers: HandlersMap = {
    ping: (...args) => args,
    version: () => chrome.runtime.getManifest().version,
    currentUserAgent: async () => (await currentUserAgent.get())?.userAgent,
    currentUserAgentState: async () => await currentUserAgent.get(),
    renewUserAgent: async () => {
      const gen = await renewUserAgent(settings, currentUserAgent, hostOS, latestBrowserVersions)
      return gen.new.userAgent
    },
    settings: async () => settings.get(),
    updateSettings: async (part) => (await settings.update(part)) && settings.get(),
    isApplicableForDomain: async (domain) => isApplicableForDomain(await settings.get(), domain),
    refreshActiveTab: async (tabId) => {
      const [currentSettings, currentUa, tab, activationState] = await Promise.all([
        settings.get(),
        currentUserAgent.get(),
        chrome.tabs.get(tabId).catch(() => undefined),
        getActivationState(),
      ])
      const effectiveSettings = getEffectiveSettings(currentSettings, activationState.ready)

      updateNavigationPayloadState(effectiveSettings, currentUa)
      updateDebuggerUserAgentState(effectiveSettings, currentUa)

      if (tab?.url) {
        await clearNavigationPayloadForUrl(tab.url)
      }

      if (effectiveSettings.enabled) {
        await reloadRequestHeaders(effectiveSettings, currentUa)
      } else {
        await unsetRequestHeaders()
      }

      await refreshDebuggerUserAgentForTab(tabId)

      if (!effectiveSettings.enabled && tab?.url && /^https?:\/\//i.test(tab.url)) {
        await hardResetTabNavigation(tabId, tab.url)
        return
      }

      await chrome.tabs.reload(tabId, { bypassCache: true })
    },
    historyList: async () => await userAgentHistory.get(),
    addCurrentToHistory: async () => {
      const [currentSnapshot, currentSettings] = await Promise.all([currentUserAgent.get(), settings.get()])

      if (!currentSnapshot) {
        throw new Error('No active profile to save')
      }

      return await userAgentHistory.add(currentSnapshot, currentSettings)
    },
    applyHistoryEntry: async (id) => {
      const entry = await userAgentHistory.find(id)

      if (!entry) {
        throw new Error('History entry not found')
      }

      return await currentUserAgent.update(structuredClone(entry.snapshot) as DeepWriteable<ReadonlyUserAgentState>)
    },
    removeHistoryEntry: async (id) => await userAgentHistory.remove(id),
    clearHistory: async () => await userAgentHistory.clear(),
  }

  // create a timer to renew the user-agent automatically
  const userAgentRenewTimer = new Timer('renew-user-agent', m2s(initSettings.renew.intervalMillis), async () => {
    await renewUserAgent(settings, currentUserAgent, hostOS, latestBrowserVersions)
    debug('user-agent was renewed automatically', await currentUserAgent.get())
  })

  const applyOperationalState = async (
    settingsState: ReadonlySettingsState = initSettings,
    currentUa = initCurrentUserAgent
  ): Promise<void> => {
    const effectiveSettings = getEffectiveSettings(settingsState, activationReady)

    if (effectiveSettings.enabled && !currentUa?.userAgent?.trim()) {
      const storedCurrentUa = await currentUserAgent.get()

      if (storedCurrentUa?.userAgent?.trim()) {
        currentUa = storedCurrentUa
        initCurrentUserAgent = storedCurrentUa
      } else {
        await renewUserAgent(settings, currentUserAgent, hostOS, latestBrowserVersions)
        currentUa = await currentUserAgent.get()
        initCurrentUserAgent = currentUa
      }
    }

    updateNavigationPayloadState(effectiveSettings, currentUa)
    updateDebuggerUserAgentState(effectiveSettings, currentUa)

    if (effectiveSettings.enabled) {
      if (effectiveSettings.renew.enabled) {
        if (m2s(effectiveSettings.renew.intervalMillis) !== userAgentRenewTimer.getIntervalSec) {
          await userAgentRenewTimer.changeInterval(m2s(effectiveSettings.renew.intervalMillis))
        }

        if (!userAgentRenewTimer.isStarted) {
          await userAgentRenewTimer.start()
        }
      } else {
        await userAgentRenewTimer.stop()
      }

      const reloaded = await reloadRequestHeaders(effectiveSettings, currentUa)
      debug('the request header rules have been ' + (reloaded ? 'set' : 'unset'), reloaded)
    } else {
      await Promise.allSettled([unsetRequestHeaders(), userAgentRenewTimer.stop()])
      debug('all features have been disabled')
    }

    await setExtensionIcon(effectiveSettings.enabled)
  }

  watchPermissionsChange(async () => {
    activationReady = (await getActivationState()).ready
    await applyOperationalState()
  })

  watchOnboardingStateChange(async () => {
    activationReady = (await getActivationState()).ready
    await applyOperationalState()
  })

  // on current user-agent changes, save it to the storage area, and update the browser request headers
  currentUserAgent.onChange(async (c) => {
    initCurrentUserAgent = c

    debug('current user-agent was changed', c)

    // update the extension title with the current user-agent information
    await setExtensionTitle(c)

    await applyOperationalState(await settings.get(), c)
  })

  settings.onChange(async (s) => {
    initSettings = s

    debug('settings were changed', s)

    await applyOperationalState(s)
  })

  await applyOperationalState()

  // register hotkeys for the extension commands, such as renewing the user-agent
  registerHotkeys({
    renewUserAgent: async () => {
      await renewUserAgent(settings, currentUserAgent, hostOS, latestBrowserVersions)
      initCurrentUserAgent = await currentUserAgent.get()
      updateNavigationPayloadState(getEffectiveSettings(initSettings, activationReady), initCurrentUserAgent)
      updateDebuggerUserAgentState(getEffectiveSettings(initSettings, activationReady), initCurrentUserAgent)
    },
  })

  listenRuntime(handlers)
})().catch((error: unknown): void => {
  throw error
})
