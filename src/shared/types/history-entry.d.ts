import type { DeepReadonly } from '~/types'
import type { ReadonlyUserAgentState } from './user-agent-state'
import type { ReadonlySettingsState } from './settings'

type UserAgentHistoryEntry = {
  id: string
  addedAt: string
  snapshot: ReadonlyUserAgentState
  settingsSnapshot?: ReadonlySettingsState
}

export type ReadonlyUserAgentHistoryEntry = DeepReadonly<UserAgentHistoryEntry>
