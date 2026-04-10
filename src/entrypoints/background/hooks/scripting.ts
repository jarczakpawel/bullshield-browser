import RegisteredContentScript = chrome.scripting.RegisteredContentScript

const common: Omit<RegisteredContentScript, 'id'> = {
  matches: ['<all_urls>'],
  allFrames: true,
  matchOriginAsFallback: true,
  runAt: 'document_start',
}

const content: RegisteredContentScript = { ...common, id: 'content', js: ['content.js'] }
const inject: RegisteredContentScript = { ...common, id: 'inject', js: [__UNIQUE_INJECT_FILENAME__] }
const managedScriptIds = ['content', 'inject'] as const

const isCapabilityErrorFor = (err: unknown, property: string): boolean => {
  if (!(err instanceof Error)) {
    return false
  }

  const message = err.message.toLowerCase()
  return message.includes(property.toLowerCase()) && (message.includes('unexpected property') || message.includes('invalid value'))
}

const isNonexistentScriptIdError = (err: unknown): boolean => {
  return err instanceof Error && err.message.toLowerCase().includes('nonexistent script id')
}

const withoutMatchOriginAsFallback = (script: RegisteredContentScript): RegisteredContentScript => {
  const rest = { ...script }
  delete rest.matchOriginAsFallback
  return rest
}

async function unregisterManagedContentScripts(): Promise<void> {
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [...managedScriptIds] })
    const existingIds = registered
      .map((script) => script.id)
      .filter((id): id is (typeof managedScriptIds)[number] => managedScriptIds.includes(id as never))

    if (existingIds.length > 0) {
      await chrome.scripting.unregisterContentScripts({ ids: existingIds })
    }
  } catch (err) {
    if (!isNonexistentScriptIdError(err)) {
      throw err
    }
  }
}

async function registerInjectInMainWorld(): Promise<void> {
  try {
    await chrome.scripting.registerContentScripts([{ ...inject, world: 'MAIN' }])
  } catch (err) {
    if (!isCapabilityErrorFor(err, 'matchOriginAsFallback')) {
      throw err
    }

    await chrome.scripting.registerContentScripts([{ ...withoutMatchOriginAsFallback(inject), world: 'MAIN' }])
  }
}

async function registerFallbackContentScript(): Promise<void> {
  try {
    await chrome.scripting.registerContentScripts([content])
  } catch (err) {
    if (!isCapabilityErrorFor(err, 'matchOriginAsFallback')) {
      throw err
    }

    await chrome.scripting.registerContentScripts([withoutMatchOriginAsFallback(content)])
  }
}

export async function registerContentScripts() {
  await unregisterManagedContentScripts()

  try {
    await registerInjectInMainWorld()
  } catch (err) {
    if (!isCapabilityErrorFor(err, 'world')) {
      throw err
    }

    await registerFallbackContentScript()
  }
}
