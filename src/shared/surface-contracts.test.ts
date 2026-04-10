import { describe, expect, it } from 'vitest'
import { getRuntimeSurfaceContract, runtimeSurfaceContracts } from './surface-contracts'
import { runtimeSurfaceDescriptors } from './surface-catalog'
import { privacySurfaceDescriptors } from './privacy-surfaces'

describe('runtimeSurfaceContracts', () => {
  it('has a contract for every runtime surface descriptor', () => {
    expect(runtimeSurfaceContracts).toHaveLength(runtimeSurfaceDescriptors.length)

    for (const descriptor of runtimeSurfaceDescriptors) {
      expect(getRuntimeSurfaceContract(descriptor.id).runtimeSurfaceId).toBe(descriptor.id)
    }
  })

  it('only maps privacy-controlled surfaces to contracts that support restriction', () => {
    for (const privacyDescriptor of privacySurfaceDescriptors) {
      for (const runtimeSurfaceId of privacyDescriptor.runtimeSurfaceIds) {
        expect(getRuntimeSurfaceContract(runtimeSurfaceId).restrictionSupported).toBe(true)
      }
    }
  })
})
