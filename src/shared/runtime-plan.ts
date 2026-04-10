import { deepFreeze } from './freeze'
import type { BrowserRuntimeFamily, BrowserSupportLevel } from './browser-runtime'
import { privacySurfaceDescriptors, type PrivacySurfaceId, type PrivacySurfacePolicy } from './privacy-surfaces'
import { getRuntimeSurfaceContract } from './surface-contracts'
import { getRuntimeSurfaceSupport, runtimeSurfaceDescriptors, type RuntimeSurfaceId } from './surface-catalog'

export type RuntimeSurfaceState = 'enabled' | 'restricted' | 'disabled'
export type RuntimeSurfaceStateReason = 'available' | 'restricted-by-policy' | 'profile-required' | 'browser-unsupported'
export type RuntimePlanScenarioId =
  | 'passthrough-without-profile'
  | 'passthrough-with-profile'
  | 'restricted-without-profile'
  | 'restricted-with-profile'

export type RuntimePlanScenario = Readonly<{
  id: RuntimePlanScenarioId
  label: string
  profileAvailable: boolean
  restricted: boolean
  state: RuntimeSurfaceState
  reason: RuntimeSurfaceStateReason
}>

export type RuntimeSurfacePlanSnapshot = Readonly<{
  runtimeSurfaceId: RuntimeSurfaceId
  title: string
  supportLevel: BrowserSupportLevel
  restrictionSources: readonly PrivacySurfaceId[]
  currentState: RuntimeSurfaceState
  currentReason: RuntimeSurfaceStateReason
  scenarios: readonly RuntimePlanScenario[]
}>

export type RuntimePlanSnapshot = readonly RuntimeSurfacePlanSnapshot[]

const scenarioInputs: readonly Readonly<{
  id: RuntimePlanScenarioId
  label: string
  profileAvailable: boolean
  restricted: boolean
}>[] = deepFreeze([
  {
    id: 'passthrough-without-profile',
    label: 'Passthrough, no profile',
    profileAvailable: false,
    restricted: false,
  },
  {
    id: 'passthrough-with-profile',
    label: 'Passthrough, profile available',
    profileAvailable: true,
    restricted: false,
  },
  {
    id: 'restricted-without-profile',
    label: 'Restricted, no profile',
    profileAvailable: false,
    restricted: true,
  },
  {
    id: 'restricted-with-profile',
    label: 'Restricted, profile available',
    profileAvailable: true,
    restricted: true,
  },
])

const runtimeSurfaceRestrictionSources = deepFreeze(
  runtimeSurfaceDescriptors.reduce<Record<RuntimeSurfaceId, PrivacySurfaceId[]>>((acc, descriptor) => {
    acc[descriptor.id] = privacySurfaceDescriptors
      .filter((surface) => surface.runtimeSurfaceIds.includes(descriptor.id))
      .map((surface) => surface.id)

    return acc
  }, {} as Record<RuntimeSurfaceId, PrivacySurfaceId[]>)
)

export const getRuntimeSurfaceRestrictionSources = (runtimeSurfaceId: RuntimeSurfaceId): readonly PrivacySurfaceId[] =>
  runtimeSurfaceRestrictionSources[runtimeSurfaceId]

const deriveSurfaceState = (
  runtimeSurfaceId: RuntimeSurfaceId,
  browserFamily: BrowserRuntimeFamily,
  profileAvailable: boolean,
  restricted: boolean
): Readonly<{ state: RuntimeSurfaceState; reason: RuntimeSurfaceStateReason }> => {
  const supportLevel = getRuntimeSurfaceSupport(runtimeSurfaceId, browserFamily)

  if (supportLevel === 'none') {
    return { state: 'disabled', reason: 'browser-unsupported' }
  }

  switch (runtimeSurfaceId) {
    case 'navigatorIdentity':
      return restricted ? { state: 'restricted', reason: 'restricted-by-policy' } : { state: 'enabled', reason: 'available' }
    case 'screen':
    case 'webgl':
    case 'intl':
    case 'canvas':
    case 'audio':
    case 'timezone':
    case 'domRect':
    case 'textMetrics':
    case 'mathFingerprint':
    case 'speechVoices':
    case 'webrtc':
    case 'battery':
      return profileAvailable ? { state: 'enabled', reason: 'available' } : { state: 'disabled', reason: 'profile-required' }
    case 'webGpu':
      if (!profileAvailable) {
        return { state: 'disabled', reason: 'profile-required' }
      }

      return restricted ? { state: 'restricted', reason: 'restricted-by-policy' } : { state: 'enabled', reason: 'available' }
    case 'mediaDevices':
    case 'fonts':
    case 'permissions':
    case 'pdfViewer':
      if (restricted) {
        return { state: 'restricted', reason: 'restricted-by-policy' }
      }

      return profileAvailable ? { state: 'enabled', reason: 'available' } : { state: 'disabled', reason: 'profile-required' }
    default: {
      const _exhaustive: never = runtimeSurfaceId
      return _exhaustive
    }
  }
}

const isRestrictedByPolicy = (runtimeSurfaceId: RuntimeSurfaceId, privacyPolicy: PrivacySurfacePolicy): boolean =>
  getRuntimeSurfaceRestrictionSources(runtimeSurfaceId).some((surfaceId) => privacyPolicy[surfaceId] === 'restricted')

export const buildRuntimePlanSnapshot = (
  browserFamily: BrowserRuntimeFamily,
  privacyPolicy: PrivacySurfacePolicy,
  profileAvailable: boolean
): RuntimePlanSnapshot => {
  return runtimeSurfaceDescriptors.map((descriptor) => {
    const contract = getRuntimeSurfaceContract(descriptor.id)
    const restrictionSources = getRuntimeSurfaceRestrictionSources(descriptor.id)
    const restricted = contract.restrictionSupported && isRestrictedByPolicy(descriptor.id, privacyPolicy)
    const current = deriveSurfaceState(descriptor.id, browserFamily, profileAvailable, restricted)

    return {
      runtimeSurfaceId: descriptor.id,
      title: descriptor.title,
      supportLevel: getRuntimeSurfaceSupport(descriptor.id, browserFamily),
      restrictionSources,
      currentState: current.state,
      currentReason: current.reason,
      scenarios: scenarioInputs.map((scenario) => {
        const derived = deriveSurfaceState(
          descriptor.id,
          browserFamily,
          scenario.profileAvailable,
          contract.restrictionSupported && scenario.restricted
        )

        return {
          id: scenario.id,
          label: scenario.label,
          profileAvailable: scenario.profileAvailable,
          restricted: scenario.restricted,
          state: derived.state,
          reason: derived.reason,
        }
      }),
    }
  })
}

export const runtimeSurfaceStateLabels: Readonly<Record<RuntimeSurfaceState, string>> = deepFreeze({
  enabled: 'enabled',
  restricted: 'restricted',
  disabled: 'disabled',
})

export const runtimeSurfaceStateReasonLabels: Readonly<Record<RuntimeSurfaceStateReason, string>> = deepFreeze({
  available: 'available',
  'restricted-by-policy': 'restricted by policy',
  'profile-required': 'requires active profile',
  'browser-unsupported': 'unsupported in this browser family',
})
