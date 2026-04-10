export { default as detectBrowser } from './detect-browser'

export {
  type BrowserRuntimeFamily,
  type BrowserSupportLevel,
  type WebPlatformWorkerExposure,
  browserRuntimeFamilies,
  browserRuntimeFamilyLabels,
  browserSupportLevelLabels,
  webPlatformWorkerExposureLabels,
  resolveBrowserRuntimeFamily,
  createRuntimeMetadata,
} from './browser-runtime'
export { deepFreeze } from './freeze'
export { canonizeDomain, deCanonizeDomain, validateDomainOrIP } from './domains'
export {
  checkPermissions,
  askForPermissions,
  watchPermissionsChange,
  watchOnboardingStateChange,
  hasSeenOnboarding,
  markOnboardingSeen,
  openOnboardingPage,
  getActivationState,
  isActivationReady,
  ensureActivationReady,
} from './permissions'
export {
  type BrowserType,
  type OSType,
  allTypes as allSettingsGeneratorTypes,
  toSets as generatorTypesToSets,
  fromSets as setsToGeneratorTypes,
} from './generator-type-helpers'

export {
  type PrivacySurfaceDescriptor,
  type PrivacySurfaceId,
  type PrivacySurfaceMode,
  type PrivacySurfacePolicy,
  buildPrivacySurfacePolicy,
  defaultPrivacySurfacePolicy,
  privacySettingsFromPolicy,
  privacySurfaceDescriptors,
} from './privacy-surfaces'


export {
  type RuntimeSurfaceDescriptor,
  type RuntimeSurfaceExecution,
  type RuntimeSurfaceId,
  type RuntimeSurfaceKind,
  type RuntimeSurfaceScope,
  getRuntimeSurfaceDescriptor,
  getRuntimeSurfaceSupport,
  getRuntimeSurfaceSupportLevels,
  runtimeSurfaceDescriptors,
} from './surface-catalog'

export {
  type RuntimeSurfaceContract,
  type RuntimeSurfaceEnforcementPoint,
  type RuntimeSurfaceProjectionShape,
  type RuntimeSurfaceRestrictionShape,
  getRuntimeSurfaceContract,
  runtimeSurfaceContracts,
} from './surface-contracts'

export {
  type RuntimePlanScenario,
  type RuntimePlanScenarioId,
  type RuntimePlanSnapshot,
  type RuntimeSurfacePlanSnapshot,
  type RuntimeSurfaceState,
  type RuntimeSurfaceStateReason,
  buildRuntimePlanSnapshot,
  getRuntimeSurfaceRestrictionSources,
  runtimeSurfaceStateLabels,
  runtimeSurfaceStateReasonLabels,
} from './runtime-plan'

export {
  type UiLanguagePreference,
  getBrowserUiLocale,
  getCachedUiLanguagePreference,
  getUiLanguagePreference,
  getUiLocaleOverride,
  getUiLocaleLabel,
  resolveUiLocale,
  setUiLanguagePreference,
  setUiLocaleOverride,
  supportedUiLocales,
  watchUiLanguagePreference,
} from './ui-language'
