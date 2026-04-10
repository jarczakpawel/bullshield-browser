import type {
  PartialSettingsState,
  ReadonlySettingsState,
  ReadonlyUserAgentHistoryEntry,
  ReadonlyUserAgentState,
} from '../types'

const sign: Readonly<string> = 'rua-proto-v2'

export type HandlersMap = {
  ping: <T extends Array<unknown>>(...args: T) => T
  version: () => string
  currentUserAgent: () => Promise<Readonly<string> | undefined>
  currentUserAgentState: () => Promise<ReadonlyUserAgentState | undefined>
  renewUserAgent: () => Promise<Readonly<string>>
  settings: () => Promise<ReadonlySettingsState>
  updateSettings: (upd: PartialSettingsState) => Promise<ReadonlySettingsState>
  isApplicableForDomain: (domain: string) => Promise<boolean>
  refreshActiveTab: (tabId: number) => Promise<void>
  historyList: () => Promise<ReadonlyArray<ReadonlyUserAgentHistoryEntry>>
  addCurrentToHistory: () => Promise<ReadonlyUserAgentHistoryEntry>
  applyHistoryEntry: (id: string) => Promise<ReadonlyUserAgentState>
  removeHistoryEntry: (id: string) => Promise<ReadonlyArray<ReadonlyUserAgentHistoryEntry>>
  clearHistory: () => Promise<void>
}

type HandlerName = keyof HandlersMap

type HandlerParams<T extends HandlerName> = T extends keyof HandlersMap ? Parameters<HandlersMap[T]> : never

type HandlerResult<T extends HandlerName> = T extends keyof HandlersMap ? Awaited<ReturnType<HandlersMap[T]>> : never

type Envelope<TMode extends 'request' | 'response', TName extends HandlerName = HandlerName> = {
  readonly sign: string
  readonly batch: Partial<{
    [K in TName]: TMode extends 'request' ? HandlerParams<K> | null : Awaited<HandlerResult<K>> | undefined
  }>
}

export async function send<THandlerNames extends HandlerName>(
  requests: {
    [K in THandlerNames]?: HandlerParams<K>
  },
  retryAttempts: number = 5
): Promise<{ [K in THandlerNames]: HandlerResult<K> | Error }> {
  const batch: Envelope<'request', THandlerNames> = {
    sign,
    batch: { ...requests },
  }

  for (const name in batch.batch) {
    if (batch.batch[name] === undefined) {
      batch.batch[name] = null
    }
  }

  const maxAttempts = Math.max(1, retryAttempts)
  let response: Envelope<'response', THandlerNames> | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      await new Promise((resolve) => setTimeout(resolve, 50 * attempt))
    }

    try {
      response = await chrome.runtime.sendMessage<
        Envelope<'request', THandlerNames>,
        Envelope<'response', THandlerNames>
      >(batch)
    } catch (err) {
      if (attempt < maxAttempts) {
        continue
      }

      throw err
    }

    if (chrome.runtime.lastError) {
      if (attempt < maxAttempts) {
        continue
      }

      throw new Error(chrome.runtime.lastError.message)
    } else if (typeof response !== 'object' || response.sign !== sign) {
      throw new Error('Wrong or missing envelope signature')
    }

    break
  }

  if (!response) {
    throw new Error('No response received (background page may be unloaded)')
  }

  return response.batch as { [K in THandlerNames]: HandlerResult<K> }
}

export function listen<TMode extends 'complete' | 'partial' = 'complete'>(
  handlers: TMode extends 'partial' ? Partial<HandlersMap> : HandlersMap
): void {
  chrome.runtime.onMessage.addListener(
    (message: Envelope<'request'>, _, reply: (response: Envelope<'response'>) => void | true): void | true => {
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message)
      } else if (typeof message !== 'object' || message.sign !== sign) {
        console.warn('Wrong or missing envelope signature', message)

        return
      }

      ;(async () => {
        const promises = Object.entries(message.batch).map(async ([key, args]) => {
          const handlerName = key as HandlerName
          const handler = handlers[handlerName] as ((..._: unknown[]) => Promise<unknown> | unknown) | undefined

          if (handler) {
            try {
              const result = await handler(...(args ?? []))
              return [handlerName, result]
            } catch (error) {
              return [handlerName, error instanceof Error ? error : new Error(String(error))]
            }
          }

          return [handlerName, undefined]
        })

        const batch = (await Promise.allSettled(promises)).reduce<Envelope<'response'>['batch']>((acc, result) => {
          if (result.status === 'fulfilled') {
            const [handlerName, value] = result.value

            acc[handlerName as HandlerName] = value as never
          } else if (result.status === 'rejected') {
            const [handlerName, error] = result.reason

            acc[handlerName as HandlerName] = error as never
          }

          return acc
        }, {})

        reply({ sign, batch })
      })()

      return true
    }
  )
}
