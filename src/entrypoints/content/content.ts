// ⚠ DO NOT IMPORT ANYTHING EXCEPT TYPES HERE DUE THE `import()` ERRORS ⚠

// Fallback path only: this script is registered only on browsers that do not support
// dynamic MAIN-world registration for the injected script.

;(() => {
  const scriptId = __UNIQUE_INJECT_FILENAME__
  let observer: MutationObserver | undefined

  const cleanup = (): void => {
    observer?.disconnect()
    observer = undefined
  }

  const inject = (): boolean => {
    if (document.getElementById(scriptId)) {
      cleanup()
      return true
    }

    const parent = document.head || document.documentElement
    if (!parent) {
      return false
    }

    const script = document.createElement('script')
    script.type = 'module'
    script.setAttribute('id', scriptId)
    script.src = chrome.runtime.getURL(__UNIQUE_INJECT_FILENAME__)
    script.addEventListener('load', () => script.remove(), { once: true })
    script.addEventListener('error', () => script.remove(), { once: true })

    parent.prepend(script)
    cleanup()
    return true
  }

  try {
    if (inject()) {
      return
    }

    observer = new MutationObserver(() => {
      inject()
    })

    observer.observe(document, { childList: true, subtree: true })
    document.addEventListener(
      'readystatechange',
      () => {
        if (document.readyState !== 'loading') {
          inject()
        }
      },
      { once: true }
    )
  } catch (err) {
    cleanup()
    console.warn('🧨 RUA: An error occurred in the content script', err)
  }
})()
