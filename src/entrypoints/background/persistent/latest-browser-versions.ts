import type { DeepReadonly } from '~/types'

type State = {
  versions: Partial<{
    chrome: number
    firefox: number
    opera: number
    safari: number
    edge: number
  }>
  updatedAt?: number
}

export type ReadonlyVersionsState = DeepReadonly<State['versions']>

const bundledVersions = Object.freeze({
  chrome: 138,
  firefox: 140,
  opera: 119,
  safari: 18,
  edge: 138,
}) satisfies State['versions']

export default class {
  async update(): Promise<void> {
    return
  }

  async get(): Promise<readonly [ReadonlyVersionsState, Readonly<Date> | undefined]> {
    return [bundledVersions, undefined]
  }

  async clear(): Promise<void> {
    return
  }
}
