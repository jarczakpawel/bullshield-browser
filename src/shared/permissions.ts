type Permissions = chrome.permissions.Permissions

type OnboardingState = Readonly<{
  seen: boolean
  seenAt?: number
}>

type ActivationState = Readonly<{
  permissionsGranted: boolean
  onboardingSeen: boolean
  ready: boolean
}>

const permissions: Permissions = {
  origins: ['<all_urls>'],
}

const onboardingStateKey = 'onboarding-state-v1'
const getOnboardingUrl = (): string => chrome.runtime.getURL('/onboard/index.html')

const readOnboardingState = async (): Promise<OnboardingState> => {
  const items = await chrome.storage.local.get(onboardingStateKey)
  const state = items[onboardingStateKey] as OnboardingState | undefined

  return state?.seen ? state : { seen: false }
}

const readPermissionsGranted = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    chrome.permissions.contains(permissions, (has) => resolve(has))
  })
}

export const getActivationState = async (): Promise<ActivationState> => {
  const [permissionsGranted, onboardingSeen] = await Promise.all([readPermissionsGranted(), hasSeenOnboarding()])

  return {
    permissionsGranted,
    onboardingSeen,
    ready: permissionsGranted && onboardingSeen,
  }
}

export const hasSeenOnboarding = async (): Promise<boolean> => (await readOnboardingState()).seen

export const markOnboardingSeen = async (): Promise<void> => {
  await chrome.storage.local.set({
    [onboardingStateKey]: {
      seen: true,
      seenAt: Date.now(),
    } satisfies OnboardingState,
  })
}

export const openOnboardingPage = async (): Promise<void> => {
  const onboardingUrl = getOnboardingUrl()
  const existing = (await chrome.tabs.query({ url: onboardingUrl }))[0]

  if (typeof existing?.id === 'number') {
    await chrome.tabs.update(existing.id, { active: true })
    return
  }

  await chrome.tabs.create({ url: onboardingUrl })
}

/**
 * Check if the extension has the necessary permissions. In addition, if the permissions are not granted, it can
 * open the onboarding page.
 */
export const checkPermissions = async (openOnboardingPageIfNot: boolean = false): Promise<boolean> => {
  const has = await readPermissionsGranted()

  if (openOnboardingPageIfNot && !has) {
    await openOnboardingPage()
  }

  return has
}

export const isActivationReady = async (): Promise<boolean> => (await getActivationState()).ready

export const ensureActivationReady = async (): Promise<boolean> => {
  const state = await getActivationState()

  if (!state.ready) {
    await openOnboardingPage()
  }

  return state.ready
}

/** Ask the user for the necessary permissions. Must be called from a user gesture. */
export const askForPermissions = async (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    chrome.permissions.request(permissions, (granted) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message))
      }

      resolve(granted)
    })
  })
}

/** Watch for changes in the permissions. */
export const watchPermissionsChange = (fn: (delta: Permissions) => void): void => {
  chrome.permissions.onAdded.addListener(fn)
  chrome.permissions.onRemoved.addListener(fn)
}

export const watchOnboardingStateChange = (fn: (seen: boolean) => void): void => {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !(onboardingStateKey in changes)) {
      return
    }

    const next = changes[onboardingStateKey]?.newValue as OnboardingState | undefined
    fn(Boolean(next?.seen))
  })
}
