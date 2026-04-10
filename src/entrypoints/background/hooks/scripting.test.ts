import { afterEach, describe, expect, test, vi } from 'vitest'
import { registerContentScripts } from './scripting'

describe('registerContentScripts', () => {
  afterEach(() => {
    delete (global as { chrome: unknown }).chrome
  })

  test('does not fail when managed scripts were not registered yet', async () => {
    const getRegisteredContentScripts = vi.fn().mockResolvedValue([])
    const unregisterContentScripts = vi.fn()
    const registerContentScriptsMock = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(global, 'chrome', {
      value: {
        scripting: {
          getRegisteredContentScripts,
          unregisterContentScripts,
          registerContentScripts: registerContentScriptsMock,
        },
      },
      configurable: true,
    })

    await registerContentScripts()

    expect(getRegisteredContentScripts).toHaveBeenCalledTimes(1)
    expect(getRegisteredContentScripts).toHaveBeenCalledWith({ ids: ['content', 'inject'] })
    expect(unregisterContentScripts).not.toHaveBeenCalled()
    expect(registerContentScriptsMock).toHaveBeenCalledTimes(1)
    expect(registerContentScriptsMock).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'inject', world: 'MAIN' }),
    ])
  })

  test('unregisters only scripts that are actually present', async () => {
    const getRegisteredContentScripts = vi.fn().mockResolvedValue([{ id: 'inject' }])
    const unregisterContentScripts = vi.fn().mockResolvedValue(undefined)
    const registerContentScriptsMock = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(global, 'chrome', {
      value: {
        scripting: {
          getRegisteredContentScripts,
          unregisterContentScripts,
          registerContentScripts: registerContentScriptsMock,
        },
      },
      configurable: true,
    })

    await registerContentScripts()

    expect(unregisterContentScripts).toHaveBeenCalledTimes(1)
    expect(unregisterContentScripts).toHaveBeenCalledWith({ ids: ['inject'] })
    expect(registerContentScriptsMock).toHaveBeenCalledTimes(1)
    expect(registerContentScriptsMock).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'inject', world: 'MAIN' }),
    ])
  })
})
