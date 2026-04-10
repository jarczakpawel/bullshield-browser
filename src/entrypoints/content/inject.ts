// ⚠ DO NOT IMPORT ANYTHING EXCEPT TYPES HERE DUE THE `import()` ERRORS ⚠
import type { ContentScriptPayload } from '~/shared/types'

;(() => {
  const key = __UNIQUE_HEADER_KEY_NAME__.toLowerCase()
  const cookieName = `${key.replace(/[^a-z0-9]/g, '_')}_payload`
  const payloadMetaCookieName = `${cookieName}_meta`
  const payloadChunkCookiePrefix = `${cookieName}_part_`
  const maxPayloadChunks = 32
  const startupFlag = `__${cookieName}_applied__`
  const wrappedGpuAdapters = new WeakMap<object, object>()
  const wrappedGpuDevices = new WeakMap<object, object>()
  const observedRealmDocuments = new WeakSet<Document>()
  const appliedRealmSurfaces = new WeakMap<Document, Set<RuntimeSurfaceId>>()
  const trackedIframeLoadListeners = new WeakSet<HTMLIFrameElement>()

  const nativeToString = Function.prototype.toString
  const nativeCall = Function.prototype.call
  const nativeDefineProperty = Object.defineProperty
  const nativeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor
  const nativeReflectOwnKeys = Reflect.ownKeys
  type AnyFn = (...args: never[]) => unknown
  type CloakSource = object | { name?: unknown; length?: unknown; prototype?: unknown }
  const cloakedFns = new WeakMap<object, { name: string; length: number }>()

  const cloak = <T extends object>(proxy: T, original: CloakSource): T => {
    const source = original as { name?: unknown; length?: unknown; prototype?: unknown }
    const m = {
      name: typeof source.name === 'string' ? source.name : '',
      length: typeof source.length === 'number' ? source.length : 0,
    }
    cloakedFns.set(proxy, m)
    try {
      nativeDefineProperty(proxy, 'name', { value: m.name, configurable: true })
      nativeDefineProperty(proxy, 'length', { value: m.length, configurable: true })
      if (source.prototype !== undefined)
        nativeDefineProperty(proxy, 'prototype', { value: source.prototype, writable: true, configurable: false })
    } catch { void 0 }
    return proxy
  }

  ;(() => {
    const patched = new Proxy(nativeToString, {
      apply(target, self: unknown) {
        if ((typeof self === 'function' || (typeof self === 'object' && self !== null)) && cloakedFns.has(self)) {
          const m = cloakedFns.get(self)!
          return `function ${m.name}() { [native code] }`
        }
        return nativeCall.call(target, self)
      },
    })
    cloakedFns.set(patched, { name: 'toString', length: 0 })
    nativeDefineProperty(Function.prototype, 'toString', { value: patched, writable: true, configurable: true })
  })()

  // Capture native Intl.DateTimeFormat BEFORE any surface patching.
  // Used by applyTimezoneSurface for DST-aware offset computation via formatToParts().
  const nativeDateTimeFormat: typeof Intl.DateTimeFormat | undefined =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat : undefined

  // Idempotency guard for audio noise: each Float32Array is noised at most once
  // regardless of how many times getChannelData() is called for the same channel.
  const noisedAudioChannels = new WeakMap<Float32Array, true>()

  type FingerprintProfile = NonNullable<ContentScriptPayload['current']['fingerprint']>
  type PrivacySurfaceId = keyof ContentScriptPayload['privacyPolicy']
  type SurfaceSpoofMode = 'random' | 'real' | 'off'
  type LocaleSpoofMode = 'random' | 'real' | 'static'
  type TimezoneSpoofMode = 'random' | 'real' | 'off' | 'static'
  type CssMediaSpoofMode = 'random' | 'real' | 'static'
  type RuntimeSurfaceId =
    | 'navigatorIdentity'
    | 'screen'
    | 'webgl'
    | 'webGpu'
    | 'mediaDevices'
    | 'fonts'
    | 'permissions'
    | 'pdfViewer'
    | 'intl'
    | 'canvas'
    | 'audio'
    | 'timezone'
    | 'domRect'
    | 'textMetrics'
    | 'mathFingerprint'
    | 'speechVoices'
    | 'webrtc'
    | 'battery'
    | 'browserCapabilities'
  type RuntimeSurfaceState = 'enabled' | 'restricted' | 'disabled'
  type SharedRuntimeSurfaceId = keyof ContentScriptPayload['runtime']['surfaceSupportLevels']
  type BrowserSupportLevel = ContentScriptPayload['runtime']['surfaceSupportLevels'][SharedRuntimeSurfaceId]
  type DeclaredSupportLevels =
    Readonly<Record<SharedRuntimeSurfaceId, BrowserSupportLevel>> &
    Readonly<{ browserCapabilities: BrowserSupportLevel }>
  type SurfaceContext = {
    readonly payload: ContentScriptPayload
    readonly profile?: FingerprintProfile
    readonly policy: ContentScriptPayload['privacyPolicy']
    readonly fingerprintModes: Readonly<Record<string, SurfaceSpoofMode>>
    readonly localeMode: LocaleSpoofMode
    readonly localePreset: string
    readonly timezoneMode: TimezoneSpoofMode
    readonly timezonePreset: string
    readonly cssMediaQuery: Readonly<{
      mode: CssMediaSpoofMode
      preset: string
    }>
  }
  type BrowserRuntimeFamily = ContentScriptPayload['runtime']['hostBrowserFamily']
  type RuntimeEnvironment = {
    readonly hostBrowserFamily: BrowserRuntimeFamily
    readonly secureContext: boolean
    readonly declaredSupportLevels: DeclaredSupportLevels
    readonly surfaceSupport: Readonly<Record<RuntimeSurfaceId, boolean>>
    // viability is informational for local hide/remove decisions only.
    // It does not globally disable browserCapabilities.
    readonly viability: {
      readonly canHideWindowCookieStore: boolean
      readonly canHideNavigatorUserAgentData: boolean
    }
  }
  type WindowRealm = Window & typeof globalThis
  type RuntimePlan = SurfaceContext & {
    readonly environment: RuntimeEnvironment
    readonly surfaceStates: Readonly<Record<RuntimeSurfaceId, RuntimeSurfaceState>>
  }
  type SurfaceDefinition = {
    readonly id: RuntimeSurfaceId
    readonly shouldApply: (plan: RuntimePlan) => boolean
    readonly apply: (realm: WindowRealm, plan: RuntimePlan) => void
  }

  {
    const markerHost = globalThis as typeof globalThis & Record<string, unknown>

    if (markerHost[startupFlag] === true) {
      return
    }

    markerHost[startupFlag] = true
  }

  const decodePayload = (value: string): ContentScriptPayload | undefined => {
    if (!value) {
      return
    }

    try {
      const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
      const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
      return JSON.parse(atob(padded))
    } catch {
      return
    }
  }

  const cookieMap = (): Map<string, string> => {
    const result = new Map<string, string>()

    for (const part of document.cookie.split(';')) {
      const trimmed = part.trim()

      if (!trimmed) {
        continue
      }

      const eqIndex = trimmed.indexOf('=')

      if (eqIndex <= 0) {
        continue
      }

      result.set(trimmed.slice(0, eqIndex), trimmed.slice(eqIndex + 1))
    }

    return result
  }

  const extractPayloadFromCookie = (): ContentScriptPayload | undefined => {
    const cookies = cookieMap()
    const legacy = cookies.get(cookieName)

    if (legacy) {
      return decodePayload(legacy)
    }

    const partsCountRaw = cookies.get(payloadMetaCookieName)
    const partsCount = partsCountRaw ? Number.parseInt(partsCountRaw, 10) : 0

    if (!Number.isFinite(partsCount) || partsCount <= 0 || partsCount > maxPayloadChunks) {
      return
    }

    let serialized = ''

    for (let index = 0; index < partsCount; index++) {
      const part = cookies.get(`${payloadChunkCookiePrefix}${index}`)

      if (!part) {
        return
      }

      serialized += part
    }

    return decodePayload(serialized)
  }

  const payloadCookiePaths = (): readonly string[] => {
    const normalizedPath = (() => {
      const path = location.pathname || '/'

      if (path === '/') {
        return '/'
      }

      return path.endsWith('/') ? path.slice(0, -1) || '/' : path
    })()

    const paths = new Set<string>(['/'])

    if (normalizedPath !== '/') {
      const segments = normalizedPath.split('/').filter(Boolean)
      let current = ''

      for (const segment of segments) {
        current += `/${segment}`
        paths.add(current)
      }
    }

    return Array.from(paths).sort((left, right) => right.length - left.length)
  }

  const clearPayloadCookie = (): void => {
    for (const cookiePath of payloadCookiePaths()) {
      const names = [cookieName, payloadMetaCookieName, ...Array.from({ length: maxPayloadChunks }, (_, index) => `${payloadChunkCookiePrefix}${index}`)]

      for (const name of names) {
        const attrs = [`${name}=`, 'Max-Age=0', `Path=${cookiePath}`, 'SameSite=Lax']

        if (location.protocol === 'https:') {
          attrs.push('Secure')
        }

        document.cookie = attrs.join('; ')
      }
    }
  }

  const findAndRemoveScriptTag = (): boolean => {
    const injectedScript = document.getElementById(__UNIQUE_INJECT_FILENAME__) as HTMLScriptElement | null
    if (injectedScript) {
      injectedScript.remove()
      return true
    }

    return false
  }

  const overload = <T>(
    t: T,
    prop: PropertyKey,
    value: unknown,
    options: { force?: boolean; configurable?: boolean; writable?: boolean } = {
      force: false,
      configurable: false,
      writable: false,
    }
  ): void => {
    let target: T = t

    try {
      while (target !== null) {
        const descriptor = nativeGetOwnPropertyDescriptor(target as object, prop)

        if (descriptor && descriptor.configurable) {
          const newAttributes: PropertyDescriptor = { configurable: options.configurable, enumerable: true }

          if (descriptor.get) {
            const getter = typeof value === 'function' ? (value as () => unknown) : () => value
            if (typeof value === 'function' && typeof descriptor.get === 'function') cloak(value as AnyFn, descriptor.get as AnyFn)
            newAttributes.get = getter
          } else {
            if (typeof value === 'function' && typeof descriptor.value === 'function') cloak(value as AnyFn, descriptor.value as AnyFn)
            newAttributes.value = value
            newAttributes.writable = options.writable
          }

          nativeDefineProperty(target as object, prop, newAttributes)
        } else if (options.force && Object.getPrototypeOf(t) === Object.getPrototypeOf(target)) {
          if (typeof value === 'function') {
            const existing = Reflect.get(target as object, prop)
            if (typeof existing === 'function') cloak(value as AnyFn, existing as AnyFn)
          }
          nativeDefineProperty(target as object, prop, {
            value,
            configurable: options.configurable,
            enumerable: true,
            writable: options.writable,
          })
        }

        target = Object.getPrototypeOf(target)
      }
    } catch {
      // ignore
    }
  }

  // safePropDelete — best-effort property removal.
  //
  // Three-phase strategy:
  //   1. delete operator (removes own property entirely — fastest, usually works)
  //   2. defineProperty with value:undefined + non-enumerable (when non-configurable)
  //   3. defineProperty with getter → undefined (last resort for accessor props)
  //
  // LIMITATION: if the property lives on a prototype rather than the instance,
  // delete on the instance has no effect.  For Web IDL attributes (cookieStore,
  // userAgentData, etc.) use overload() with force:true to install an own-shadow
  // instead, or patch the relevant prototype directly.
  // For properties that must also be hidden from descriptor probes, use
  // safePropDeleteCritical() which registers the prop in criticalHideMap.
  const safePropDelete = (obj: object, prop: string): void => {
    try {
      if (delete (obj as Record<string, unknown>)[prop]) return
    } catch { void 0 }
    const desc = nativeGetOwnPropertyDescriptor(obj, prop)
    if (!desc) return
    try {
      nativeDefineProperty(obj, prop, {
        value: undefined,
        configurable: desc.configurable ?? true,
        enumerable: false,
        writable: true,
      })
      return
    } catch { void 0 }
    try {
      nativeDefineProperty(obj, prop, {
        get: cloak(() => undefined, (desc.get as AnyFn | undefined) ?? (() => {})),
        set: desc.set,
        configurable: desc.configurable ?? true,
        enumerable: false,
      })
    } catch { void 0 }
  }

  // ---------------------------------------------------------------------------
  // Critical-prop hide infrastructure
  // Intercepts all major introspection probes so that props registered via
  // safePropDeleteCritical() appear completely absent to fingerprinters.
  //
  // Covered probes:
  //   Object.getOwnPropertyDescriptor   — single-prop descriptor lookup
  //   Object.getOwnPropertyDescriptors  — all-props descriptor dump
  //   Object.getOwnPropertyNames        — own string-key enumeration
  //   Object.hasOwn / hasOwnProperty    — own-property membership test
  //   Reflect.ownKeys                   — own symbol+string enumeration
  //
  // Only props/targets registered in criticalHideMap are affected — no broad impact.
  // ---------------------------------------------------------------------------
  const criticalHideMap = new WeakMap<object, Set<string>>()
  ;(() => {
    const _gopd  = nativeGetOwnPropertyDescriptor
    const _gopds = Object.getOwnPropertyDescriptors as (o: object) => Record<string, PropertyDescriptor>
    const _gopn  = Object.getOwnPropertyNames  as (o: object) => string[]
    const _hasOwn = Object.hasOwn              as (o: object, p: PropertyKey) => boolean
    const _ownKeys = nativeReflectOwnKeys

    // Object.getOwnPropertyDescriptor
    nativeDefineProperty(Object, 'getOwnPropertyDescriptor', {
      value: cloak(function getOwnPropertyDescriptor(obj: object, prop: PropertyKey) {
        if (typeof prop === 'string') {
          const hidden = criticalHideMap.get(obj)
          if (hidden?.has(prop)) return undefined
        }
        return _gopd(obj, prop)
      } as typeof Object.getOwnPropertyDescriptor, _gopd),
      writable: true, configurable: true,
    })

    // Object.getOwnPropertyDescriptors
    nativeDefineProperty(Object, 'getOwnPropertyDescriptors', {
      value: cloak(function getOwnPropertyDescriptors(obj: object) {
        const all = _gopds(obj)
        const hidden = criticalHideMap.get(obj)
        if (!hidden || hidden.size === 0) return all
        for (const k of hidden) delete all[k]
        return all
      } as typeof Object.getOwnPropertyDescriptors, _gopds as AnyFn),
      writable: true, configurable: true,
    })

    // Object.getOwnPropertyNames
    nativeDefineProperty(Object, 'getOwnPropertyNames', {
      value: cloak(function getOwnPropertyNames(obj: object) {
        const names = _gopn(obj)
        const hidden = criticalHideMap.get(obj)
        if (!hidden || hidden.size === 0) return names
        return names.filter((k) => !hidden.has(k))
      } as typeof Object.getOwnPropertyNames, _gopn as AnyFn),
      writable: true, configurable: true,
    })

    // Object.hasOwn
    if (typeof _hasOwn === 'function') {
      nativeDefineProperty(Object, 'hasOwn', {
        value: cloak(function hasOwn(obj: object, prop: PropertyKey) {
          if (typeof prop === 'string') {
            const hidden = criticalHideMap.get(obj)
            if (hidden?.has(prop)) return false
          }
          return _hasOwn(obj, prop)
        } as typeof Object.hasOwn, _hasOwn as AnyFn),
        writable: true, configurable: true,
      })
    }

    // Object.prototype.hasOwnProperty
    const _hop = Object.prototype.hasOwnProperty
    nativeDefineProperty(Object.prototype, 'hasOwnProperty', {
      value: cloak(function hasOwnProperty(this: object, prop: PropertyKey) {
        if (typeof prop === 'string') {
          const hidden = criticalHideMap.get(this)
          if (hidden?.has(prop)) return false
        }
        return _hop.call(this, prop)
      } as typeof Object.prototype.hasOwnProperty, _hop),
      writable: true, configurable: true,
    })

    // Reflect.ownKeys
    nativeDefineProperty(Reflect, 'ownKeys', {
      value: cloak(function ownKeys(obj: object) {
        const keys = _ownKeys(obj)
        const hidden = criticalHideMap.get(obj)
        if (!hidden || hidden.size === 0) return keys
        return keys.filter((k) => !(typeof k === 'string' && hidden.has(k)))
      } as typeof Reflect.ownKeys, _ownKeys as AnyFn),
      writable: true, configurable: true,
    })
  })()

  // safePropDeleteCritical — like safePropDelete, but also registers the prop in
  // criticalHideMap so all introspection probes (descriptor, names, hasOwn, ownKeys)
  // report the prop as absent.
  //
  // IMPORTANT: the prop is only registered in criticalHideMap if the own descriptor
  // is verifiably gone after safePropDelete().  If delete didn't really work (e.g.
  // non-configurable property still present), we do NOT register it — creating a
  // fake "hidden" state on top of a still-present own descriptor produces an
  // incoherent fingerprint that detection tools actively probe for.
  const safePropDeleteCritical = (obj: object, prop: string): void => {
    safePropDelete(obj, prop)
    // Hard-validate that the own descriptor is truly gone before registering.
    const remaining = nativeGetOwnPropertyDescriptor(obj, prop)
    if (remaining !== undefined) {
      // delete didn't fully succeed — do NOT hide; a half-hidden prop is worse
      // than a fully-present one from a coherence perspective.
      return
    }
    let hidden = criticalHideMap.get(obj)
    if (!hidden) { hidden = new Set(); criticalHideMap.set(obj, hidden) }
    hidden.add(prop)
  }

  const createResolvedOptionsProxy = (
    original: Intl.DateTimeFormat['resolvedOptions'],
    locale: string
  ): Intl.DateTimeFormat['resolvedOptions'] => {
    return new Proxy(original, {
      apply(target, self, args) {
        const current = Reflect.apply(target, self, args)
        return { ...current, locale }
      },
    })
  }

  const createMediaDeviceInfoLike = (
    base: Readonly<{ kind: string; label: string; deviceId: string; groupId: string }>,
    withLabels: boolean
  ): MediaDeviceInfo => {
    const label = withLabels ? base.label : ''
    const groupId = withLabels ? base.groupId : ''

    const realProto = typeof MediaDeviceInfo === 'function'
      ? MediaDeviceInfo.prototype
      : null

    const obj = realProto
      ? Object.create(realProto)
      : Object.create(null)

    const props: Record<string, PropertyDescriptor> = {
      kind:     { get: cloak(() => base.kind, nativeGetOwnPropertyDescriptor(realProto || {}, 'kind')?.get || (() => '')), enumerable: true, configurable: true },
      label:    { get: cloak(() => label, nativeGetOwnPropertyDescriptor(realProto || {}, 'label')?.get || (() => '')), enumerable: true, configurable: true },
      deviceId: { get: cloak(() => base.deviceId, nativeGetOwnPropertyDescriptor(realProto || {}, 'deviceId')?.get || (() => '')), enumerable: true, configurable: true },
      groupId:  { get: cloak(() => groupId, nativeGetOwnPropertyDescriptor(realProto || {}, 'groupId')?.get || (() => '')), enumerable: true, configurable: true },
      toJSON:   { value: cloak(function(this: Record<string, unknown>) {
        return { kind: base.kind, label, deviceId: base.deviceId, groupId }
      }, (realProto?.toJSON || function toJSON() { return {} })), writable: true, configurable: true },
    }
    Object.defineProperties(obj, props)

    return obj as MediaDeviceInfo
  }

  type LocalFontDataLike = {
    family: string
    fullName: string
    postscriptName: string
    style: string
    blob: () => Promise<Blob>
  }

  const SINGLE_STYLE_FONTS = new Set([
    'apple color emoji', 'apple symbols', 'marlett', 'noto color emoji', 'opensymbol',
    'segoe fluent icons', 'segoe mdl2 assets', 'segoe ui emoji', 'segoe ui historic',
    'segoe ui symbol', 'symbol', 'webdings', 'wingdings', 'zapf dingbats',
  ])

  const MULTI_WEIGHT_FONTS = new Set([
    'arial', 'arial nova', 'avenir', 'avenir next', 'bahnschrift', 'calibri', 'cantarell', 'courier new',
    'dejavu sans', 'dejavu serif', 'georgia', 'helvetica', 'helvetica neue', 'inter',
    'liberation sans', 'liberation serif', 'menlo', 'noto sans', 'noto serif', 'roboto',
    'roboto condensed', 'roboto flex', 'roboto mono', 'sf compact', 'sf pro display', 'sf pro rounded', 'sf pro text',
    'segoe ui', 'segoe ui variable', 'source code pro', 'source sans 3', 'source serif 4', 'times new roman',
    'ubuntu', 'ubuntu mono', 'verdana',
  ])

  const createLocalFontDataLike = (
    family: string,
    style: string = 'Regular',
    realm: WindowRealm = window,
  ): LocalFontDataLike => {
    const styleSuffix = style === 'Regular' ? '' : style.replace(/[^a-zA-Z0-9]/g, '')
    const postscriptName = `${family.replace(/[^a-zA-Z0-9]/g, '') || 'Font'}${styleSuffix}`
    const fullName = style === 'Regular' ? family : `${family} ${style}`

    const font = {
      family,
      fullName,
      postscriptName,
      style,
      blob() {
        return Promise.resolve(new realm.Blob([], { type: 'font/ttf' }))
      },
    }

    return font
  }

  const buildLocalFontFaceLikes = (family: string, realm: WindowRealm = window): LocalFontDataLike[] => {
    const key = family.trim().toLowerCase()
    if (!key) return []

    const styles = SINGLE_STYLE_FONTS.has(key)
      ? ['Regular']
      : MULTI_WEIGHT_FONTS.has(key)
        ? ['Light', 'Regular', 'Medium', 'Semibold', 'Bold', 'Italic', 'Bold Italic']
        : /mono/i.test(family)
          ? ['Regular', 'Bold']
          : /sans|serif|display|text|ui|gothic|helvetica|roboto|noto|segoe|avenir|ubuntu|aptos|cascadia|pingfang|hiragino/i.test(family)
            ? ['Regular', 'Medium', 'Bold', 'Italic', 'Bold Italic']
            : /emoji|symbol|dingbats|icons/i.test(family)
              ? ['Regular']
              : ['Regular', 'Italic']

    return styles.map((style) => createLocalFontDataLike(family, style, realm))
  }

  type NamedArrayLike<T extends object> = {
    length: number
    item: (index: number) => T | null
    namedItem: (name: string) => T | null
    [Symbol.iterator]: () => Iterator<T>
  }

  const createNamedArrayLike = <T extends object>(
    items: readonly T[],
    getName: (item: T) => string,
    tag: string,
    extra: Record<string, unknown> = {},
    proto?: object | null,
  ): NamedArrayLike<T> => {
    const named = new Map(items.map((item) => [getName(item), item] as const))
    const targetProto = proto ?? Object.prototype
    const target = Object.create(targetProto) as NamedArrayLike<T> & Record<string, unknown>

    nativeDefineProperty(target, Symbol.toStringTag, { value: tag, configurable: true })
    nativeDefineProperty(target, 'length', { value: items.length, configurable: true, enumerable: false, writable: false })

    for (let index = 0; index < items.length; index += 1) {
      nativeDefineProperty(target, String(index), {
        value: items[index],
        configurable: true,
        enumerable: false,
        writable: false,
      })
    }

    nativeDefineProperty(target, 'item', {
      value: cloak(function item(index: number) {
        return items[index] || null
      }, { name: 'item', length: 1 }),
      configurable: true,
      enumerable: false,
      writable: true,
    })
    nativeDefineProperty(target, 'namedItem', {
      value: cloak(function namedItem(name: string) {
        return named.get(name) || null
      }, { name: 'namedItem', length: 1 }),
      configurable: true,
      enumerable: false,
      writable: true,
    })
    nativeDefineProperty(target, Symbol.iterator, {
      value: function* iterator(): Iterator<T> {
        for (const item of items) {
          yield item
        }
      },
      configurable: true,
      enumerable: false,
      writable: true,
    })

    for (const [name, value] of Object.entries(extra)) {
      nativeDefineProperty(target, name, { value, configurable: true, enumerable: false, writable: true })
    }

    return new Proxy(target as unknown as NamedArrayLike<T>, {
      get(what, prop, receiver) {
        if (typeof prop === 'string' && !/^\d+$/.test(prop) && named.has(prop)) {
          return named.get(prop)
        }

        return Reflect.get(what as object, prop, receiver)
      },
      has(what, prop) {
        return (typeof prop === 'string' && named.has(prop)) || Reflect.has(what as object, prop)
      },
      getOwnPropertyDescriptor(what, prop) {
        if (typeof prop === 'string' && named.has(prop)) {
          return {
            configurable: true,
            enumerable: false,
            writable: false,
            value: named.get(prop),
          }
        }

        return Reflect.getOwnPropertyDescriptor(what as object, prop)
      },
    })
  }

  type PermissionStatusLike = {
    readonly name?: string
    readonly state: 'granted' | 'denied' | 'prompt'
    onchange: ((this: PermissionStatus, ev: Event) => unknown) | null
    addEventListener: EventTarget['addEventListener']
    removeEventListener: EventTarget['removeEventListener']
    dispatchEvent: EventTarget['dispatchEvent']
  }

  const createPermissionStatusLike = (
    name: string,
    state: 'granted' | 'denied' | 'prompt',
    realm: WindowRealm = window
  ): PermissionStatusLike => {
    const realmPS = (realm as WindowRealm & { PermissionStatus?: { prototype?: object } }).PermissionStatus
    const realProto = realmPS?.prototype ?? null
    const base = new realm.EventTarget()
    if (realProto) {
      try { Object.setPrototypeOf(base, realProto) } catch { void 0 }
    }
    const target = base as EventTarget & Record<string, unknown>

    nativeDefineProperty(target, 'name', { get: cloak(() => name, function _name() { return '' }), enumerable: true, configurable: true })
    nativeDefineProperty(target, 'state', { get: cloak(() => state, function _state() { return 'prompt' }), enumerable: true, configurable: true })
    nativeDefineProperty(target, 'onchange', { value: null, configurable: true, writable: true })

    return target as unknown as PermissionStatusLike
  }

  const createPdfViewerCollections = (realm: WindowRealm, browser: string): {
    plugins: NamedArrayLike<object>
    mimeTypes: NamedArrayLike<object>
  } => {
    const pluginNames = (() => {
      switch (browser) {
        case 'chrome':
        case 'edge':
        case 'opera':
        case 'safari':
        case 'firefox':
          return ['PDF Viewer', 'Chrome PDF Viewer', 'Chromium PDF Viewer', 'Microsoft Edge PDF Viewer', 'WebKit built-in PDF']
        default:
          return []
      }
    })()

    const pluginArrayProto = (realm as WindowRealm & { PluginArray?: { prototype?: object } }).PluginArray?.prototype ?? Object.prototype
    const pluginProto = (realm as WindowRealm & { Plugin?: { prototype?: object } }).Plugin?.prototype ?? Object.prototype
    const mimeTypeArrayProto = (realm as WindowRealm & { MimeTypeArray?: { prototype?: object } }).MimeTypeArray?.prototype ?? Object.prototype
    const mimeTypeProto = (realm as WindowRealm & { MimeType?: { prototype?: object } }).MimeType?.prototype ?? Object.prototype

    const createMimeType = (type: string, enabledPlugin: object | null): Record<string, unknown> => {
      const mimeType = Object.create(mimeTypeProto) as Record<string, unknown>
      nativeDefineProperty(mimeType, 'type', { value: type, configurable: true, enumerable: true })
      nativeDefineProperty(mimeType, 'suffixes', { value: 'pdf', configurable: true, enumerable: true })
      nativeDefineProperty(mimeType, 'description', { value: 'Portable Document Format', configurable: true, enumerable: true })
      nativeDefineProperty(mimeType, 'enabledPlugin', { value: enabledPlugin, configurable: true, enumerable: true })
      nativeDefineProperty(mimeType, Symbol.toStringTag, { value: 'MimeType', configurable: true })
      return mimeType
    }

    const pluginsRaw: Array<Record<string, unknown>> = []

    for (const name of pluginNames) {
      const pluginMimeTypes = [createMimeType('application/pdf', null), createMimeType('text/pdf', null)]
      const plugin = createNamedArrayLike(
        pluginMimeTypes,
        (item) => String((item as Record<string, unknown>).type),
        'Plugin',
        {},
        pluginProto,
      ) as unknown as Record<string, unknown>

      nativeDefineProperty(plugin, 'name', { value: name, configurable: true, enumerable: true })
      nativeDefineProperty(plugin, 'filename', { value: 'internal-pdf-viewer', configurable: true, enumerable: true })
      nativeDefineProperty(plugin, 'description', { value: 'Portable Document Format', configurable: true, enumerable: true })
      nativeDefineProperty(plugin, 'version', { value: '', configurable: true, enumerable: true })
      nativeDefineProperty(plugin, Symbol.toStringTag, { value: 'Plugin', configurable: true })

      for (const mimeType of pluginMimeTypes) {
        nativeDefineProperty(mimeType, 'enabledPlugin', { value: plugin, configurable: true, enumerable: true })
      }

      pluginsRaw.push(plugin)
    }

    const mimeTypesRaw = [
      createMimeType('application/pdf', pluginsRaw[0] || null),
      createMimeType('text/pdf', pluginsRaw[0] || null),
    ]

    return {
      plugins: createNamedArrayLike(pluginsRaw, (item) => String((item as Record<string, unknown>).name), 'PluginArray', {
        refresh() {
          return undefined
        },
      }, pluginArrayProto),
      mimeTypes: createNamedArrayLike(mimeTypesRaw, (item) => String((item as Record<string, unknown>).type), 'MimeTypeArray', {}, mimeTypeArrayProto),
    }
  }

  const fallbackPrivacyPolicy = (payload: ContentScriptPayload): ContentScriptPayload['privacyPolicy'] => ({
    localFonts: payload.privacy.blockLocalFonts ? 'restricted' : 'passthrough',
    mediaDevices: payload.privacy.blockMediaDeviceEnumeration ? 'restricted' : 'passthrough',
    webGpu: payload.privacy.blockWebGpu ? 'restricted' : 'passthrough',
    pdfViewer: payload.privacy.hidePdfViewer ? 'restricted' : 'passthrough',
    sensitiveDeviceApis: payload.privacy.hideSensitiveDeviceApis ? 'restricted' : 'passthrough',
  })

  const defaultFingerprintModes: Readonly<Record<string, SurfaceSpoofMode>> = {
    hardwareConcurrency: 'random',
    deviceMemory: 'random',
    screen: 'random',
    fonts: 'random',
    webgl: 'random',
    canvas: 'random',
    audio: 'random',
    domRect: 'random',
    textMetrics: 'random',
    mathFingerprint: 'random',
    speechVoices: 'random',
    webrtc: 'random',
    battery: 'random',
    clientHints: 'random',
  }

  const createSurfaceContext = (payload: ContentScriptPayload): SurfaceContext => ({
    payload,
    profile: payload.current.fingerprint || undefined,
    policy: payload.privacyPolicy || fallbackPrivacyPolicy(payload),
    fingerprintModes: { ...defaultFingerprintModes, ...(payload.fingerprintModes || {}) },
    localeMode: payload.localeMode || 'random',
    localePreset: payload.localePreset || 'en-US',
    timezoneMode: payload.timezoneMode || 'random',
    timezonePreset: payload.timezonePreset || 'Europe/Warsaw',
    cssMediaQuery: {
      mode: payload.cssMediaQuery?.mode || 'real',
      preset: payload.cssMediaQuery?.preset || '1920x1080@1',
    },
  })

  const isRestricted = (context: SurfaceContext, surface: PrivacySurfaceId): boolean =>
    context.policy[surface] === 'restricted'

  // ===========================================================================
  // Capability presence matrix — browser + major version → feature present.
  // Hoisted here so it is available to viability helpers, createRuntimeEnvironment,
  // and applyBrowserCapabilitiesSurface without duplication.
  // ===========================================================================
  const BROWSER_CAP: ReadonlyMap<string, (b: string, mv: number) => boolean> = new Map([
    ['window.chrome',                  (b: string) => b === 'chrome' || b === 'edge' || b === 'opera'],
    ['window.cookieStore',             (b: string, mv: number) =>
      (b === 'chrome' && mv >= 87) || (b === 'edge' && mv >= 87) ||
      (b === 'opera' && mv >= 73) || (b === 'safari' && mv >= 17) || (b === 'firefox' && mv >= 140)],
    ['navigator.userAgentData',        (b: string, mv: number) =>
      (b === 'chrome' && mv >= 90) || (b === 'edge' && mv >= 90) || (b === 'opera' && mv >= 76)],
    ['navigator.mediaCapabilities',    (b: string, mv: number) =>
      (b === 'chrome' && mv >= 66) || (b === 'edge' && mv >= 79) ||
      (b === 'firefox' && mv >= 63) || (b === 'opera' && mv >= 53) || (b === 'safari' && mv >= 15)],
    ['workerNavigator.mediaCapabilities', (b: string, mv: number) =>
      (b === 'chrome' && mv >= 66) || (b === 'edge' && mv >= 79) ||
      (b === 'firefox' && mv >= 63) || (b === 'opera' && mv >= 53) || (b === 'safari' && mv >= 15)],
    ['navigator.gpu',                  (b: string, mv: number) =>
      (b === 'chrome' && mv >= 113) || (b === 'edge' && mv >= 113) || (b === 'opera' && mv >= 99)],
    ['workerNavigator.gpu',            (b: string, mv: number) =>
      (b === 'chrome' && mv >= 113) || (b === 'edge' && mv >= 113) || (b === 'opera' && mv >= 99)],
    ['sw.backgroundFetch',             (b: string, mv: number) => (b === 'chrome' && mv >= 74) || (b === 'edge' && mv >= 79)],
    ['sw.periodicSync',                (b: string, mv: number) => (b === 'chrome' && mv >= 80) || (b === 'edge' && mv >= 80)],
    ['sw.cookies',                     (b: string, mv: number) => (b === 'chrome' && mv >= 87) || (b === 'edge' && mv >= 87)],
    // sw.cookieStore (ServiceWorkerGlobalScope.cookieStore) blob-wrapper approach is a dead end
    // (register() rejects blob: URLs). Tracked as a future package.
  ] as const)

  const browserCapHas = (key: string, browser: string, major: number): boolean => {
    const fn = BROWSER_CAP.get(key)
    return fn ? fn(browser, major) : false
  }

  const removeNavigatorProtoProperty = (nav: Navigator & Record<string, unknown>, prop: string): void => {
    let pt: object | null = Object.getPrototypeOf(nav)
    while (pt !== null) {
      const d = nativeGetOwnPropertyDescriptor(pt, prop)
      if (d) {
        if (d.configurable) { try { delete (pt as Record<string, unknown>)[prop] } catch { void 0 } }
        break
      }
      pt = Object.getPrototypeOf(pt)
    }
  }

  const installNavigatorProtoGetter = (nav: Navigator & Record<string, unknown>, prop: string, getter: () => unknown): void => {
    const navProto = Object.getPrototypeOf(nav)
    if (!navProto) return
    const existing = nativeGetOwnPropertyDescriptor(navProto, prop)
    if (existing && 'get' in existing) {
      if (typeof existing.get === 'function') cloak(getter as AnyFn, existing.get as AnyFn)
      try {
        nativeDefineProperty(navProto, prop, {
          get: getter,
          set: undefined,
          enumerable: existing.enumerable ?? true,
          configurable: existing.configurable ?? true,
        })
      } catch { void 0 }
      return
    }
    cloak(getter as AnyFn, { name: `get ${prop}`, length: 0 })
    try {
      nativeDefineProperty(navProto, prop, {
        get: getter,
        set: undefined,
        enumerable: true,
        configurable: true,
      })
    } catch { void 0 }
  }

  // ---------------------------------------------------------------------------
  // canHideWindowCookieStore — true if the host window permits deleting cookieStore.
  //
  // Mirrors the removal order in removeWindowCookieStore():
  //   1. Own descriptor on window (Chromium) — configurable → can hide.
  //   2. No own descriptor → proto-walk — configurable → can hide.
  //   3. Property absent altogether → trivially can hide (nothing to remove).
  //   4. Descriptor found but non-configurable → cannot hide.
  // ---------------------------------------------------------------------------
  const canHideWindowCookieStore = (realm: WindowRealm): boolean => {
    const realmRec = realm as typeof realm & Record<string, unknown>
    if (!('cookieStore' in realmRec)) return true
    const ownDesc = nativeGetOwnPropertyDescriptor(realmRec, 'cookieStore')
    if (ownDesc) return ownDesc.configurable === true
    let pt: object | null = Object.getPrototypeOf(realm)
    while (pt !== null) {
      const d = nativeGetOwnPropertyDescriptor(pt, 'cookieStore')
      if (d) return d.configurable === true
      pt = Object.getPrototypeOf(pt)
    }
    return true // not found anywhere — nothing to remove
  }

  // ---------------------------------------------------------------------------
  // canHideNavigatorUserAgentData — true if Navigator.prototype.userAgentData
  // (or wherever it lives) can be deleted via proto-walk.
  //
  // Mirrors the removal logic in removeNavigatorUAD():
  //   userAgentData lives on the prototype chain (not own on navigator instance).
  //   Proto-walk: configurable → can hide; non-configurable → cannot; absent → trivially yes.
  // ---------------------------------------------------------------------------
  const canHideNavigatorUserAgentData = (navLike: Navigator): boolean => {
    if (!('userAgentData' in navLike)) return true
    let pt: object | null = Object.getPrototypeOf(navLike)
    while (pt !== null) {
      const d = nativeGetOwnPropertyDescriptor(pt, 'userAgentData')
      if (d) return d.configurable === true
      pt = Object.getPrototypeOf(pt)
    }
    return true // not found in proto chain — nothing to remove
  }

  // ---------------------------------------------------------------------------
  // personaRequiresNoCookieStore — true when the spoofed persona's capability
  // matrix says window.cookieStore should be absent.
  // ---------------------------------------------------------------------------
  const personaRequiresNoCookieStore = (context: SurfaceContext): boolean => {
    const browser = context.payload.current.browser
    const mv = context.payload.current.version.browser.major
    const fn = BROWSER_CAP.get('window.cookieStore')
    return fn ? !fn(browser, mv) : false
  }

  // ---------------------------------------------------------------------------
  // personaRequiresNoUserAgentData — true when navigator.userAgentData should
  // be absent for the spoofed persona. Mirrors the window path: only 'random'
  // mode installs the UAD getter; 'off' and 'real' both require its absence.
  // ---------------------------------------------------------------------------
  const personaRequiresNoUserAgentData = (context: SurfaceContext): boolean => {
    const browser = context.payload.current.browser
    const mv = context.payload.current.version.browser.major
    const chMode = (context.fingerprintModes['clientHints'] as SurfaceSpoofMode | undefined) ?? 'random'
    const fn = BROWSER_CAP.get('navigator.userAgentData')
    const supported = fn ? fn(browser, mv) : false

    if (chMode === 'off') {
      return true
    }

    if (chMode === 'real') {
      return !supported
    }

    return !supported
  }

  // ---------------------------------------------------------------------------
  // viabilityConflict — true when the persona requires a surface to be absent
  // but the host realm does not permit hiding it (non-configurable descriptor).
  //
  // When a conflict is detected, removal is skipped: the attempt would silently
  // fail (delete on a non-configurable descriptor is a no-op in sloppy mode,
  // throws in strict mode) and the property would remain visible regardless.
  // Skipping makes the mismatch explicit rather than attempting futile surgery.
  //
  // The second parameter selects which viability field to check; the third
  // parameter is whether the persona actually requires that surface to be absent.
  // If the persona does NOT require absence (requiresAbsence === false), the
  // check is vacuously false — no conflict, removal proceeds normally.
  // ---------------------------------------------------------------------------
  const viabilityConflict = (
    plan: RuntimePlan,
    cap: keyof RuntimeEnvironment['viability'],
    requiresAbsence: boolean,
  ): boolean => requiresAbsence && !plan.environment.viability[cap]

  const createRuntimeEnvironment = (context: SurfaceContext, realm: WindowRealm): RuntimeEnvironment => {
    const hostBrowserFamily = context.payload.runtime?.hostBrowserFamily || 'chromium'
    const declaredSupportLevels: DeclaredSupportLevels = context.payload.runtime?.surfaceSupportLevels
      ? { ...context.payload.runtime.surfaceSupportLevels, browserCapabilities: 'full' }
      : {
          navigatorIdentity: 'full',
          screen: 'full',
          webgl: 'full',
          webGpu: hostBrowserFamily === 'firefox' ? 'partial' : 'full',
          mediaDevices: 'full',
          fonts: hostBrowserFamily === 'firefox' ? 'none' : 'full',
          permissions: 'full',
          pdfViewer: 'full',
          intl: 'full',
          canvas: 'full',
          audio: 'full',
          timezone: 'full',
          domRect: 'full',
          textMetrics: 'full',
          mathFingerprint: 'full',
          speechVoices: 'full',
          webrtc: 'full',
          battery: hostBrowserFamily === 'firefox' ? 'none' : 'full',
          browserCapabilities: 'full',
        }
    const secureContext = realm.isSecureContext === true
    const hasWindowQueryLocalFonts = typeof (window as Window & { queryLocalFonts?: unknown }).queryLocalFonts === 'function'
    const hasMediaDevices = typeof navigator.mediaDevices?.enumerateDevices === 'function'
    const hasPermissionsApi = typeof navigator.permissions?.query === 'function'
    const hasPdfCollections = 'plugins' in navigator && 'mimeTypes' in navigator
    const hasWebGpuEntryPoint = 'gpu' in navigator
    const hasCanvasGetContext = typeof HTMLCanvasElement?.prototype?.getContext === 'function'

    return {
      hostBrowserFamily,
      secureContext,
      declaredSupportLevels,
      surfaceSupport: {
        navigatorIdentity: true,
        screen: typeof window.screen === 'object' && window.screen !== null,
        webgl: typeof globalThis.WebGLRenderingContext === 'function' || typeof globalThis.WebGL2RenderingContext === 'function',
        webGpu: secureContext && (hasWebGpuEntryPoint || hasCanvasGetContext),
        mediaDevices: secureContext && hasMediaDevices,
        fonts: typeof document.fonts?.check === 'function' || (secureContext && hasWindowQueryLocalFonts),
        // Permissions is a JS surface we can synthesize even when the host API is absent.
        // Keeping this support flag true avoids leaking plain 'unsupported' on Chromium hosts
        // when navigator.permissions is missing or partially disabled.
        permissions: hasPermissionsApi || hostBrowserFamily === 'chromium',
        pdfViewer: hasPdfCollections || 'pdfViewerEnabled' in navigator,
        intl: typeof Intl?.DateTimeFormat?.prototype?.resolvedOptions === 'function',
        canvas: typeof (globalThis as typeof globalThis & { CanvasRenderingContext2D?: unknown }).CanvasRenderingContext2D === 'function',
        audio: typeof (globalThis as typeof globalThis & { AudioBuffer?: unknown }).AudioBuffer !== 'undefined',
        timezone: typeof window.Date?.prototype?.getTimezoneOffset === 'function' &&
          typeof Intl?.DateTimeFormat?.prototype?.resolvedOptions === 'function',
        domRect: typeof Element.prototype.getBoundingClientRect === 'function',
        textMetrics: typeof (globalThis as typeof globalThis & { CanvasRenderingContext2D?: unknown }).CanvasRenderingContext2D === 'function',
        mathFingerprint: typeof Math.tan === 'function',
        speechVoices: typeof speechSynthesis !== 'undefined' && typeof speechSynthesis.getVoices === 'function',
        webrtc: typeof (globalThis as typeof globalThis & { RTCPeerConnection?: unknown }).RTCPeerConnection === 'function',
        battery: typeof (navigator as Navigator & { getBattery?: unknown }).getBattery === 'function',
        browserCapabilities: true,
      },
      viability: {
        canHideWindowCookieStore:      canHideWindowCookieStore(realm),
        canHideNavigatorUserAgentData: canHideNavigatorUserAgentData(realm.navigator),
      },
    }
  }

  const surfaceSupported = (environment: RuntimeEnvironment, surface: RuntimeSurfaceId): boolean =>
    environment.declaredSupportLevels[surface] !== 'none' && environment.surfaceSupport[surface] === true

  const createRuntimeSurfaceStates = (
    context: SurfaceContext,
    environment: RuntimeEnvironment
  ): Readonly<Record<RuntimeSurfaceId, RuntimeSurfaceState>> => ({
    navigatorIdentity:
      surfaceSupported(environment, 'navigatorIdentity')
        ? isRestricted(context, 'webGpu') || isRestricted(context, 'pdfViewer') || isRestricted(context, 'sensitiveDeviceApis')
          ? 'restricted'
          : 'enabled'
        : 'disabled',
    screen:
      context.fingerprintModes['screen'] === 'real'
        ? 'disabled'
        : context.profile && surfaceSupported(environment, 'screen') ? 'enabled' : 'disabled',
    webgl:
      context.fingerprintModes['webgl'] === 'real'
        ? 'disabled'
        : context.profile && surfaceSupported(environment, 'webgl') ? 'enabled' : 'disabled',
    webGpu:
      context.profile && surfaceSupported(environment, 'webGpu')
        ? isRestricted(context, 'webGpu')
          ? 'restricted'
          : 'enabled'
        : 'disabled',
    mediaDevices: surfaceSupported(environment, 'mediaDevices')
      ? isRestricted(context, 'mediaDevices')
        ? 'restricted'
        : context.profile
          ? 'enabled'
          : 'disabled'
      : 'disabled',
    fonts: surfaceSupported(environment, 'fonts')
      ? isRestricted(context, 'localFonts')
        ? 'restricted'
        : context.profile
          ? 'enabled'
          : 'disabled'
      : 'disabled',
    permissions: surfaceSupported(environment, 'permissions')
      ? isRestricted(context, 'localFonts') || isRestricted(context, 'mediaDevices')
        ? 'restricted'
        : context.profile
          ? 'enabled'
          : 'disabled'
      : 'disabled',
    pdfViewer: surfaceSupported(environment, 'pdfViewer')
      ? isRestricted(context, 'pdfViewer')
        ? 'restricted'
        : context.profile
          ? 'enabled'
          : 'disabled'
      : 'disabled',
    intl:
      localeMode(context) === 'real'
        ? 'disabled'
        : effectiveLocale(context) && surfaceSupported(environment, 'intl') ? 'enabled' : 'disabled',
    canvas:
      context.fingerprintModes['canvas'] === 'real'
        ? 'disabled'
        : context.profile?.canvasNoise != null && surfaceSupported(environment, 'canvas') ? 'enabled' : 'disabled',
    audio:
      context.fingerprintModes['audio'] === 'real'
        ? 'disabled'
        : typeof context.profile?.audioNoise === 'number' && surfaceSupported(environment, 'audio') ? 'enabled' : 'disabled',
    timezone:
      timezoneMode(context) === 'real'
        ? 'disabled'
        : typeof effectiveTimeZone(context) === 'string' && surfaceSupported(environment, 'timezone') ? 'enabled' : 'disabled',
    domRect:
      context.fingerprintModes['domRect'] === 'real'
        ? 'disabled'
        : context.profile?.domRectNoise != null ? 'enabled' : 'disabled',
    textMetrics:
      context.fingerprintModes['textMetrics'] === 'real'
        ? 'disabled'
        : context.profile?.textMetricsNoise != null ? 'enabled' : 'disabled',
    mathFingerprint:
      context.fingerprintModes['mathFingerprint'] === 'real'
        ? 'disabled'
        : context.profile?.mathFingerprint != null ? 'enabled' : 'disabled',
    speechVoices:
      context.fingerprintModes['speechVoices'] === 'real'
        ? 'disabled'
        : context.profile?.speechVoices != null && typeof speechSynthesis !== 'undefined' ? 'enabled' : 'disabled',
    webrtc:
      context.fingerprintModes['webrtc'] === 'real'
        ? 'disabled'
        : context.profile ? 'enabled' : 'disabled',
    battery:
      context.fingerprintModes['battery'] === 'real'
        ? 'disabled'
        : context.profile?.batteryLevel != null ? 'enabled' : 'disabled',
    // browserCapabilities stays enabled, but individual hide/remove operations
    // are gated locally by viability checks instead of disabling the whole surface.
    browserCapabilities: 'enabled',
  })

  const createRuntimePlan = (payload: ContentScriptPayload, realm: WindowRealm): RuntimePlan => {
    const context = createSurfaceContext(payload)
    const environment = createRuntimeEnvironment(context, realm)

    return {
      ...context,
      environment,
      surfaceStates: createRuntimeSurfaceStates(context, environment),
    }
  }

  let currentPlanRef: RuntimePlan | null = null

  const surfaceState = (plan: RuntimePlan, surface: RuntimeSurfaceId): RuntimeSurfaceState => plan.surfaceStates[surface]
  const surfaceIsEnabled = (plan: RuntimePlan, surface: RuntimeSurfaceId): boolean => surfaceState(plan, surface) !== 'disabled'
  const surfaceIsRestricted = (plan: RuntimePlan, surface: RuntimeSurfaceId): boolean => surfaceState(plan, surface) === 'restricted'

  /**
   * Returns the spoofing mode for a given fingerprint surface key.
   * Falls back to 'random' (legacy profile-based behaviour) when the key is absent.
   */
  const spoofMode = (plan: RuntimePlan, key: string): SurfaceSpoofMode =>
    (plan.fingerprintModes[key] as SurfaceSpoofMode | undefined) ?? 'random'


  const localeChain = (primary: string): string[] => {
    const normalized = String(primary || '').trim()
    if (!normalized) {
      return ['en-US', 'en']
    }

    const base = normalized.split('-')[0]
    return normalized === base ? [normalized] : [...new Set([normalized, base])]
  }

  const localeMode = (plan: SurfaceContext | RuntimePlan): LocaleSpoofMode => plan.localeMode || 'random'
  const timezoneMode = (plan: SurfaceContext | RuntimePlan): TimezoneSpoofMode => plan.timezoneMode || 'random'

  const effectiveLocale = (plan: SurfaceContext | RuntimePlan): string | undefined => {
    if (localeMode(plan) === 'static') {
      return String(plan.localePreset || 'en-US')
    }

    return plan.profile?.language
  }

  const effectiveLanguages = (plan: SurfaceContext | RuntimePlan): readonly string[] => {
    if (localeMode(plan) === 'static') {
      return localeChain(plan.localePreset || 'en-US')
    }

    if (plan.profile?.languages?.length) {
      return plan.profile.languages
    }

    return plan.profile?.language ? localeChain(plan.profile.language) : ['en-US', 'en']
  }

  const effectiveTimeZone = (plan: SurfaceContext | RuntimePlan): string | undefined => {
    const mode = timezoneMode(plan)
    if (mode === 'off') {
      return 'UTC'
    }
    if (mode === 'static') {
      return String(plan.timezonePreset || 'UTC')
    }
    return plan.profile?.timezoneZone
  }

  const overloadGetter = (
    target: object | undefined,
    prop: PropertyKey,
    getter: () => unknown,
    options: { configurable?: boolean } = {}
  ): void => {
    if (!target) {
      return
    }

    try {
      const existing = nativeGetOwnPropertyDescriptor(target, prop)
      if (existing?.get) cloak(getter, existing.get)
      nativeDefineProperty(target, prop, {
        get: getter,
        configurable: options.configurable ?? true,
        enumerable: true,
      })
    } catch {
      // ignore
    }
  }

  type ScreenSnapshot = {
    width: number
    height: number
    availWidth: number
    availHeight: number
    colorDepth: number
    pixelDepth: number
    devicePixelRatio: number
    innerWidth: number
    innerHeight: number
    outerWidth: number
    outerHeight: number
    visualViewportWidth: number
    visualViewportHeight: number
    visualViewportScale: number
    orientationType: 'landscape-primary' | 'portrait-primary'
    orientationAngle: 0 | 90
    colorScheme: 'dark' | 'light'
    reducedMotion: 'no-preference' | 'reduce'
    monochromeDepth: number
    contrast: 'no-preference' | 'more' | 'less'
    reducedTransparency: 'no-preference' | 'reduce'
    invertedColors: 'none' | 'inverted'
    forcedColors: 'none' | 'active'
    anyHover: 'none' | 'hover'
    hover: 'none' | 'hover'
    anyPointer: 'coarse' | 'fine' | 'none'
    pointer: 'coarse' | 'fine' | 'none'
    displayMode: 'browser' | 'fullscreen' | 'standalone' | 'minimal-ui'
    colorGamut: 'srgb' | 'p3'
    touch: boolean
  }

  type AudioLatencyHintMode = 'interactive' | 'balanced' | 'playback'

  const buildScreenSnapshot = (plan: RuntimePlan, mode: SurfaceSpoofMode): ScreenSnapshot | undefined => {
    if (mode === 'real') {
      return
    }

    if (mode === 'off') {
      return {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        colorDepth: 24,
        pixelDepth: 24,
        devicePixelRatio: 1,
        innerWidth: 1920,
        innerHeight: 947,
        outerWidth: 1920,
        outerHeight: 1040,
        visualViewportWidth: 1920,
        visualViewportHeight: 947,
        visualViewportScale: 1,
        orientationType: 'landscape-primary',
        orientationAngle: 0,
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        monochromeDepth: 0,
        contrast: 'no-preference',
        reducedTransparency: 'no-preference',
        invertedColors: 'none',
        forcedColors: 'none',
        anyHover: 'hover',
        hover: 'hover',
        anyPointer: 'fine',
        pointer: 'fine',
        displayMode: 'browser',
        colorGamut: 'srgb',
        touch: false,
      }
    }

    const profile = plan.profile
    if (!profile) {
      return
    }

    const touch = profile.maxTouchPoints > 0
    const portrait = profile.screen.height >= profile.screen.width
    const seed = profile.canvasNoise >>> 0
    const colorScheme = (seed & 1) === 0 ? 'dark' : 'light'
    const colorGamut = touch || plan.payload.current.os === 'macOS' || plan.payload.current.os === 'iOS' || (seed % 3 === 0)
      ? 'p3'
      : 'srgb'
    const verticalChrome = touch ? Math.max(0, profile.screen.height - profile.screen.availHeight) : 72
    const innerWidth = profile.screen.availWidth
    const innerHeight = Math.max(1, profile.screen.availHeight - (touch ? 0 : Math.max(0, verticalChrome - 32)))
    const outerWidth = touch ? profile.screen.width : profile.screen.availWidth
    const outerHeight = touch ? profile.screen.height : Math.min(profile.screen.height, innerHeight + 80)

    return {
      width: profile.screen.width,
      height: profile.screen.height,
      availWidth: profile.screen.availWidth,
      availHeight: profile.screen.availHeight,
      colorDepth: profile.screen.colorDepth,
      pixelDepth: profile.screen.pixelDepth,
      devicePixelRatio: profile.screen.devicePixelRatio,
      innerWidth,
      innerHeight,
      outerWidth,
      outerHeight,
      visualViewportWidth: innerWidth,
      visualViewportHeight: innerHeight,
      visualViewportScale: 1,
      orientationType: portrait ? 'portrait-primary' : 'landscape-primary',
      orientationAngle: portrait ? 0 : 90,
      colorScheme,
      reducedMotion: 'no-preference',
      monochromeDepth: 0,
      contrast: 'no-preference',
      reducedTransparency: 'no-preference',
      invertedColors: 'none',
      forcedColors: 'none',
      anyHover: touch ? 'none' : 'hover',
      hover: touch ? 'none' : 'hover',
      anyPointer: touch ? 'coarse' : 'fine',
      pointer: touch ? 'coarse' : 'fine',
      displayMode: 'browser',
      colorGamut,
      touch,
    }
  }


  const cssMediaStaticPresets: Readonly<Record<string, Readonly<{ width: number; height: number; devicePixelRatio: number; touch: boolean }>>> = Object.freeze({
    '360x640@3': Object.freeze({ width: 360, height: 640, devicePixelRatio: 3, touch: true }),
    '375x667@2': Object.freeze({ width: 375, height: 667, devicePixelRatio: 2, touch: true }),
    '390x844@3': Object.freeze({ width: 390, height: 844, devicePixelRatio: 3, touch: true }),
    '412x915@2.625': Object.freeze({ width: 412, height: 915, devicePixelRatio: 2.625, touch: true }),
    '430x932@3': Object.freeze({ width: 430, height: 932, devicePixelRatio: 3, touch: true }),
    '768x1024@2': Object.freeze({ width: 768, height: 1024, devicePixelRatio: 2, touch: true }),
    '820x1180@2': Object.freeze({ width: 820, height: 1180, devicePixelRatio: 2, touch: true }),
    '1366x768@1': Object.freeze({ width: 1366, height: 768, devicePixelRatio: 1, touch: false }),
    '1536x864@1.25': Object.freeze({ width: 1536, height: 864, devicePixelRatio: 1.25, touch: false }),
    '1920x1080@1': Object.freeze({ width: 1920, height: 1080, devicePixelRatio: 1, touch: false }),
    '1920x1080@1.25': Object.freeze({ width: 1920, height: 1080, devicePixelRatio: 1.25, touch: false }),
    '2560x1440@1': Object.freeze({ width: 2560, height: 1440, devicePixelRatio: 1, touch: false }),
    '2560x1440@1.25': Object.freeze({ width: 2560, height: 1440, devicePixelRatio: 1.25, touch: false }),
    '2560x1600@2': Object.freeze({ width: 2560, height: 1600, devicePixelRatio: 2, touch: false }),
    '2880x1800@2': Object.freeze({ width: 2880, height: 1800, devicePixelRatio: 2, touch: false }),
    '3840x2160@1': Object.freeze({ width: 3840, height: 2160, devicePixelRatio: 1, touch: false }),
    '3840x2160@1.5': Object.freeze({ width: 3840, height: 2160, devicePixelRatio: 1.5, touch: false }),
  })

  const buildStaticCssMediaSnapshot = (width: number, height: number, devicePixelRatio: number, touch: boolean): ScreenSnapshot => {
    const portrait = height >= width
    const verticalChrome = 72
    const availWidth = width
    const availHeight = Math.max(1, height - 40)
    const innerWidth = availWidth
    const innerHeight = Math.max(1, availHeight - Math.max(0, verticalChrome - 32))
    const outerWidth = availWidth
    const outerHeight = Math.min(height, innerHeight + 80)
    return {
      width,
      height,
      availWidth,
      availHeight,
      colorDepth: 24,
      pixelDepth: 24,
      devicePixelRatio,
      innerWidth,
      innerHeight,
      outerWidth,
      outerHeight,
      visualViewportWidth: innerWidth,
      visualViewportHeight: innerHeight,
      visualViewportScale: 1,
      orientationType: portrait ? 'portrait-primary' : 'landscape-primary',
      orientationAngle: portrait ? 0 : 90,
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      monochromeDepth: 0,
      contrast: 'no-preference',
      reducedTransparency: 'no-preference',
      invertedColors: 'none',
      forcedColors: 'none',
      anyHover: touch ? 'none' : 'hover',
      hover: touch ? 'none' : 'hover',
      anyPointer: touch ? 'coarse' : 'fine',
      pointer: touch ? 'coarse' : 'fine',
      displayMode: 'browser',
      colorGamut: devicePixelRatio >= 1.5 ? 'p3' : 'srgb',
      touch,
    }
  }

  const buildCssMediaSnapshot = (plan: RuntimePlan, screenSnapshot: ScreenSnapshot | undefined): ScreenSnapshot | undefined => {
    const mode = plan.cssMediaQuery?.mode || 'real'
    if (mode === 'real') {
      return undefined
    }
    if (mode === 'static') {
      const preset = cssMediaStaticPresets[plan.cssMediaQuery?.preset || ''] || cssMediaStaticPresets['1920x1080@1']
      return buildStaticCssMediaSnapshot(preset.width, preset.height, preset.devicePixelRatio, preset.touch)
    }
    return screenSnapshot
  }

  const parsePx = (value: string): number | undefined => {
    const match = String(value).trim().toLowerCase().match(/^([0-9]+(?:\.[0-9]+)?)px$/)
    return match ? Number(match[1]) : undefined
  }

  const parseResolutionDppx = (value: string): number | undefined => {
    const match = String(value).trim().toLowerCase().match(/^([0-9]+(?:\.[0-9]+)?)(dppx|dpi)$/)
    if (!match) {
      return
    }

    const numeric = Number(match[1])
    return match[2] === 'dpi' ? numeric / 96 : numeric
  }

  const approximatelyEqual = (left: number, right: number, epsilon: number = 0.001): boolean =>
    Math.abs(left - right) <= epsilon

  const evaluateMediaClause = (feature: string, value: string, snapshot: ScreenSnapshot): boolean | undefined => {
    const normalizedFeature = feature.trim().toLowerCase()
    const normalizedValue = value.trim().toLowerCase()

    const evaluateLength = (actual: number, parser: (raw: string) => number | undefined): boolean | undefined => {
      const parsed = parser(normalizedValue)
      if (typeof parsed !== 'number' || Number.isNaN(parsed)) {
        return
      }

      if (normalizedFeature.startsWith('min-')) {
        return actual >= parsed
      }

      if (normalizedFeature.startsWith('max-')) {
        return actual <= parsed
      }

      return approximatelyEqual(actual, parsed)
    }

    switch (normalizedFeature) {
      case 'device-width':
      case 'min-device-width':
      case 'max-device-width':
        return evaluateLength(snapshot.width, parsePx)
      case 'device-height':
      case 'min-device-height':
      case 'max-device-height':
        return evaluateLength(snapshot.height, parsePx)
      case 'width':
      case 'min-width':
      case 'max-width':
        return evaluateLength(snapshot.innerWidth, parsePx)
      case 'height':
      case 'min-height':
      case 'max-height':
        return evaluateLength(snapshot.innerHeight, parsePx)
      case 'resolution':
      case 'min-resolution':
      case 'max-resolution': {
        const parsed = parseResolutionDppx(normalizedValue)
        if (typeof parsed !== 'number' || Number.isNaN(parsed)) {
          return
        }

        if (normalizedFeature.startsWith('min-')) {
          return snapshot.devicePixelRatio >= parsed
        }

        if (normalizedFeature.startsWith('max-')) {
          return snapshot.devicePixelRatio <= parsed
        }

        return approximatelyEqual(snapshot.devicePixelRatio, parsed)
      }
      case '-webkit-device-pixel-ratio':
        return approximatelyEqual(snapshot.devicePixelRatio, Number(normalizedValue))
      case 'orientation':
        return (snapshot.orientationType.startsWith('landscape') ? 'landscape' : 'portrait') === normalizedValue
      case 'display-mode':
        return snapshot.displayMode === normalizedValue
      case 'prefers-color-scheme':
        return snapshot.colorScheme === normalizedValue
      case 'prefers-reduced-motion':
        return snapshot.reducedMotion === normalizedValue
      case 'monochrome':
      case 'min-monochrome':
      case 'max-monochrome': {
        const parsed = Number(normalizedValue)
        if (!normalizedValue && normalizedFeature === 'monochrome') {
          return snapshot.monochromeDepth > 0
        }
        if (!Number.isFinite(parsed)) {
          return
        }
        if (normalizedFeature.startsWith('min-')) {
          return snapshot.monochromeDepth >= parsed
        }
        if (normalizedFeature.startsWith('max-')) {
          return snapshot.monochromeDepth <= parsed
        }
        return snapshot.monochromeDepth === parsed
      }
      case 'prefers-contrast':
        return snapshot.contrast === normalizedValue
      case 'prefers-reduced-transparency':
        return snapshot.reducedTransparency === normalizedValue
      case 'inverted-colors':
        return snapshot.invertedColors === normalizedValue
      case 'forced-colors':
        return snapshot.forcedColors === normalizedValue
      case 'any-hover':
        return snapshot.anyHover === normalizedValue
      case 'hover':
        return snapshot.hover === normalizedValue
      case 'any-pointer':
        return snapshot.anyPointer === normalizedValue
      case 'pointer':
        return snapshot.pointer === normalizedValue
      case 'color-gamut':
        if (normalizedValue === 'srgb') {
          return snapshot.colorGamut === 'srgb' || snapshot.colorGamut === 'p3'
        }
        return snapshot.colorGamut === normalizedValue
      default:
        return
    }
  }

  const evaluateMediaQuery = (query: string, snapshot: ScreenSnapshot): boolean | undefined => {
    const raw = String(query || '').trim()
    if (!raw) return undefined

    const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length > 1) {
      let anyTrue = false
      let allHandled = true
      for (const part of parts) {
        const r = evaluateSingleMediaQuery(part, snapshot)
        if (r === undefined) { allHandled = false; continue }
        if (r) anyTrue = true
      }
      if (!allHandled && !anyTrue) return undefined
      return anyTrue
    }

    return evaluateSingleMediaQuery(raw, snapshot)
  }

  const evaluateSingleMediaQuery = (query: string, snapshot: ScreenSnapshot): boolean | undefined => {
    let normalized = query.toLowerCase().trim()

    let negated = false
    if (normalized.startsWith('not ')) {
      negated = true
      normalized = normalized.slice(4).trim()
    }

    normalized = normalized.replace(/^(all|screen|print)\s+and\s+/, '')

    const clauses = [...normalized.matchAll(/\(\s*([a-z-]+)\s*:\s*([^)]+)\)/g)]
    if (!clauses.length) {
      return undefined
    }

    let handled = false

    for (const clause of clauses) {
      const result = evaluateMediaClause(clause[1], clause[2], snapshot)
      if (typeof result !== 'boolean') {
        return undefined
      }
      handled = true
      if (!result) {
        return negated ? true : false
      }
    }

    return handled ? (negated ? false : true) : undefined
  }

  const wrapMediaQueryList = (value: MediaQueryList, matches: boolean): MediaQueryList => {
    return new Proxy(value as MediaQueryList & Record<PropertyKey, unknown>, {
      get(target, prop) {
        if (prop === 'matches') {
          return matches
        }

        const next = Reflect.get(target, prop, target)
        return typeof next === 'function' ? next.bind(target) : next
      },
    }) as MediaQueryList
  }

  const normalizeLatencyHint = (value: unknown): AudioLatencyHintMode => {
    if (value === 'playback') {
      return 'playback'
    }

    if (value === 'balanced') {
      return 'balanced'
    }

    if (typeof value === 'number') {
      if (value >= 0.05) {
        return 'playback'
      }
      if (value >= 0.015) {
        return 'balanced'
      }
    }

    return 'interactive'
  }

  const buildAudioSnapshot = (plan: RuntimePlan): {
    sampleRate: number
    interactiveLatency: number
    balancedLatency: number
    playbackLatency: number
    outputLatency: number
  } | undefined => {
    const profile = plan.profile
    if (!profile) {
      return
    }

    const seed = profile.canvasNoise >>> 0
    const isMobile = profile.maxTouchPoints > 0
    const browser = plan.payload.current.browser
    const os = plan.payload.current.os
    const sampleRate = browser === 'safari' || os === 'iOS' ? 44100 : 48000
    const latencySets = isMobile
      ? [0.0106666667, 0.0133333333, 0.016]
      : [0.0053333333, 0.0106666667, 0.0213333333]
    const interactiveLatency = latencySets[seed % latencySets.length]
    const balancedLatency = Number((interactiveLatency * 1.5).toFixed(10))
    const playbackLatency = Number((interactiveLatency * 2).toFixed(10))
    const outputLatency = browser === 'firefox'
      ? 0
      : Number((((seed >> 2) % 3) * (128 / sampleRate)).toFixed(10))

    return {
      sampleRate,
      interactiveLatency,
      balancedLatency,
      playbackLatency,
      outputLatency,
    }
  }


  type WebGlCapsProfile = {
    readonly scalar: Readonly<Record<number, number | string | boolean>>
    readonly vector: Readonly<Record<number, readonly number[]>>
    readonly extensions: readonly string[]
    readonly webgl2Scalar: Readonly<Record<number, number | string | boolean>>
    readonly webgl2Vector: Readonly<Record<number, readonly number[]>>
    readonly webgl2Extensions: readonly string[]
  }

  const WEBGL_BASE_EXTENSIONS = Object.freeze([
    'ANGLE_instanced_arrays',
    'EXT_blend_minmax',
    'EXT_color_buffer_half_float',
    'EXT_disjoint_timer_query',
    'EXT_float_blend',
    'EXT_frag_depth',
    'EXT_sRGB',
    'EXT_shader_texture_lod',
    'EXT_texture_compression_bptc',
    'EXT_texture_compression_rgtc',
    'EXT_texture_filter_anisotropic',
    'EXT_color_buffer_float',
    'KHR_parallel_shader_compile',
    'OES_element_index_uint',
    'OES_fbo_render_mipmap',
    'OES_standard_derivatives',
    'OES_texture_float',
    'OES_texture_float_linear',
    'OES_texture_half_float',
    'OES_texture_half_float_linear',
    'OES_vertex_array_object',
    'WEBGL_color_buffer_float',
    'WEBGL_compressed_texture_astc',
    'WEBGL_compressed_texture_etc',
    'WEBGL_compressed_texture_etc1',
    'WEBGL_compressed_texture_s3tc',
    'WEBGL_compressed_texture_s3tc_srgb',
    'WEBGL_debug_shaders',
    'WEBGL_depth_texture',
    'WEBGL_draw_buffers',
    'WEBGL_lose_context',
    'WEBGL_multi_draw',
    'WEBGL_polygon_mode',
  ] as const)

  const WEBGL2_BASE_EXTENSIONS = Object.freeze([
    'EXT_color_buffer_float',
    'EXT_disjoint_timer_query_webgl2',
    'EXT_texture_filter_anisotropic',
    'KHR_parallel_shader_compile',
    'OES_draw_buffers_indexed',
    'OVR_multiview2',
    'WEBGL_clip_cull_distance',
    'WEBGL_compressed_texture_astc',
    'WEBGL_compressed_texture_etc',
    'WEBGL_compressed_texture_s3tc',
    'WEBGL_compressed_texture_s3tc_srgb',
    'WEBGL_debug_shaders',
    'WEBGL_lose_context',
    'WEBGL_multi_draw',
    'WEBGL_provoking_vertex',
  ] as const)

  const buildWebGlCapsProfile = (plan: RuntimePlan): WebGlCapsProfile | undefined => {
    const profile = plan.profile
    if (!profile) return

    const browser = plan.payload.current.browser
    const os = plan.payload.current.os
    const isMobile = os === 'android' || os === 'iOS'
    const vendor = `${profile.webgl.vendor} ${profile.webgl.renderer}`.toLowerCase()
    const isSafari = browser === 'safari'
    const isFirefox = browser === 'firefox'
    const isChromium = browser === 'chrome' || browser === 'edge' || browser === 'opera'

    const desktopScalar: Record<number, number | string | boolean> = {
      3414: 24,
      3415: 8,
      3410: 8,
      3411: 8,
      3412: 8,
      3413: 8,
      34921: 16,
      34930: 16,
      35660: 16,
      35661: 32,
      36347: 4096,
      36349: 1024,
      36348: 16,
      33000: 1048576,
      33001: 2097152,
      3379: 16384,
      34076: 16384,
      34024: 16384,
      34045: 16,
      32936: 1,
      32937: 4,
      34047: 16,
    }
    const desktopVector: Record<number, readonly number[]> = {
      33901: [1, 8191],
      33902: [1, 255],
      3386: [16384, 16384],
    }
    const mobileScalar: Record<number, number | string | boolean> = {
      3414: 24,
      3415: 8,
      3410: 8,
      3411: 8,
      3412: 8,
      3413: 8,
      34921: 16,
      34930: 16,
      35660: 8,
      35661: 16,
      36347: 256,
      36349: 224,
      36348: 8,
      33000: 524288,
      33001: 1048576,
      3379: 8192,
      34076: 8192,
      34024: 8192,
      34045: 8,
      32936: 1,
      32937: 4,
      34047: 8,
    }
    const mobileVector: Record<number, readonly number[]> = {
      33901: [1, 1],
      33902: [1, 15],
      3386: [8192, 8192],
    }

    const scalar = isMobile ? mobileScalar : desktopScalar
    const vector = isMobile ? mobileVector : desktopVector
    const extensions = new Set<string>(isMobile
      ? WEBGL_BASE_EXTENSIONS.filter(ext => ext !== 'EXT_float_blend' && ext !== 'EXT_texture_compression_bptc' && ext !== 'EXT_texture_compression_rgtc' && ext !== 'WEBGL_polygon_mode')
      : WEBGL_BASE_EXTENSIONS)

    if (isSafari) {
      for (const ext of ['EXT_disjoint_timer_query', 'EXT_float_blend', 'WEBGL_debug_shaders', 'WEBGL_polygon_mode', 'WEBGL_multi_draw']) {
        extensions.delete(ext)
      }
    }
    if (isFirefox) {
      for (const ext of ['WEBGL_polygon_mode']) {
        extensions.delete(ext)
      }
    }
    if (!isChromium && !isFirefox && !isSafari) {
      extensions.delete('WEBGL_debug_renderer_info')
    }

    if (vendor.includes('apple gpu')) {
      scalar[3379] = 16384
      scalar[34076] = 16384
      scalar[34024] = 16384
      vector[33901] = [1, 1]
      scalar[34047] = 16
      extensions.add('WEBGL_compressed_texture_pvrtc')
    } else if (vendor.includes('adreno')) {
      scalar[3379] = isMobile ? 16384 : 16384
      scalar[34076] = 16384
      scalar[34024] = 16384
      scalar[35658] = isMobile ? 32 : 32
      scalar[34047] = 16
      extensions.add('WEBGL_compressed_texture_astc')
    } else if (vendor.includes('mali')) {
      scalar[3379] = 8192
      scalar[34076] = 8192
      scalar[34024] = 8192
      scalar[35658] = 16
      scalar[34047] = 4
      extensions.add('WEBGL_compressed_texture_astc')
    } else if (vendor.includes('nvidia') || vendor.includes('geforce')) {
      scalar[3379] = 32768
      scalar[34076] = 32768
      scalar[34024] = 32768
      scalar[35658] = 32
      scalar[35660] = 32
      scalar[36347] = 8192
      vector[33901] = [1, 63]
      scalar[34047] = 16
    } else if (vendor.includes('amd') || vendor.includes('radeon')) {
      scalar[3379] = 16384
      scalar[34076] = 16384
      scalar[34024] = 16384
      scalar[35658] = 32
      scalar[35660] = 32
      scalar[36347] = 8192
      vector[33901] = [1, 16]
      scalar[34047] = 16
    } else if (vendor.includes('intel') || vendor.includes('iris') || vendor.includes('uhd')) {
      scalar[3379] = 16384
      scalar[34076] = 16384
      scalar[34024] = 16384
      scalar[35658] = 32
      scalar[35660] = 16
      scalar[36347] = 4096
      vector[33901] = [1, 16]
      scalar[34047] = 16
    }

    const webgl2Scalar: Record<number, number | string | boolean> = {
      32883: isMobile ? 2048 : 4096,
      33000: isMobile ? 524288 : 1048576,
      33001: isMobile ? 1048576 : 2097152,
      34045: isMobile ? 8 : 16,
      34852: 4,
      35071: isMobile ? 256 : 2048,
      35371: isMobile ? 12 : 14,
      35373: isMobile ? 12 : 14,
      35374: isMobile ? 24 : 36,
      35375: isMobile ? 24 : 36,
      35376: isMobile ? 16384 : 65536,
      35377: isMobile ? 65536 : 262144,
      35379: isMobile ? 65536 : 229376,
      35380: 256,
      35657: isMobile ? 896 : 1024,
      35658: isMobile ? 4096 : 16384,
      35659: isMobile ? 60 : 64,
      36063: 4,
      37099: isMobile ? 4 : 8,
      37137: 16384,
      37154: 4,
    }
    const webgl2Vector: Record<number, readonly number[]> = {}
    if (!isMobile && (vendor.includes('nvidia') || vendor.includes('amd'))) {
      webgl2Scalar[32883] = 16384
      webgl2Scalar[33000] = 4194304
      webgl2Scalar[33001] = 4194304
      webgl2Scalar[34852] = 8
      webgl2Scalar[35071] = 2048
      webgl2Scalar[35371] = 14
      webgl2Scalar[35373] = 14
      webgl2Scalar[35374] = 72
      webgl2Scalar[35375] = 72
      webgl2Scalar[35376] = 65536
      webgl2Scalar[35377] = 262144
      webgl2Scalar[35379] = 262144
      webgl2Scalar[35657] = 1024
      webgl2Scalar[35658] = 16384
      webgl2Scalar[35659] = 120
      webgl2Scalar[36063] = 8
      webgl2Scalar[37099] = 8
      webgl2Scalar[37154] = 8
    }
    if (vendor.includes('apple gpu')) {
      webgl2Scalar[32883] = 2048
      webgl2Scalar[33000] = 1048576
      webgl2Scalar[33001] = 1048576
      webgl2Scalar[34852] = 4
      webgl2Scalar[35071] = 256
      webgl2Scalar[35371] = 12
      webgl2Scalar[35373] = 12
      webgl2Scalar[35374] = 24
      webgl2Scalar[35375] = 24
      webgl2Scalar[35376] = 16384
      webgl2Scalar[35377] = 131072
      webgl2Scalar[35379] = 131072
      webgl2Scalar[35657] = 896
      webgl2Scalar[35658] = 8192
      webgl2Scalar[35659] = 60
      webgl2Scalar[36063] = 4
      webgl2Scalar[37154] = 4
      extensions.add('EXT_texture_compression_bptc')
    }

    const webgl2Extensions = new Set<string>(WEBGL2_BASE_EXTENSIONS)
    if (isSafari) {
      for (const ext of ['WEBGL_provoking_vertex', 'WEBGL_multi_draw', 'EXT_disjoint_timer_query_webgl2']) {
        webgl2Extensions.delete(ext)
      }
    }
    if (isFirefox) {
      webgl2Extensions.delete('WEBGL_provoking_vertex')
    }

    return {
      scalar,
      vector,
      extensions: [...extensions],
      webgl2Scalar,
      webgl2Vector,
      webgl2Extensions: [...webgl2Extensions],
    }
  }

  const buildWebGlDefaultContextAttributes = (plan: RuntimePlan): Record<string, unknown> => {
    const profile = plan.profile
    const os = plan.payload.current.os
    const browser = plan.payload.current.browser
    const vendor = `${profile?.webgl.vendor || ''} ${profile?.webgl.renderer || ''}`.toLowerCase()
    const isMobile = os === 'android' || os === 'iOS'

    const attrs: Record<string, unknown> = {
      alpha: true,
      antialias: !isMobile || vendor.includes('apple gpu') || vendor.includes('adreno'),
      depth: true,
      desynchronized: false,
      failIfMajorPerformanceCaveat: false,
      powerPreference: isMobile ? 'default' : 'high-performance',
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      stencil: isMobile ? vendor.includes('apple gpu') : browser === 'safari',
      xrCompatible: false,
    }

    return attrs
  }

  const applyIntlSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const resolvedOptions = realm.Intl?.DateTimeFormat?.prototype?.resolvedOptions
    const locale = effectiveLocale(plan)
    if (localeMode(plan) === 'real' || !locale || typeof resolvedOptions !== 'function') {
      return
    }

    overload(
      realm.Intl.DateTimeFormat.prototype,
      'resolvedOptions',
      createResolvedOptionsProxy(realm.Intl.DateTimeFormat.prototype.resolvedOptions, locale),
      { configurable: true, force: true, writable: true }
    )
  }

  const applyWebGlSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const context = plan
    const mode = spoofMode(plan, 'webgl')

    if (mode === 'real') {
      return
    }

    if (mode === 'off') {
      const wrapOff = (proto: {
        getParameter?: (name: number) => unknown
        getExtension?: (name: string) => unknown
        getSupportedExtensions?: () => string[] | null
      } | undefined): void => {
        if (!proto) return

        if (typeof proto.getExtension === 'function') {
          const origGetExtension = proto.getExtension
          const patchedGetExtension = new Proxy(origGetExtension, {
            apply(target, self, args: [string]) {
              const name = String(args[0] || '').toLowerCase()
              if (name === 'webgl_debug_renderer_info') return null
              return Reflect.apply(target, self, args)
            },
          })
          cloak(patchedGetExtension, origGetExtension)
          overload(proto as object, 'getExtension', patchedGetExtension, { configurable: true, force: true, writable: true })
        }

        if (typeof proto.getSupportedExtensions === 'function') {
          const origGetSupportedExtensions = proto.getSupportedExtensions
          const patchedGetSupportedExtensions = new Proxy(origGetSupportedExtensions, {
            apply(target, self, args) {
              const result = Reflect.apply(target, self, args)
              return Array.isArray(result)
                ? result.filter((name) => String(name).toLowerCase() !== 'webgl_debug_renderer_info')
                : result
            },
          })
          cloak(patchedGetSupportedExtensions, origGetSupportedExtensions)
          overload(proto as object, 'getSupportedExtensions', patchedGetSupportedExtensions, { configurable: true, force: true, writable: true })
        }

        if (typeof proto.getParameter === 'function') {
          const origGetParameter = proto.getParameter
          const patchedGetParameter = new Proxy(origGetParameter, {
            apply(target, self, args: [number]) {
              const name = args[0]
              if (name === 37445 || name === 37446) return null
              return Reflect.apply(target, self, args)
            },
          })
          cloak(patchedGetParameter, origGetParameter)
          overload(proto as object, 'getParameter', patchedGetParameter, { configurable: true, force: true, writable: true })
        }
      }

      wrapOff(realm.WebGLRenderingContext?.prototype as {
        getParameter?: (name: number) => unknown
        getExtension?: (name: string) => unknown
        getSupportedExtensions?: () => string[] | null
      } | undefined)
      wrapOff(realm.WebGL2RenderingContext?.prototype as {
        getParameter?: (name: number) => unknown
        getExtension?: (name: string) => unknown
        getSupportedExtensions?: () => string[] | null
      } | undefined)
      return
    }

    if (!context.profile) {
      return
    }

    const caps = buildWebGlCapsProfile(plan)
    if (!caps) {
      return
    }

    const browser = context.payload.current.browser
    const os = context.payload.current.os
    const isChromiumPersona = browser === 'chrome' || browser === 'edge' || browser === 'opera'
    const isFirefoxPersona = browser === 'firefox'
    const isSafariPersona = browser === 'safari'

    const buildWebGlIdentity = (): {
      readonly maskedVendor: string
      readonly maskedRenderer: string
      readonly debugVendor: string
      readonly debugRenderer: string
      readonly exposeDebugRendererInfo: boolean
    } => {
      const rawVendor = context.profile?.webgl.vendor || ''
      const rawRenderer = context.profile?.webgl.renderer || ''
      const compactVendor = (value: string): string => {
        const trimmed = value.trim()
        if (!trimmed) return 'Google'
        if (/^google inc\./i.test(trimmed)) {
          const match = /^google inc\.\s*\((.+)\)$/i.exec(trimmed)
          return (match?.[1] || 'Google').trim()
        }
        return trimmed
          .replace(/^apple inc\.?$/i, 'Apple')
          .replace(/^nvidia corporation$/i, 'NVIDIA')
          .replace(/^advanced micro devices,? inc\.?$/i, 'AMD')
      }
      const chromiumVendor = (value: string): string => {
        const vendor = compactVendor(value)
        return `Google Inc. (${vendor})`
      }
      const chromiumRenderer = (vendor: string, renderer: string): string => {
        const cleanVendor = compactVendor(vendor)
        const cleanRenderer = renderer.trim() || 'Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver'
        if (/^ANGLE\s*\(/i.test(cleanRenderer)) return cleanRenderer
        if (os === 'android') return `ANGLE (${cleanVendor}, ${cleanRenderer}, OpenGL ES 3.2)`
        if (os === 'macOS') {
          if (/apple/i.test(cleanVendor) || /apple/i.test(cleanRenderer)) {
            return `ANGLE (${cleanVendor}, ANGLE Metal Renderer: ${cleanRenderer}, Unspecified Version)`
          }
          return `ANGLE (${cleanVendor}, ${cleanRenderer}, OpenGL 4.1)`
        }
        if (os === 'windows') return `ANGLE (${cleanVendor}, ${cleanRenderer} Direct3D11 vs_5_0 ps_5_0, D3D11)`
        return `ANGLE (${cleanVendor}, ${cleanRenderer}, OpenGL)`
      }
      const chromiumMaskedVendor = (vendor: string, renderer: string): string => {
        const joined = `${vendor} ${renderer}`.trim()
        if (os === 'macOS') {
          if (/apple/i.test(joined)) return 'Apple'
          if (/intel/i.test(joined)) return 'Intel Inc.'
          if (/(amd|radeon|ati)/i.test(joined)) return 'ATI Technologies Inc.'
          if (/nvidia/i.test(joined)) return 'NVIDIA Corporation'
        }
        if (os === 'android') {
          if (/(qualcomm|adreno)/i.test(joined)) return 'Qualcomm'
          if (/(arm|mali)/i.test(joined)) return 'ARM'
          if (/(powervr|imgtec|imagination)/i.test(joined)) return 'Imagination Technologies'
          if (/apple/i.test(joined)) return 'Apple Inc.'
        }
        if (os === 'windows' || os === 'linux') {
          return 'Google Inc.'
        }
        return compactVendor(vendor)
      }
      const chromiumMaskedRenderer = (vendor: string, renderer: string): string => {
        const cleanRenderer = renderer.trim()
        if (!cleanRenderer) return chromiumRenderer(vendor, renderer)
        if (os === 'macOS' || os === 'android' || os === 'iOS') return cleanRenderer
        return chromiumRenderer(vendor, renderer)
      }
      if (isFirefoxPersona) {
        return {
          maskedVendor: 'Mozilla',
          maskedRenderer: 'Mozilla',
          debugVendor: rawVendor || '',
          debugRenderer: rawRenderer || '',
          exposeDebugRendererInfo: false,
        }
      }
      if (isSafariPersona) {
        const safariVendor = rawVendor || 'Apple Inc.'
        const safariRenderer = rawRenderer || 'Apple GPU'
        return {
          maskedVendor: safariVendor,
          maskedRenderer: safariRenderer,
          debugVendor: safariVendor,
          debugRenderer: safariRenderer,
          exposeDebugRendererInfo: true,
        }
      }
      if (isChromiumPersona) {
        const vendorSource = rawVendor || 'Google'
        return {
          maskedVendor: chromiumMaskedVendor(vendorSource, rawRenderer),
          maskedRenderer: chromiumMaskedRenderer(vendorSource, rawRenderer),
          debugVendor: chromiumVendor(vendorSource),
          debugRenderer: chromiumRenderer(vendorSource, rawRenderer),
          exposeDebugRendererInfo: true,
        }
      }
      const vendorSource = rawVendor || 'Google'
      return {
        maskedVendor: chromiumMaskedVendor(vendorSource, rawRenderer),
        maskedRenderer: chromiumMaskedRenderer(vendorSource, rawRenderer),
        debugVendor: chromiumVendor(vendorSource),
        debugRenderer: chromiumRenderer(vendorSource, rawRenderer),
        exposeDebugRendererInfo: true,
      }
    }

    const webglIdentity = buildWebGlIdentity()
    const glMaskedVendor = webglIdentity.maskedVendor
    const glMaskedRenderer = webglIdentity.maskedRenderer
    const glDebugVendor = webglIdentity.debugVendor
    const glDebugRenderer = webglIdentity.debugRenderer
    const exposeDebugRendererInfo = webglIdentity.exposeDebugRendererInfo
    const contextAttrsByContext = new WeakMap<object, Record<string, unknown>>()
    const webGlErrorsByContext = new WeakMap<object, number[]>()
    const extensionCacheByContext = new WeakMap<object, Map<string, object>>()
    const defaultContextAttrs = buildWebGlDefaultContextAttributes(plan)
    const INVALID_ENUM = 1280

    const pushWebGlError = (self: unknown, code: number): void => {
      if (!self || typeof self !== 'object') return
      const list = webGlErrorsByContext.get(self as object)
      if (list) {
        list.push(code)
        return
      }
      webGlErrorsByContext.set(self as object, [code])
    }

    const defineExtensionValue = (target: Record<string, unknown>, key: string, value: unknown): void => {
      Object.defineProperty(target, key, {
        value,
        configurable: true,
        enumerable: true,
        writable: false,
      })
    }

    const normalizeWebGlContextAttributes = (raw?: Record<string, unknown>): Record<string, unknown> => {
      const next: Record<string, unknown> = { ...defaultContextAttrs }
      if (raw && typeof raw === 'object') {
        for (const key of ['alpha', 'antialias', 'depth', 'desynchronized', 'failIfMajorPerformanceCaveat', 'premultipliedAlpha', 'preserveDrawingBuffer', 'stencil', 'xrCompatible'] as const) {
          if (typeof raw[key] === 'boolean') next[key] = raw[key]
        }
        const pp = raw['powerPreference']
        if (pp === 'default' || pp === 'high-performance' || pp === 'low-power') next['powerPreference'] = pp
      }
      if (isSafariPersona) next['desynchronized'] = false
      return next
    }

    const extensionSetFor = (isWebGl2Context: boolean): Set<string> => new Set((isWebGl2Context ? caps.webgl2Extensions : caps.extensions).map(ext => ext.toLowerCase()))

    const buildCompressedTextureFormats = (supported: ReadonlySet<string>): Int32Array => {
      const formats: number[] = []
      const push = (...values: number[]): void => {
        for (const value of values) {
          if (!formats.includes(value)) formats.push(value)
        }
      }

      if (supported.has('webgl_compressed_texture_s3tc')) push(33776, 33777, 33778, 33779)
      if (supported.has('webgl_compressed_texture_s3tc_srgb')) push(35916, 35917, 35918, 35919)
      if (supported.has('webgl_compressed_texture_astc')) push(37808, 37840)
      if (supported.has('webgl_compressed_texture_pvrtc')) push(35840, 35841, 35842, 35843)
      if (supported.has('ext_texture_compression_bptc')) push(36492, 36493)
      return new Int32Array(formats)
    }

    const isExtensionConstantSupported = (name: number, isWebGl2Context: boolean, supported: ReadonlySet<string>): boolean => {
      if (name === 37445 || name === 37446) return exposeDebugRendererInfo
      if (name === 34046 || name === 34047) return supported.has('ext_texture_filter_anisotropic')
      if (name === 35723) return isWebGl2Context || supported.has('oes_standard_derivatives')
      if (name >= 34852 && name <= 34868) return isWebGl2Context || supported.has('webgl_draw_buffers')
      if (name === 36063 || (name >= 36064 && name <= 36079)) return isWebGl2Context || supported.has('webgl_draw_buffers')
      if (name >= 34916 && name <= 34919) return supported.has(isWebGl2Context ? 'ext_disjoint_timer_query_webgl2' : 'ext_disjoint_timer_query')
      if (name === 35007 || name === 36392 || name === 36795) return supported.has(isWebGl2Context ? 'ext_disjoint_timer_query_webgl2' : 'ext_disjoint_timer_query')
      return true
    }

    const isMobileWebGlPersona = os === 'android' || os === 'iOS'

    const extensionScalarFor = (name: number, isWebGl2Context: boolean): number | null => {
      if (name === 34047) return isMobileWebGlPersona ? 8 : 16
      if (name === 34852) return isWebGl2Context ? Number(caps.webgl2Scalar[34852] ?? 4) : Math.min(4, Number(caps.scalar[34852] ?? 4))
      if (name === 36063) return isWebGl2Context ? Number(caps.webgl2Scalar[36063] ?? 4) : Math.min(4, Number(caps.scalar[36063] ?? 4))
      if (name === 36795) return 0
      if (name === 34916) return 32
      return null
    }

    const createWebGlExtensionStub = (name: string): object | null => {
      const lower = name.toLowerCase()
      const ext: Record<string, unknown> = {}
      const defineNoopMethod = (key: string, length: number, result?: unknown): void => {
        const fn = result === undefined
          ? cloak(Function(`return function ${key}(){}`)() as AnyFn, { name: key, length })
          : cloak(function(...args: unknown[]) { void args; return result }, { name: key, length })
        defineExtensionValue(ext, key, fn)
      }

      if (lower === 'webgl_debug_renderer_info') {
        defineExtensionValue(ext, 'UNMASKED_VENDOR_WEBGL', 37445)
        defineExtensionValue(ext, 'UNMASKED_RENDERER_WEBGL', 37446)
        return ext
      }
      if (lower === 'ext_texture_filter_anisotropic') {
        defineExtensionValue(ext, 'TEXTURE_MAX_ANISOTROPY_EXT', 34046)
        defineExtensionValue(ext, 'MAX_TEXTURE_MAX_ANISOTROPY_EXT', 34047)
        return ext
      }
      if (lower === 'webgl_lose_context') {
        defineNoopMethod('loseContext', 0)
        defineNoopMethod('restoreContext', 0)
        return ext
      }
      if (lower === 'angle_instanced_arrays') {
        defineExtensionValue(ext, 'VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE', 35070)
        defineNoopMethod('drawArraysInstancedANGLE', 4)
        defineNoopMethod('drawElementsInstancedANGLE', 5)
        defineNoopMethod('vertexAttribDivisorANGLE', 2)
        return ext
      }
      if (lower === 'oes_vertex_array_object') {
        defineExtensionValue(ext, 'VERTEX_ARRAY_BINDING_OES', 34229)
        defineNoopMethod('createVertexArrayOES', 0, {})
        defineNoopMethod('deleteVertexArrayOES', 1)
        defineNoopMethod('isVertexArrayOES', 1, false)
        defineNoopMethod('bindVertexArrayOES', 1)
        return ext
      }
      if (lower === 'webgl_draw_buffers') {
        defineExtensionValue(ext, 'MAX_DRAW_BUFFERS_WEBGL', 34852)
        defineExtensionValue(ext, 'MAX_COLOR_ATTACHMENTS_WEBGL', 36063)
        for (let i = 0; i < 16; i++) {
          defineExtensionValue(ext, `DRAW_BUFFER${i}_WEBGL`, 34853 + i)
          defineExtensionValue(ext, `COLOR_ATTACHMENT${i}_WEBGL`, 36064 + i)
        }
        defineNoopMethod('drawBuffersWEBGL', 1)
        return ext
      }
      if (lower === 'ext_disjoint_timer_query' || lower === 'ext_disjoint_timer_query_webgl2') {
        defineExtensionValue(ext, 'QUERY_COUNTER_BITS_EXT', 34916)
        defineExtensionValue(ext, 'CURRENT_QUERY_EXT', 34917)
        defineExtensionValue(ext, 'QUERY_RESULT_EXT', 34918)
        defineExtensionValue(ext, 'QUERY_RESULT_AVAILABLE_EXT', 34919)
        defineExtensionValue(ext, 'TIME_ELAPSED_EXT', 35007)
        defineExtensionValue(ext, 'TIMESTAMP_EXT', 36392)
        defineExtensionValue(ext, 'GPU_DISJOINT_EXT', 36795)
        defineNoopMethod('createQueryEXT', 0, {})
        defineNoopMethod('deleteQueryEXT', 1)
        defineNoopMethod('isQueryEXT', 1, false)
        defineNoopMethod('beginQueryEXT', 2)
        defineNoopMethod('endQueryEXT', 1)
        defineNoopMethod('queryCounterEXT', 2)
        defineNoopMethod('getQueryEXT', 2, null)
        defineNoopMethod('getQueryObjectEXT', 2, null)
        return ext
      }
      if (lower === 'khr_parallel_shader_compile') {
        defineExtensionValue(ext, 'COMPLETION_STATUS_KHR', 37297)
        return ext
      }
      if (lower === 'webgl_debug_shaders') {
        defineNoopMethod('getTranslatedShaderSource', 1, '')
        return ext
      }
      if (lower === 'oes_standard_derivatives') {
        defineExtensionValue(ext, 'FRAGMENT_SHADER_DERIVATIVE_HINT_OES', 35723)
        return ext
      }
      if (lower === 'webgl_multi_draw') {
        defineNoopMethod('multiDrawArraysWEBGL', 5)
        defineNoopMethod('multiDrawElementsWEBGL', 6)
        defineNoopMethod('multiDrawArraysInstancedWEBGL', 7)
        defineNoopMethod('multiDrawElementsInstancedWEBGL', 8)
        return ext
      }
      if (lower === 'webgl_compressed_texture_s3tc') {
        defineExtensionValue(ext, 'COMPRESSED_RGB_S3TC_DXT1_EXT', 33776)
        defineExtensionValue(ext, 'COMPRESSED_RGBA_S3TC_DXT1_EXT', 33777)
        defineExtensionValue(ext, 'COMPRESSED_RGBA_S3TC_DXT3_EXT', 33778)
        defineExtensionValue(ext, 'COMPRESSED_RGBA_S3TC_DXT5_EXT', 33779)
        return ext
      }
      if (lower === 'webgl_compressed_texture_s3tc_srgb') {
        defineExtensionValue(ext, 'COMPRESSED_SRGB_S3TC_DXT1_EXT', 35916)
        defineExtensionValue(ext, 'COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT', 35917)
        defineExtensionValue(ext, 'COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT', 35918)
        defineExtensionValue(ext, 'COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT', 35919)
        return ext
      }
      if (lower === 'webgl_compressed_texture_astc') {
        defineExtensionValue(ext, 'COMPRESSED_RGBA_ASTC_4x4_KHR', 37808)
        defineExtensionValue(ext, 'COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR', 37840)
        return ext
      }
      if (lower === 'webgl_compressed_texture_pvrtc') {
        defineExtensionValue(ext, 'COMPRESSED_RGB_PVRTC_4BPPV1_IMG', 35840)
        defineExtensionValue(ext, 'COMPRESSED_RGB_PVRTC_2BPPV1_IMG', 35841)
        defineExtensionValue(ext, 'COMPRESSED_RGBA_PVRTC_4BPPV1_IMG', 35842)
        defineExtensionValue(ext, 'COMPRESSED_RGBA_PVRTC_2BPPV1_IMG', 35843)
        return ext
      }
      if (lower === 'ext_texture_compression_bptc') {
        defineExtensionValue(ext, 'COMPRESSED_RGBA_BPTC_UNORM_EXT', 36492)
        defineExtensionValue(ext, 'COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT', 36493)
        return ext
      }
      if ([...caps.extensions, ...caps.webgl2Extensions].some((extName) => extName.toLowerCase() === lower)) {
        return ext
      }
      return null
    }

    const getOrCreateWebGlExtension = (self: unknown, name: string): object | null => {
      if (!self || typeof self !== 'object') return createWebGlExtensionStub(name)
      const lower = name.toLowerCase()
      let cache = extensionCacheByContext.get(self as object)
      if (!cache) {
        cache = new Map<string, object>()
        extensionCacheByContext.set(self as object, cache)
      }
      const cached = cache.get(lower)
      if (cached) return cached
      const created = createWebGlExtensionStub(lower)
      if (created) cache.set(lower, created)
      return created
    }

    const createSyntheticWebGlContext = (isWebGl2: boolean, attrs?: Record<string, unknown>): Record<string, unknown> => {
      const supported = extensionSetFor(isWebGl2)
      const contextAttrs = normalizeWebGlContextAttributes(attrs)
      let lastError = 0
      return {
        getParameter(name: number): unknown {
          switch (name) {
            case 34467:
              return buildCompressedTextureFormats(supported)
            case 37445:
              return glDebugVendor
            case 37446:
              return glDebugRenderer
            case 7936:
              return glMaskedVendor
            case 7937:
              return glMaskedRenderer
            case 7938:
              return isWebGl2 ? gl2Version : gl1Version
            case 35724:
              return isWebGl2 ? gl2Shading : gl1Shading
            default: {
              if (!isExtensionConstantSupported(name, isWebGl2, supported)) {
                lastError = INVALID_ENUM
                return null
              }
              const extensionScalar = extensionScalarFor(name, isWebGl2)
              if (extensionScalar !== null) return extensionScalar
              const scalar = isWebGl2 ? caps.webgl2Scalar : caps.scalar
              const vector = isWebGl2 ? caps.webgl2Vector : caps.vector
              if (Object.prototype.hasOwnProperty.call(scalar, name)) {
                return scalar[name]
              }
              if (Object.prototype.hasOwnProperty.call(vector, name)) {
                const raw = vector[name]
                return name === 33901 || name === 33902 ? new Float32Array(raw) : new Int32Array(raw)
              }
              return null
            }
          }
        },
        getExtension(name: string): unknown {
          const extName = String(name || '').toLowerCase()
          if (extName === 'webgl_debug_renderer_info') return getOrCreateWebGlExtension(this, extName)
          if (!supported.has(extName)) return null
          return getOrCreateWebGlExtension(this, extName)
        },
        getSupportedExtensions(): string[] {
          const next = [ ...(isWebGl2 ? caps.webgl2Extensions : caps.extensions) ]
          if (exposeDebugRendererInfo && !next.includes('WEBGL_debug_renderer_info')) next.push('WEBGL_debug_renderer_info')
          return next
        },
        getError(): number {
          const next = lastError
          lastError = 0
          return next
        },
        getContextAttributes(): Record<string, unknown> {
          return { ...contextAttrs }
        },
        getShaderPrecisionFormat(shaderType: number, precisionType: number): WebGLShaderPrecisionFormat | null {
          const key = `${shaderType}:${precisionType}`
          const entry = context.profile?.webglShaderPrecision?.table?.[key]
          if (!entry) {
            return {
              rangeMin: 127,
              rangeMax: 127,
              precision: precisionType === 36338 || precisionType === 36340 ? 23 : 0,
            } as WebGLShaderPrecisionFormat
          }
          return {
            rangeMin: entry.rangeMin,
            rangeMax: entry.rangeMax,
            precision: entry.precision,
          } as WebGLShaderPrecisionFormat
        },
      }
    }

    const patchCanvasGetContextForWebGl = (proto: object | undefined): void => {
      if (!proto || typeof (proto as Record<string, unknown>)['getContext'] !== 'function') return
      const orig = (proto as Record<string, unknown>)['getContext'] as AnyFn
      const patched = new Proxy(orig, {
        apply(target, self, args) {
          const kind = String(args[0] || '').toLowerCase()
          if (kind !== 'webgl' && kind !== 'webgl2' && kind !== 'experimental-webgl') return Reflect.apply(target, self, args)
          const raw = typeof args[1] === 'object' && args[1] !== null ? args[1] as Record<string, unknown> : undefined
          const result = Reflect.apply(target, self, args)
          const resolved = result && typeof result === 'object'
            ? result
            : spoofMode(plan, 'webgl') === 'real'
              ? result
              : createSyntheticWebGlContext(kind === 'webgl2', raw)
          if (resolved && typeof resolved === 'object') {
            contextAttrsByContext.set(resolved as object, normalizeWebGlContextAttributes(raw))
          }
          return resolved
        },
      })
      cloak(patched, orig)
      overload(proto, 'getContext', patched, { configurable: true, force: true, writable: true })
    }

    const wrap = <
      T extends {
        getParameter: (name: number) => unknown
        getExtension?: (name: string) => unknown
        getSupportedExtensions?: () => string[] | null
      },
    >(
      proto: T | undefined,
      glVersion: string,
      glShadingVersion: string,
      isWebGl2: boolean
    ): void => {
      if (!proto || typeof proto.getParameter !== 'function') {
        return
      }

      overload(
        proto,
        'getParameter',
        new Proxy(proto.getParameter, {
          apply(target, self, args: [number]) {
            const name = args[0]
            const supported = extensionSetFor(isWebGl2)

            switch (name) {
              case 34467:
                return buildCompressedTextureFormats(supported)
              case 37445:
                if (!exposeDebugRendererInfo) {
                  pushWebGlError(self, INVALID_ENUM)
                  return null
                }
                return glDebugVendor
              case 37446:
                if (!exposeDebugRendererInfo) {
                  pushWebGlError(self, INVALID_ENUM)
                  return null
                }
                return glDebugRenderer
              case 7936:
                return glMaskedVendor
              case 7937:
                return glMaskedRenderer
              case 7938:
                return glVersion
              case 35724:
                return glShadingVersion
              default: {
                if (!isExtensionConstantSupported(name, isWebGl2, supported)) {
                  pushWebGlError(self, INVALID_ENUM)
                  return null
                }
                const extensionScalar = extensionScalarFor(name, isWebGl2)
                if (extensionScalar !== null) return extensionScalar
                const scalar = isWebGl2 ? caps.webgl2Scalar : caps.scalar
                const vector = isWebGl2 ? caps.webgl2Vector : caps.vector
                if (Object.prototype.hasOwnProperty.call(scalar, name)) {
                  return scalar[name]
                }
                if (Object.prototype.hasOwnProperty.call(vector, name)) {
                  const raw = vector[name]
                  return name === 33901 || name === 33902 ? new Float32Array(raw) : new Int32Array(raw)
                }
                return Reflect.apply(target, self, args)
              }
            }
          },
        }),
        { configurable: true, force: true, writable: true }
      )

      if (typeof proto.getExtension === 'function') {
        overload(
          proto,
          'getExtension',
          new Proxy(proto.getExtension, {
            apply(target, self, args: [string]) {
              const extName = String(args[0] || '').toLowerCase()
              const supported = new Set((isWebGl2 ? caps.webgl2Extensions : caps.extensions).map(ext => ext.toLowerCase()))
              if (extName === 'webgl_debug_renderer_info') {
                // Browser-aware WebGL identity model:
                // - Chromium/WebKit personas expose the debug extension with persona-matched values
                // - Firefox persona also exposes it, but masked VENDOR/RENDERER stay Mozilla/Mozilla
                // - unsupported personas return null
                return exposeDebugRendererInfo ? getOrCreateWebGlExtension(self, extName) : null
              }
              if (!supported.has(extName)) {
                return null
              }
              const nativeValue = Reflect.apply(target, self, args)
              if (nativeValue != null) return nativeValue
              return getOrCreateWebGlExtension(self, extName)
            },
          }),
          { configurable: true, force: true, writable: true }
        )
      }

      if (typeof (proto as Record<string, unknown>).getProgramParameter === 'function') {
        const origGetProgramParameter = (proto as Record<string, unknown>).getProgramParameter as AnyFn
        const patchedGetProgramParameter = new Proxy(origGetProgramParameter, {
          apply(target, self, args) {
            const pname = Number(args[1])
            if (pname === 37297) {
              const supported = extensionSetFor(isWebGl2)
              if (!supported.has('khr_parallel_shader_compile')) {
                pushWebGlError(self, INVALID_ENUM)
                return null
              }
              return true
            }
            return Reflect.apply(target, self, args)
          },
        })
        cloak(patchedGetProgramParameter, origGetProgramParameter)
        overload(proto as object, 'getProgramParameter', patchedGetProgramParameter, { configurable: true, force: true, writable: true })
      }

      if (typeof proto.getSupportedExtensions === 'function') {
        overload(
          proto,
          'getSupportedExtensions',
          new Proxy(proto.getSupportedExtensions, {
            apply(target, self, args) {
              const current = Reflect.apply(target, self, args)
              const currentList = Array.isArray(current) ? current.map(value => String(value)) : []
              const allow = isWebGl2 ? caps.webgl2Extensions : caps.extensions
              const next: string[] = []
              const pushUnique = (value: string): void => {
                if (!next.includes(value)) next.push(value)
              }

              for (const ext of allow) pushUnique(ext)
              for (const ext of currentList) {
                if (allow.includes(ext)) pushUnique(ext)
              }

              const idx = next.indexOf('WEBGL_debug_renderer_info')
              if (exposeDebugRendererInfo) {
                if (idx === -1) next.push('WEBGL_debug_renderer_info')
              } else if (idx !== -1) {
                next.splice(idx, 1)
              }

              return next.slice()
            },
          }),
          { configurable: true, force: true, writable: true }
        )
      }

      if (typeof (proto as Record<string, unknown>)['getError'] === 'function') {
        const origGetError = (proto as Record<string, unknown>)['getError'] as AnyFn
        const patchedGetError = new Proxy(origGetError, {
          apply(target, self, args) {
            if (self && typeof self === 'object') {
              const queued = webGlErrorsByContext.get(self as object)
              if (queued && queued.length) {
                const next = queued.shift() || 0
                if (!queued.length) webGlErrorsByContext.delete(self as object)
                return next
              }
            }
            return Reflect.apply(target, self, args)
          },
        })
        cloak(patchedGetError, origGetError)
        overload(proto, 'getError', patchedGetError, { configurable: true, force: true, writable: true })
      }

      if (typeof (proto as Record<string, unknown>)['getContextAttributes'] === 'function') {
        const origGetContextAttributes = (proto as Record<string, unknown>)['getContextAttributes'] as AnyFn
        const patchedGetContextAttributes = new Proxy(origGetContextAttributes, {
          apply(target, self, args) {
            const stored = self && typeof self === 'object' ? contextAttrsByContext.get(self as object) : undefined
            if (stored) return { ...stored }
            const current = Reflect.apply(target, self, args)
            if (current && typeof current === 'object') return normalizeWebGlContextAttributes(current as Record<string, unknown>)
            return current
          },
        })
        cloak(patchedGetContextAttributes, origGetContextAttributes)
        overload(proto as object, 'getContextAttributes', patchedGetContextAttributes, { configurable: true, force: true, writable: true })
      }

      if (typeof (proto as Record<string, unknown>).getShaderPrecisionFormat === 'function') {
        const origGetSPF = (proto as Record<string, unknown>).getShaderPrecisionFormat as (shaderType: number, precisionType: number) => WebGLShaderPrecisionFormat | null
        const spfTable = context.profile?.webglShaderPrecision?.table ?? {}
        const patchedGetSPF = new Proxy(origGetSPF, {
          apply(target, self, args) {
            const result = Reflect.apply(target, self, args) as WebGLShaderPrecisionFormat | null
            if (!result) return result
            const key = `${args[0]}:${args[1]}`
            const entry = spfTable[key]
            if (!entry) return result
            return new Proxy(result, {
              get(t, prop, receiver) {
                if (prop === 'rangeMin') return entry.rangeMin
                if (prop === 'rangeMax') return entry.rangeMax
                if (prop === 'precision') return entry.precision
                return Reflect.get(t, prop, receiver)
              },
            })
          },
        })
        cloak(patchedGetSPF, origGetSPF)
        overload(proto as object, 'getShaderPrecisionFormat', patchedGetSPF, { configurable: true, force: true, writable: true })
      }
    }

    const gl1Version = isChromiumPersona ? 'WebGL 1.0 (OpenGL ES 2.0 Chromium)' : 'WebGL 1.0'
    const gl1Shading = isChromiumPersona ? 'WebGL GLSL ES 1.00 (OpenGL ES GLSL ES 1.0 Chromium)' : 'WebGL GLSL ES 1.00'
    const gl2Version = isChromiumPersona ? 'WebGL 2.0 (OpenGL ES 3.0 Chromium)' : 'WebGL 2.0'
    const gl2Shading = isChromiumPersona ? 'WebGL GLSL ES 3.00 (OpenGL ES GLSL ES 3.0 Chromium)' : 'WebGL GLSL ES 3.00'

    patchCanvasGetContextForWebGl(realm.HTMLCanvasElement?.prototype)
    patchCanvasGetContextForWebGl((realm as WindowRealm & { OffscreenCanvas?: { prototype?: object } }).OffscreenCanvas?.prototype)

    wrap(realm.WebGLRenderingContext?.prototype, gl1Version, gl1Shading, false)
    wrap(realm.WebGL2RenderingContext?.prototype, gl2Version, gl2Shading, true)
  }

  const applyWebGpuSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const context = plan
    const profile = context.profile

    if (!profile || surfaceIsRestricted(plan, 'webGpu')) {
      return
    }

    const ua = context.payload.current
    const personaSupportsWebGpu = realm.isSecureContext === true && browserCapHas('navigator.gpu', ua.browser, ua.version.browser.major)
    const navigatorWithGpu = realm.navigator as Navigator & Record<string, unknown> & {
      gpu?: {
        requestAdapter?: (...args: readonly unknown[]) => Promise<object | null>
        getPreferredCanvasFormat?: () => string
      }
    }

    const buildAdapterInfo = (current?: Record<string, unknown>): Record<string, unknown> => ({
      ...(current || {}),
      vendor: profile.gpu.vendor,
      architecture: profile.gpu.architecture,
      device: profile.gpu.device,
      description: profile.gpu.description,
      isFallbackAdapter: profile.gpu.isFallbackAdapter,
    })

    const gpuCap = profile.gpuCapability
    const preferredFormat: 'rgba8unorm' | 'bgra8unorm' = gpuCap.preferredCanvasFormat
    const configByContext = new WeakMap<object, Record<string, unknown> | null>()

    const buildFeaturesSet = (): object => {
      const set = new Set<string>(gpuCap.features)
      return new Proxy(set, {
        get(t, prop, receiver) {
          return Reflect.get(t, prop, receiver)
        },
      })
    }

    const buildLimitsObj = (): object => {
      return new Proxy(gpuCap.limits as Record<string, unknown>, {
        get(t, prop, receiver) {
          if (typeof prop === 'string' && Object.prototype.hasOwnProperty.call(t, prop)) return t[prop]
          return Reflect.get(t, prop, receiver)
        },
        has(t, prop) {
          return typeof prop === 'string' && Object.prototype.hasOwnProperty.call(t, prop)
        },
      })
    }

    const makeNoop = (name: string, length: number): AnyFn => cloak(Function(`return function ${name}(){}`)() as AnyFn, { name, length })
    const makeResolved = (name: string, length: number, value: unknown): AnyFn => {
      const fn = function(...args: unknown[]) { void args; return Promise.resolve(value) }
      return cloak(fn as AnyFn, { name, length })
    }

    const createSyntheticTexture = (): Record<string, unknown> => ({
      createView: cloak(function createView() { return {} }, { name: 'createView', length: 0 }),
      destroy: makeNoop('destroy', 0),
    })

    const createSyntheticQueue = (): Record<string, unknown> => ({
      submit: makeNoop('submit', 1),
      onSubmittedWorkDone: makeResolved('onSubmittedWorkDone', 0, undefined),
      writeBuffer: makeNoop('writeBuffer', 5),
      writeTexture: makeNoop('writeTexture', 4),
      copyExternalImageToTexture: makeNoop('copyExternalImageToTexture', 3),
    })

    const createSyntheticDevice = (): Record<string, unknown> => {
      const features = buildFeaturesSet()
      const limits = buildLimitsObj()
      const queue = createSyntheticQueue()
      const createCommandEncoder = cloak(function createCommandEncoder() {
        return {
          beginRenderPass: cloak(function beginRenderPass() {
            return { end: makeNoop('end', 0), setPipeline: makeNoop('setPipeline', 1), setBindGroup: makeNoop('setBindGroup', 2), draw: makeNoop('draw', 4) }
          }, { name: 'beginRenderPass', length: 1 }),
          beginComputePass: cloak(function beginComputePass() {
            return { end: makeNoop('end', 0), setPipeline: makeNoop('setPipeline', 1), setBindGroup: makeNoop('setBindGroup', 2), dispatchWorkgroups: makeNoop('dispatchWorkgroups', 3) }
          }, { name: 'beginComputePass', length: 1 }),
          finish: cloak(function finish() { return {} }, { name: 'finish', length: 0 }),
          copyBufferToBuffer: makeNoop('copyBufferToBuffer', 5),
          copyBufferToTexture: makeNoop('copyBufferToTexture', 3),
          copyTextureToBuffer: makeNoop('copyTextureToBuffer', 3),
          copyTextureToTexture: makeNoop('copyTextureToTexture', 3),
        }
      }, { name: 'createCommandEncoder', length: 1 })
      return {
        features,
        limits,
        queue,
        lost: new Promise<never>(() => { void 0 }),
        destroy: makeNoop('destroy', 0),
        pushErrorScope: makeNoop('pushErrorScope', 1),
        popErrorScope: makeResolved('popErrorScope', 0, null),
        createBuffer: cloak(function createBuffer() {
          return {
            destroy: makeNoop('destroy', 0),
            mapAsync: makeResolved('mapAsync', 2, undefined),
            getMappedRange: cloak(function getMappedRange() { return new ArrayBuffer(0) }, { name: 'getMappedRange', length: 0 }),
            unmap: makeNoop('unmap', 0),
          }
        }, { name: 'createBuffer', length: 1 }),
        createTexture: cloak(function createTexture() { return createSyntheticTexture() }, { name: 'createTexture', length: 1 }),
        createSampler: cloak(function createSampler() { return {} }, { name: 'createSampler', length: 1 }),
        createBindGroupLayout: cloak(function createBindGroupLayout() { return {} }, { name: 'createBindGroupLayout', length: 1 }),
        createPipelineLayout: cloak(function createPipelineLayout() { return {} }, { name: 'createPipelineLayout', length: 1 }),
        createBindGroup: cloak(function createBindGroup() { return {} }, { name: 'createBindGroup', length: 1 }),
        createShaderModule: cloak(function createShaderModule() { return { compilationInfo: makeResolved('compilationInfo', 0, { messages: [] }) } }, { name: 'createShaderModule', length: 1 }),
        createRenderPipeline: cloak(function createRenderPipeline() { return {} }, { name: 'createRenderPipeline', length: 1 }),
        createComputePipeline: cloak(function createComputePipeline() { return {} }, { name: 'createComputePipeline', length: 1 }),
        createRenderPipelineAsync: makeResolved('createRenderPipelineAsync', 1, {}),
        createComputePipelineAsync: makeResolved('createComputePipelineAsync', 1, {}),
        createCommandEncoder,
        importExternalTexture: cloak(function importExternalTexture() { return {} }, { name: 'importExternalTexture', length: 1 }),
      }
    }

    const wrapDevice = (device: object): object => {
      const cached = wrappedGpuDevices.get(device)
      if (cached) return cached
      const cachedFeatures = buildFeaturesSet()
      const cachedLimits = buildLimitsObj()
      const wrapped = new Proxy(device, {
        get(target, prop, receiver) {
          if (prop === 'features') return cachedFeatures
          if (prop === 'limits') return cachedLimits
          return Reflect.get(target, prop, receiver)
        },
      })
      wrappedGpuDevices.set(device, wrapped)
      return wrapped
    }

    const syntheticDeviceFactory = (): object => wrapDevice(createSyntheticDevice())

    const wrapAdapter = (adapter: object): object => {
      const cached = wrappedGpuAdapters.get(adapter)
      if (cached) return cached
      const cachedFeatures = buildFeaturesSet()
      const cachedLimits = buildLimitsObj()
      const wrapped = new Proxy(adapter, {
        get(target, prop, receiver) {
          if (prop === 'info') {
            const current = Reflect.get(target, prop, receiver)
            return buildAdapterInfo(typeof current === 'object' && current !== null ? (current as Record<string, unknown>) : undefined)
          }
          if (prop === 'isFallbackAdapter') return profile.gpu.isFallbackAdapter
          if (prop === 'features') return cachedFeatures
          if (prop === 'limits') return cachedLimits
          if (prop === 'requestAdapterInfo') {
            const current = Reflect.get(target, prop, receiver)
            if (typeof current !== 'function') return makeResolved('requestAdapterInfo', 0, buildAdapterInfo())
            return new Proxy(current as (...args: readonly unknown[]) => Promise<unknown>, {
              apply(innerTarget, thisArg, args) {
                return Promise.resolve(Reflect.apply(innerTarget, thisArg, args)).then((value) =>
                  buildAdapterInfo(typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined)
                )
              },
            })
          }
          if (prop === 'requestDevice') {
            const current = Reflect.get(target, prop, receiver)
            if (typeof current !== 'function') return makeResolved('requestDevice', 1, syntheticDeviceFactory())
            return new Proxy(current as (...args: readonly unknown[]) => Promise<unknown>, {
              apply(innerTarget, thisArg, args) {
                return Promise.resolve(Reflect.apply(innerTarget, thisArg, args)).then((value) =>
                  value && typeof value === 'object' ? wrapDevice(value) : syntheticDeviceFactory()
                )
              },
            })
          }
          return Reflect.get(target, prop, receiver)
        },
      })
      wrappedGpuAdapters.set(adapter, wrapped)
      return wrapped
    }

    const createSyntheticAdapter = (): object => {
      const adapter = {
        features: buildFeaturesSet(),
        limits: buildLimitsObj(),
        info: buildAdapterInfo(),
        isFallbackAdapter: profile.gpu.isFallbackAdapter,
        requestAdapterInfo: makeResolved('requestAdapterInfo', 0, buildAdapterInfo()),
        requestDevice: makeResolved('requestDevice', 1, syntheticDeviceFactory()),
      }
      return wrapAdapter(adapter)
    }

    const ensureGpuObject = (): Record<string, unknown> => {
      if (navigatorWithGpu.gpu && typeof navigatorWithGpu.gpu === 'object') {
        return navigatorWithGpu.gpu as Record<string, unknown>
      }
      const gpuObj: Record<string, unknown> = {}
      gpuObj['requestAdapter'] = makeResolved('requestAdapter', 1, createSyntheticAdapter())
      gpuObj['getPreferredCanvasFormat'] = cloak(function getPreferredCanvasFormat() { return preferredFormat }, { name: 'getPreferredCanvasFormat', length: 0 })
      gpuObj['wgslLanguageFeatures'] = new Set<string>(gpuCap.wgslLanguageFeatures)
      installNavigatorProtoGetter(realm.navigator as Navigator & Record<string, unknown>, 'gpu', () => gpuObj)
      return gpuObj
    }

    const patchCanvasContextMethods = (ctx: object): object => {
      const ctxRec = ctx as Record<string, unknown>
      if (typeof ctxRec['configure'] === 'function') {
        const orig = ctxRec['configure'] as AnyFn
        const patched = new Proxy(orig, {
          apply(target, self, args) {
            const raw = args[0]
            const current = typeof raw === 'object' && raw !== null ? { ...(raw as Record<string, unknown>) } : {}
            if (current['format'] == null) current['format'] = preferredFormat
            if (!Array.isArray(current['viewFormats'])) current['viewFormats'] = []
            configByContext.set(self as object, current)
            const nextArgs = args.length ? [current, ...args.slice(1)] : args
            return Reflect.apply(target, self, nextArgs)
          },
        })
        cloak(patched, orig)
        overload(ctxRec, 'configure', patched, { configurable: true, force: true, writable: true })
      }
      if (typeof ctxRec['unconfigure'] === 'function') {
        const orig = ctxRec['unconfigure'] as AnyFn
        const patched = new Proxy(orig, {
          apply(target, self, args) {
            configByContext.set(self as object, null)
            return Reflect.apply(target, self, args)
          },
        })
        cloak(patched, orig)
        overload(ctxRec, 'unconfigure', patched, { configurable: true, force: true, writable: true })
      }
      if (typeof ctxRec['getConfiguration'] === 'function') {
        const orig = ctxRec['getConfiguration'] as AnyFn
        const patched = new Proxy(orig, {
          apply(target, self, args) {
            const stored = configByContext.get(self as object)
            if (stored) return { ...stored }
            return Reflect.apply(target, self, args)
          },
        })
        cloak(patched, orig)
        overload(ctxRec, 'getConfiguration', patched, { configurable: true, force: true, writable: true })
      }
      return ctx
    }

    const createSyntheticCanvasContext = (): object => {
      const proto = (realm as WindowRealm & { GPUCanvasContext?: { prototype?: object } }).GPUCanvasContext?.prototype ?? Object.prototype
      const ctx = Object.create(proto) as Record<string, unknown>
      const getCurrentTexture = cloak(function getCurrentTexture() { return createSyntheticTexture() }, { name: 'getCurrentTexture', length: 0 })
      const configure = cloak(function configure(configuration?: Record<string, unknown>) {
        const current = typeof configuration === 'object' && configuration !== null ? { ...configuration } : {}
        if (current['format'] == null) current['format'] = preferredFormat
        if (!Array.isArray(current['viewFormats'])) current['viewFormats'] = []
        configByContext.set(ctx, current)
      }, { name: 'configure', length: 1 })
      const unconfigure = cloak(function unconfigure() { configByContext.set(ctx, null) }, { name: 'unconfigure', length: 0 })
      const getConfiguration = cloak(function getConfiguration() {
        const current = configByContext.get(ctx)
        return current ? { ...current } : null
      }, { name: 'getConfiguration', length: 0 })
      nativeDefineProperty(ctx, 'getCurrentTexture', { value: getCurrentTexture, configurable: true, writable: true, enumerable: true })
      nativeDefineProperty(ctx, 'configure', { value: configure, configurable: true, writable: true, enumerable: true })
      nativeDefineProperty(ctx, 'unconfigure', { value: unconfigure, configurable: true, writable: true, enumerable: true })
      nativeDefineProperty(ctx, 'getConfiguration', { value: getConfiguration, configurable: true, writable: true, enumerable: true })
      return ctx
    }

    const patchCanvasGetContext = (proto: object | undefined): void => {
      if (!proto || typeof (proto as Record<string, unknown>)['getContext'] !== 'function') return
      const orig = (proto as Record<string, unknown>)['getContext'] as AnyFn
      const patched = new Proxy(orig, {
        apply(target, self, args) {
          const kind = String(args[0] || '').toLowerCase()
          if (kind !== 'webgpu') return Reflect.apply(target, self, args)
          if (!personaSupportsWebGpu) return null
          const current = Reflect.apply(target, self, args)
          if (current && typeof current === 'object') return patchCanvasContextMethods(current as object)
          return createSyntheticCanvasContext()
        },
      })
      cloak(patched, orig)
      overload(proto, 'getContext', patched, { configurable: true, force: true, writable: true })
    }

    patchCanvasGetContext(realm.HTMLCanvasElement?.prototype)
    patchCanvasGetContext((realm as WindowRealm & { OffscreenCanvas?: { prototype?: object } }).OffscreenCanvas?.prototype)

    if (!personaSupportsWebGpu) {
      if ('gpu' in navigatorWithGpu) removeNavigatorProtoProperty(navigatorWithGpu as Navigator & Record<string, unknown>, 'gpu')
      return
    }

    const gpuObj = ensureGpuObject()
    const requestAdapter = gpuObj['requestAdapter']
    if (typeof requestAdapter === 'function') {
      const patchedRequestAdapter = new Proxy(requestAdapter as AnyFn, {
        apply(target, self, args) {
          return Promise.resolve(Reflect.apply(target, self, args)).then((adapter) =>
            adapter && typeof adapter === 'object' ? wrapAdapter(adapter) : createSyntheticAdapter()
          )
        },
      })
      cloak(patchedRequestAdapter, requestAdapter as AnyFn)
      overload(gpuObj, 'requestAdapter', patchedRequestAdapter, { configurable: true, force: true, writable: true })
    } else {
      overload(gpuObj, 'requestAdapter', makeResolved('requestAdapter', 1, createSyntheticAdapter()), { configurable: true, force: true, writable: true })
    }

    if (typeof gpuObj['getPreferredCanvasFormat'] === 'function') {
      const origGPCF = gpuObj['getPreferredCanvasFormat'] as AnyFn
      const patchedGPCF = new Proxy(origGPCF, { apply() { return preferredFormat } })
      cloak(patchedGPCF, origGPCF)
      overload(gpuObj, 'getPreferredCanvasFormat', patchedGPCF, { configurable: true, force: true, writable: true })
    } else {
      overload(gpuObj, 'getPreferredCanvasFormat', cloak(function getPreferredCanvasFormat() { return preferredFormat }, { name: 'getPreferredCanvasFormat', length: 0 }), { configurable: true, force: true, writable: true })
    }

    overload(gpuObj, 'wgslLanguageFeatures', new Set<string>(gpuCap.wgslLanguageFeatures), { configurable: true, force: true })

    const gpuCanvasProto = (realm as WindowRealm & { GPUCanvasContext?: { prototype?: Record<string, unknown> } }).GPUCanvasContext?.prototype
    if (gpuCanvasProto && typeof gpuCanvasProto === 'object') patchCanvasContextMethods(gpuCanvasProto)
  }

  const applyMediaCapabilitiesSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const context = plan
    const profile = context.profile
    if (!profile) return

    const ua = context.payload.current
    const nav = realm.navigator as Navigator & Record<string, unknown> & { mediaCapabilities?: unknown }
    const personaSupports = browserCapHas('navigator.mediaCapabilities', ua.browser, ua.version.browser.major)
    const currentPresent = 'mediaCapabilities' in nav

    if (!personaSupports) {
      if (currentPresent) removeNavigatorProtoProperty(nav, 'mediaCapabilities')
      return
    }

    type MediaCapabilityInfo = { supported: boolean; smooth: boolean; powerEfficient: boolean; keySystemAccess: null }
    const browser = ua.browser
    const os = ua.os
    const isMobile = profile.mobile
    const maxWidth = isMobile ? 2560 : 3840
    const maxHeight = isMobile ? 1440 : 2160
    const maxFps = isMobile ? 60 : 120
    const maxBitrate = isMobile ? 20_000_000 : 60_000_000

    const normalizeType = (value: unknown): string => String(value || '').trim().toLowerCase()
    const isSafari = browser === 'safari'
    const isFirefox = browser === 'firefox'
    const isChromium = browser === 'chrome' || browser === 'edge' || browser === 'opera'
    const hasAny = (contentType: string, needles: readonly string[]): boolean => needles.some((needle) => contentType.includes(needle))
    const audioDecodeSupported = (contentType: string): boolean => {
      if (hasAny(contentType, ['audio/mp4', 'audio/aac', 'mp4a', 'aac'])) return true
      if (hasAny(contentType, ['audio/mpeg', 'audio/mp3', 'mp3'])) return true
      if (hasAny(contentType, ['audio/wav', 'audio/wave', 'pcm'])) return true
      if (hasAny(contentType, ['audio/flac', 'flac'])) return true
      if (hasAny(contentType, ['opus', 'vorbis', 'audio/ogg', 'audio/webm'])) return !isSafari
      return false
    }
    const audioEncodeSupported = (contentType: string): boolean => {
      if (hasAny(contentType, ['audio/mp4', 'audio/aac', 'mp4a', 'aac'])) return isChromium || isSafari
      if (hasAny(contentType, ['audio/webm', 'audio/ogg', 'opus', 'vorbis'])) return !isSafari
      if (hasAny(contentType, ['audio/wav', 'audio/wave'])) return true
      return false
    }
    const videoDecodeSupported = (contentType: string): boolean => {
      if (hasAny(contentType, ['avc1', 'avc3', 'h.264', 'h264', 'video/mp4'])) return true
      if (hasAny(contentType, ['vp8', 'vp09', 'vp9', 'video/webm'])) return !isSafari
      if (hasAny(contentType, ['av01', 'av1'])) return isChromium || isFirefox
      if (hasAny(contentType, ['hev1', 'hvc1', 'hevc', 'h.265', 'h265'])) return isSafari || (isChromium && os === 'macOS')
      return false
    }
    const videoEncodeSupported = (contentType: string): boolean => {
      if (hasAny(contentType, ['avc1', 'avc3', 'h.264', 'h264', 'video/mp4'])) return isChromium || isSafari
      if (hasAny(contentType, ['vp8', 'vp09', 'vp9', 'video/webm'])) return isChromium || isFirefox
      if (hasAny(contentType, ['av01', 'av1'])) return isChromium && ua.version.browser.major >= 121 && !isMobile
      return false
    }
    const scoreVideo = (cfg: Record<string, unknown>, supported: boolean): MediaCapabilityInfo => {
      if (!supported) return { supported: false, smooth: false, powerEfficient: false, keySystemAccess: null }
      const width = Math.max(0, Number(cfg['width'] || 0))
      const height = Math.max(0, Number(cfg['height'] || 0))
      const framerate = Math.max(0, Number(cfg['framerate'] || 0))
      const bitrate = Math.max(0, Number(cfg['bitrate'] || 0))
      const pixels = width * height
      const withinBounds = width <= maxWidth && height <= maxHeight && framerate <= maxFps && bitrate <= maxBitrate
      if (!withinBounds) return { supported: false, smooth: false, powerEfficient: false, keySystemAccess: null }
      const smooth = pixels <= (isMobile ? 2_073_600 : 8_294_400) && framerate <= (isMobile ? 60 : 120) && bitrate <= (isMobile ? 12_000_000 : 35_000_000)
      const powerEfficient = smooth && bitrate <= (isMobile ? 8_000_000 : 20_000_000)
      return { supported: true, smooth, powerEfficient, keySystemAccess: null }
    }
    const scoreAudio = (cfg: Record<string, unknown>, supported: boolean): MediaCapabilityInfo => {
      if (!supported) return { supported: false, smooth: false, powerEfficient: false, keySystemAccess: null }
      const channels = Math.max(1, Number(cfg['channels'] || 2))
      const bitrate = Math.max(0, Number(cfg['bitrate'] || 0))
      const samplerate = Math.max(0, Number(cfg['samplerate'] || 0))
      const ok = channels <= 8 && bitrate <= 1_536_000 && samplerate <= 192_000
      return { supported: ok, smooth: ok, powerEfficient: ok, keySystemAccess: null }
    }
    const validateConfig = (configuration: unknown): Record<string, unknown> => {
      if (!configuration || typeof configuration !== 'object') throw new TypeError('Invalid media capability configuration')
      const cfg = configuration as Record<string, unknown>
      const type = normalizeType(cfg['type'])
      if (type !== 'file' && type !== 'media-source' && type !== 'webrtc') throw new TypeError('Invalid media capability type')
      return cfg
    }

    const decodingInfo = cloak(function decodingInfo(configuration: unknown) {
      const cfg = validateConfig(configuration)
      if (cfg['keySystemConfiguration'] != null && realm.isSecureContext !== true) {
        return Promise.reject(new realm.DOMException('The operation is insecure.', 'SecurityError'))
      }
      const audio = cfg['audio']
      if (audio && typeof audio === 'object') {
        const info = scoreAudio(audio as Record<string, unknown>, audioDecodeSupported(normalizeType((audio as Record<string, unknown>)['contentType'])))
        return Promise.resolve(info)
      }
      const video = cfg['video']
      if (video && typeof video === 'object') {
        const info = scoreVideo(video as Record<string, unknown>, videoDecodeSupported(normalizeType((video as Record<string, unknown>)['contentType'])))
        return Promise.resolve(info)
      }
      return Promise.reject(new TypeError('Invalid media capability configuration'))
    }, { name: 'decodingInfo', length: 1 })

    const encodingInfo = cloak(function encodingInfo(configuration: unknown) {
      const cfg = validateConfig(configuration)
      const audio = cfg['audio']
      if (audio && typeof audio === 'object') {
        const info = scoreAudio(audio as Record<string, unknown>, audioEncodeSupported(normalizeType((audio as Record<string, unknown>)['contentType'])))
        return Promise.resolve(info)
      }
      const video = cfg['video']
      if (video && typeof video === 'object') {
        const info = scoreVideo(video as Record<string, unknown>, videoEncodeSupported(normalizeType((video as Record<string, unknown>)['contentType'])))
        return Promise.resolve(info)
      }
      return Promise.reject(new TypeError('Invalid media capability configuration'))
    }, { name: 'encodingInfo', length: 1 })

    const ensureMediaCapabilitiesObject = (): Record<string, unknown> => {
      if (nav.mediaCapabilities && typeof nav.mediaCapabilities === 'object') return nav.mediaCapabilities as unknown as Record<string, unknown>
      const proto = (realm as WindowRealm & Record<string, unknown>)['MediaCapabilities'] && typeof (realm as WindowRealm & Record<string, unknown>)['MediaCapabilities'] === 'function'
        ? (((realm as WindowRealm & { MediaCapabilities?: { prototype?: object } }).MediaCapabilities?.prototype) ?? Object.prototype)
        : Object.prototype
      const mc = Object.create(proto) as Record<string, unknown>
      nativeDefineProperty(mc, 'decodingInfo', { value: decodingInfo, configurable: true, writable: true, enumerable: true })
      nativeDefineProperty(mc, 'encodingInfo', { value: encodingInfo, configurable: true, writable: true, enumerable: true })
      installNavigatorProtoGetter(nav, 'mediaCapabilities', () => mc)
      return mc
    }

    const mediaCapabilities = ensureMediaCapabilitiesObject()
    overload(mediaCapabilities, 'decodingInfo', decodingInfo, { configurable: true, force: true, writable: true })
    overload(mediaCapabilities, 'encodingInfo', encodingInfo, { configurable: true, force: true, writable: true })
  }

  const applyWindowScreenSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const snapshot = buildScreenSnapshot(plan, spoofMode(plan, 'screen'))
    const cssMediaSnapshot = buildCssMediaSnapshot(plan, snapshot)

    if (!snapshot && !cssMediaSnapshot) {
      return
    }

    if (snapshot) {
      overload(realm, 'devicePixelRatio', snapshot.devicePixelRatio, { configurable: true, force: true })
      overload(realm, 'innerWidth', snapshot.innerWidth, { configurable: true, force: true })
      overload(realm, 'innerHeight', snapshot.innerHeight, { configurable: true, force: true })
      overload(realm, 'outerWidth', snapshot.outerWidth, { configurable: true, force: true })
      overload(realm, 'outerHeight', snapshot.outerHeight, { configurable: true, force: true })
      overload(realm, 'orientation', snapshot.orientationAngle, { configurable: true, force: true })

      if (snapshot.touch) {
        overload(realm, 'ontouchstart', null, { configurable: true, force: true, writable: true })
      }

      const screenProps: Array<[keyof Screen, number]> = [
        ['width', snapshot.width],
        ['height', snapshot.height],
        ['availWidth', snapshot.availWidth],
        ['availHeight', snapshot.availHeight],
        ['colorDepth', snapshot.colorDepth],
        ['pixelDepth', snapshot.pixelDepth],
      ]

      for (const [prop, value] of screenProps) {
        overload(realm.screen, prop, value, { configurable: true, force: true })
      }

      if (realm.screen.orientation) {
        overload(realm.screen.orientation, 'type', snapshot.orientationType, { configurable: true, force: true })
        overload(realm.screen.orientation, 'angle', snapshot.orientationAngle, { configurable: true, force: true })
      }

      if (realm.visualViewport) {
        overload(realm.visualViewport, 'width', snapshot.visualViewportWidth, { configurable: true, force: true })
        overload(realm.visualViewport, 'height', snapshot.visualViewportHeight, { configurable: true, force: true })
        overload(realm.visualViewport, 'scale', snapshot.visualViewportScale, { configurable: true, force: true })
        overload(realm.visualViewport, 'pageLeft', 0, { configurable: true, force: true })
        overload(realm.visualViewport, 'pageTop', 0, { configurable: true, force: true })
        overload(realm.visualViewport, 'offsetLeft', 0, { configurable: true, force: true })
        overload(realm.visualViewport, 'offsetTop', 0, { configurable: true, force: true })
      }
    }

    if (cssMediaSnapshot && typeof realm.matchMedia === 'function') {
      overload(
        realm,
        'matchMedia',
        new Proxy(realm.matchMedia, {
          apply(target, self, args: [string]) {
            const query = String(args[0] || '')
            const current = Reflect.apply(target, self, args) as MediaQueryList
            const matches = evaluateMediaQuery(query, cssMediaSnapshot)
            return typeof matches === 'boolean' ? wrapMediaQueryList(current, matches) : current
          },
        }),
        { configurable: true, force: true, writable: true }
      )
    }

    if (cssMediaSnapshot && typeof realm.getComputedStyle === 'function') {
      const gcd = (left: number, right: number): number => right === 0 ? left : gcd(right, left % right)
      const ratioDivisor = gcd(cssMediaSnapshot.width, cssMediaSnapshot.height)
      const cssMediaCustomProps: Record<string, string> = {
        '--prefers-reduced-motion': cssMediaSnapshot.reducedMotion,
        '--prefers-color-scheme': cssMediaSnapshot.colorScheme,
        '--monochrome': cssMediaSnapshot.monochromeDepth > 0 ? 'monochrome' : 'non-monochrome',
        '--inverted-colors': cssMediaSnapshot.invertedColors,
        '--forced-colors': cssMediaSnapshot.forcedColors,
        '--any-hover': cssMediaSnapshot.anyHover,
        '--hover': cssMediaSnapshot.hover,
        '--any-pointer': cssMediaSnapshot.anyPointer,
        '--pointer': cssMediaSnapshot.pointer,
        '--device-aspect-ratio': `${cssMediaSnapshot.width / ratioDivisor}/${cssMediaSnapshot.height / ratioDivisor}`,
        '--device-screen': `${cssMediaSnapshot.width} x ${cssMediaSnapshot.height}`,
        '--device-width': String(cssMediaSnapshot.width),
        '--device-height': String(cssMediaSnapshot.height),
        '--display-mode': cssMediaSnapshot.displayMode,
        '--color-gamut': cssMediaSnapshot.colorGamut,
        '--orientation': cssMediaSnapshot.orientationType.startsWith('landscape') ? 'landscape' : 'portrait',
      }
      const nativeGetComputedStyle = realm.getComputedStyle
      const wrappedStyles = new WeakMap<object, CSSStyleDeclaration>()
      const patchComputedStyle = (style: CSSStyleDeclaration): CSSStyleDeclaration => {
        if (!style || typeof style !== 'object') {
          return style
        }
        const cached = wrappedStyles.get(style as unknown as object)
        if (cached) {
          return cached
        }
        const originalGetPropertyValue = typeof style.getPropertyValue === 'function' ? style.getPropertyValue : undefined
        if (!originalGetPropertyValue) {
          return style
        }
        const patchedGetPropertyValue = cloak(new Proxy(originalGetPropertyValue, {
          apply(target, self, args: [string]) {
            const prop = String(args[0] || '')
            if (Object.prototype.hasOwnProperty.call(cssMediaCustomProps, prop)) {
              return cssMediaCustomProps[prop]
            }
            return Reflect.apply(target, self, args)
          },
        }), originalGetPropertyValue)
        const proxy = new Proxy(style, {
          get(target, prop, receiver) {
            if (prop === 'getPropertyValue') {
              return patchedGetPropertyValue
            }
            return Reflect.get(target, prop, receiver)
          },
        }) as CSSStyleDeclaration
        cloak(proxy, style)
        wrappedStyles.set(style as unknown as object, proxy)
        return proxy
      }
      const patchedGetComputedStyle = cloak(new Proxy(nativeGetComputedStyle, {
        apply(target, self, args: [Element, string?]) {
          const computed = Reflect.apply(target, self, args) as CSSStyleDeclaration
          const element = args[0]
          if (!element || typeof element !== 'object') {
            return computed
          }
          const ownerDocument = (element as Element).ownerDocument
          if (!ownerDocument || ownerDocument.body !== element) {
            return computed
          }
          return patchComputedStyle(computed)
        },
      }), nativeGetComputedStyle)
      overload(realm, 'getComputedStyle', patchedGetComputedStyle, { configurable: true, force: true, writable: true })
    }
  }

  const applyMediaDevicesSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const context = plan
    const profile = context.profile
    const mediaDevices = realm.navigator.mediaDevices

    if (!mediaDevices || typeof mediaDevices.enumerateDevices !== 'function') {
      return
    }

    overload(
      mediaDevices,
      'enumerateDevices',
      new Proxy(mediaDevices.enumerateDevices, {
        apply(target, self, args) {
          if (surfaceIsRestricted(plan, 'mediaDevices')) {
            return Promise.resolve([])
          }

          if (!profile) {
            return Reflect.apply(target, self, args)
          }

          const labelsByKind: Record<string, boolean> = {
            audioinput: profile.permissions.microphone === 'granted',
            videoinput: profile.permissions.camera === 'granted',
            audiooutput: profile.permissions.speakerSelection === 'granted',
          }
          const seenKinds = new Set<string>()
          const visibleDevices = profile.mediaDevices.filter((device) => {
            if (labelsByKind[device.kind] === true) {
              return true
            }
            if (seenKinds.has(device.kind)) {
              return false
            }
            seenKinds.add(device.kind)
            return true
          })

          return Promise.resolve(
            visibleDevices.map((device) => createMediaDeviceInfoLike(device, labelsByKind[device.kind] === true))
          )
        },
      }),
      { configurable: true, force: true, writable: true }
    )
  }

  const parseFontFamilies: (s: string) => string[] = (() => {
    const cache = new Map<string, string[]>()
    const sizeRe = new RegExp(
      '(?:\\d+(?:\\.\\d+)?(?:px|pt|em|rem|ex|ch|vw|vh|vmin|vmax|%)|' +
      'xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger)' +
      String.raw`(?:\s*\/[^\s,'"]+)?\s+([\s\S]+)`
    )
    return (s: string): string[] => {
      const c = cache.get(s)
      if (c) return c
      const m = s.match(sizeRe)
      const familyStr = m ? m[1] : s
      const families: string[] = []
      let cur = ''
      let inS = false
      let inD = false
      for (let i = 0; i < familyStr.length; i++) {
        const ch = familyStr[i]
        if (ch === "'" && !inD) { inS = !inS; cur += ch }
        else if (ch === '"' && !inS) { inD = !inD; cur += ch }
        else if (ch === ',' && !inS && !inD) {
          const t = cur.trim().replace(/^["']|["']$/g, '')
          if (t) families.push(t)
          cur = ''
        } else { cur += ch }
      }
      const last = cur.trim().replace(/^["']|["']$/g, '')
      if (last) families.push(last)
      cache.set(s, families)
      return families
    }
  })()

  const GENERIC_FAMILIES = new Set([
    'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
    'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
    'emoji', 'math', 'fangsong',
  ])

  const applyFontsSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const context = plan
    const profile = context.profile
    const fontsMode = spoofMode(plan, 'fonts')

    if (
      realm.document.fonts &&
      typeof realm.document.fonts.check === 'function' &&
      ((fontsMode === 'random' && !surfaceIsRestricted(plan, 'fonts') && profile) || fontsMode === 'off')
    ) {
      overload(
        realm.document.fonts,
        'check',
        new Proxy(realm.document.fonts.check, {
          apply(_target, _self, args: [string, string?]) {
            const raw = String(args[0] || '').trim().toLowerCase()
            const families = parseFontFamilies(raw)
            if (families.some((f) => GENERIC_FAMILIES.has(f))) return true
            if (fontsMode === 'off') return false
            const personaFamiliesLower = profile!.fonts.families.map((f) => f.toLowerCase())
            if (families.some((f) => personaFamiliesLower.includes(f))) return true
            return false
          },
        }),
        { configurable: true, force: true, writable: true }
      )
    }

    const windowWithFonts = realm as WindowRealm & {
      queryLocalFonts?: (options?: { postscriptNames?: string[] }) => Promise<unknown>
    }

    if (typeof windowWithFonts.queryLocalFonts === 'function') {
      overload(
        windowWithFonts,
        'queryLocalFonts',
        new Proxy(windowWithFonts.queryLocalFonts, {
          apply(target, self, args: [{ postscriptNames?: string[] } | undefined]) {
            // 'off' mode → actively block access regardless of privacy policy
            if (fontsMode === 'off' || surfaceIsRestricted(plan, 'fonts')) {
              return Promise.reject(new realm.DOMException('Access to local fonts is blocked', 'SecurityError'))
            }

            // 'real' mode → pass through to native
            if (fontsMode === 'real') {
              return Reflect.apply(target, self, args)
            }

            if (!context.profile) {
              return Reflect.apply(target, self, args)
            }

            const requested = Array.isArray(args[0]?.postscriptNames)
              ? new Set(args[0]?.postscriptNames?.map((name) => String(name).toLowerCase()) || [])
              : undefined

            return Promise.resolve(
              context.profile.fonts.families
                .flatMap((family) => buildLocalFontFaceLikes(family, realm))
                .filter((font) =>
                  requested
                    ? requested.has(font.postscriptName.toLowerCase()) || requested.has(font.family.toLowerCase()) || requested.has(font.fullName.toLowerCase())
                    : true
                )
            )
          },
        }),
        { configurable: true, force: true, writable: true }
      )
    }
  }

  const applyPermissionsSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const context = plan
    const navigatorLike = realm.navigator as Navigator & Record<string, unknown>
    const permissionsProto = (realm as WindowRealm & { Permissions?: { prototype?: object } }).Permissions?.prototype ?? Object.prototype

    let permissions = realm.navigator.permissions as (Permissions & Record<string, unknown>) | undefined

    if (!permissions || typeof permissions.query !== 'function') {
      const synthetic = Object.create(permissionsProto) as Record<string, unknown>
      nativeDefineProperty(synthetic, Symbol.toStringTag, { value: 'Permissions', configurable: true })
      const nativeQuery = cloak(function query() {
        return Promise.reject(new TypeError('Illegal invocation'))
      }, { name: 'query', length: 1 })
      nativeDefineProperty(synthetic, 'query', {
        value: nativeQuery,
        configurable: true,
        enumerable: false,
        writable: true,
      })
      overload(navigatorLike, 'permissions', synthetic, { configurable: true, force: true })
      permissions = synthetic as Permissions & Record<string, unknown>
    }

    if (!permissions || typeof permissions.query !== 'function') {
      return
    }

    const stateByName: Record<string, 'granted' | 'denied' | 'prompt'> = {
      accelerometer: 'prompt',
      'ambient-light-sensor': 'prompt',
      'background-fetch': 'prompt',
      'background-sync': 'prompt',
      bluetooth: 'prompt',
      camera: 'prompt',
      clipboard: 'prompt',
      'clipboard-read': 'prompt',
      'clipboard-write': 'granted',
      'display-capture': 'prompt',
      'device-info': 'prompt',
      gamepad: 'prompt',
      geolocation: 'prompt',
      gyroscope: 'prompt',
      magnetometer: 'prompt',
      microphone: 'prompt',
      midi: 'prompt',
      nfc: 'prompt',
      notifications: 'prompt',
      'persistent-storage': 'prompt',
      push: 'prompt',
      'screen-wake-lock': 'prompt',
      speaker: 'prompt',
      'speaker-selection': 'prompt',
      'local-fonts': 'prompt',
    }

    if (context.profile) {
      stateByName.camera = context.profile.permissions.camera
      stateByName.microphone = context.profile.permissions.microphone
      stateByName['speaker-selection'] = context.profile.permissions.speakerSelection
      stateByName['local-fonts'] = context.profile.permissions.localFonts
    }

    if (isRestricted(context, 'mediaDevices')) {
      stateByName.camera = 'denied'
      stateByName.microphone = 'denied'
      stateByName.speaker = 'denied'
      stateByName['speaker-selection'] = 'denied'
      stateByName['display-capture'] = 'denied'
    }

    if (isRestricted(context, 'localFonts')) {
      stateByName['local-fonts'] = 'denied'
    }

    if (isRestricted(context, 'sensitiveDeviceApis')) {
      stateByName.bluetooth = 'denied'
      stateByName.nfc = 'denied'
    }

    const nativeQuery = permissions.query
    overload(
      permissions,
      'query',
      new Proxy(nativeQuery, {
        apply(target, self, args: [PermissionDescriptor]) {
          const descriptor = args[0]
          const name = typeof descriptor?.name === 'string' ? String(descriptor.name) : ''
          const state = name && name in stateByName ? stateByName[name] : 'prompt'

          try {
            return Promise.resolve(createPermissionStatusLike(name || 'unknown', state, realm))
          } catch {
            try {
              return Reflect.apply(target, self, args)
            } catch {
              return Promise.resolve(createPermissionStatusLike(name || 'unknown', 'prompt', realm))
            }
          }
        },
      }),
      { configurable: true, force: true, writable: true }
    )
  }

  const applyPdfViewerSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const context = plan

    if (!context.profile && !surfaceIsRestricted(plan, 'pdfViewer')) {
      return
    }

    const emptyPlugins = createNamedArrayLike([], () => '', 'PluginArray', {
      refresh() {
        return undefined
      },
    })
    const emptyMimeTypes = createNamedArrayLike([], () => '', 'MimeTypeArray')
    const collections = !surfaceIsRestricted(plan, 'pdfViewer') && context.profile?.pdfViewerEnabled
      ? createPdfViewerCollections(realm, context.payload.current.browser)
      : { plugins: emptyPlugins, mimeTypes: emptyMimeTypes }

    overload(realm.navigator, 'plugins', collections.plugins, { configurable: true, force: true })
    overload(realm.navigator, 'mimeTypes', collections.mimeTypes, { configurable: true, force: true })
  }

  // ---------------------------------------------------------------------------
  // Browser Capability surface
  // Aligns engine-specific globals with the spoofed persona.
  // Capability matrix: browser + major version → feature present/absent.
  // Uses delete-first removal so presence checks ('x' in obj) also fail.
  // ---------------------------------------------------------------------------
  const applyBrowserCapabilitiesSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const browser = plan.payload.current.browser
    const mv = plan.payload.current.version.browser.major
    const realmAsRecord = realm as typeof realm & Record<string, unknown>
    const navLike = realm.navigator as Navigator & Record<string, unknown>

    const has = (cap: string): boolean => {
      const fn = BROWSER_CAP.get(cap)
      return fn ? fn(browser, mv) : true
    }

    if ('brave' in navLike) safePropDeleteCritical(navLike, 'brave')
    const navProto = Object.getPrototypeOf(navLike)
    if (navProto && typeof navProto === 'object' && 'brave' in (navProto as Record<string, unknown>)) {
      safePropDeleteCritical(navProto, 'brave')
    }
    if ('brave' in navLike) {
      overload(navLike, 'brave', undefined, { configurable: true, force: true, writable: true })
    }

    // window.chrome — bidirectional: remove when absent, synthesize or patch when required.
    //
    // Descriptor shapes verified from Chrome dump:
    //   window.chrome on window:  { enumerable:true, configurable:false, writable:true }
    //   chrome.app:               { enumerable:true, configurable:true,  writable:true }
    //   chrome.csi / loadTimes:   { enumerable:true, configurable:true,  writable:true }
    //   chrome.app.*:             { enumerable:true, configurable:true,  writable:true }
    //   csi / loadTimes functions: name:'', length:0  (anonymous native shape)
    //
    // Two paths:
    //   A. Host has no window.chrome → synthesize from scratch.
    //   B. Host already has window.chrome → patch in-place; do not replace the object.

    // ---------------------------------------------------------------------------
    // patchChromeValue — define or redefine a value prop on a chrome sub-object.
    // If the prop already exists, its real descriptor flags are preserved; only
    // the value is updated. Otherwise fallback flags from the Chrome dump are used.
    // ---------------------------------------------------------------------------
    const patchChromeValue = (
      obj: Record<string, unknown>,
      prop: string,
      value: unknown,
      fallback: { enumerable: boolean; configurable: boolean; writable: boolean },
    ): void => {
      try {
        const existing = nativeGetOwnPropertyDescriptor(obj, prop)
        if (existing && 'value' in existing) {
          nativeDefineProperty(obj, prop, {
            value,
            enumerable:   existing.enumerable   ?? fallback.enumerable,
            configurable: existing.configurable ?? fallback.configurable,
            writable:     existing.writable     ?? fallback.writable,
          })
        } else if (!existing) {
          nativeDefineProperty(obj, prop, { value, ...fallback })
        }
        // If existing is an accessor descriptor, leave it alone.
      } catch { void 0 }
    }

    // ---------------------------------------------------------------------------
    // patchChromeAnonMethod — cloaks fn as anonymous native ({ name:'', length:0 }).
    // Use for: csi, loadTimes  (Chrome dump shows name:'' for these).
    // ---------------------------------------------------------------------------
    const patchChromeAnonMethod = (
      obj: Record<string, unknown>,
      prop: string,
      fn: AnyFn,
      fallback: { enumerable: boolean; configurable: boolean; writable: boolean },
    ): void => {
      cloak(fn, { name: '', length: 0 })
      patchChromeValue(obj, prop, fn, fallback)
    }

    // ---------------------------------------------------------------------------
    // patchChromeNamedMethod — cloaks fn as named native ({ name:prop, length:0 }).
    // Use for: chrome.app methods (getDetails, getIsInstalled, installState, runningState).
    // Chrome dump shows these carry their own property name as function.name.
    // ---------------------------------------------------------------------------
    const patchChromeNamedMethod = (
      obj: Record<string, unknown>,
      prop: string,
      fn: AnyFn,
      fallback: { enumerable: boolean; configurable: boolean; writable: boolean },
    ): void => {
      cloak(fn, { name: prop, length: 0 })
      patchChromeValue(obj, prop, fn, fallback)
    }
    // ---------------------------------------------------------------------------
    // ensureChromeAppShape — idempotent; brings chrome.app to the full shape
    // visible on a real Chrome page (no extension APIs, just the public surface).
    //
    // chrome.app own keys from dump:
    //   isInstalled, getDetails, getIsInstalled, installState, runningState,
    //   InstallState, RunningState
    // ---------------------------------------------------------------------------
    const ensureChromeAppShape = (chromeObj: Record<string, unknown>): void => {
      // Ensure chrome.app exists as a plain object.
      let app = chromeObj['app'] as Record<string, unknown> | undefined
      if (!app || typeof app !== 'object') {
        app = {} as Record<string, unknown>
        patchChromeValue(chromeObj, 'app', app,
          { enumerable: true, configurable: true, writable: true })
      }
      const appRec = app as Record<string, unknown>
      const appFlagsFallback = { enumerable: true, configurable: true, writable: true }

      // Scalar props
      patchChromeValue(appRec, 'isInstalled', false, appFlagsFallback)
      patchChromeValue(appRec, 'InstallState',
        Object.freeze({ DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }),
        appFlagsFallback)
      patchChromeValue(appRec, 'RunningState',
        Object.freeze({ CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }),
        appFlagsFallback)

      // Methods — named native shape (name:prop, length:0), verified from Chrome dump.
      // Return values are internally consistent with isInstalled:false / getIsInstalled():false.
      patchChromeNamedMethod(appRec, 'getDetails',      function() { return null },           appFlagsFallback)
      patchChromeNamedMethod(appRec, 'getIsInstalled',  function() { return false },          appFlagsFallback)
      patchChromeNamedMethod(appRec, 'installState',    function() { return 'not_installed' }, appFlagsFallback)
      patchChromeNamedMethod(appRec, 'runningState',    function() { return 'cannot_run' },   appFlagsFallback)
    }

    // ---------------------------------------------------------------------------
    // csi() and loadTimes() — anonymous native shape (name:'', length:0).
    // Payloads are kept from existing implementation; only cloaking is corrected.
    // ---------------------------------------------------------------------------
    const csiImpl = (function() {
      return { startE: Date.now(), onloadT: Date.now(), pageT: Math.round(performance.now()), tran: 15 }
    }) as AnyFn
    cloak(csiImpl, { name: '', length: 0 })

    const loadTimesImpl = (function() {
      return {
        requestTime: 0, startLoadTime: 0, commitLoadTime: 0,
        finishDocumentLoadTime: 0, finishLoadTime: 0,
        firstPaintTime: 0, firstPaintAfterLoadTime: 0,
        navigationType: 'Other', wasFetchedViaSpdy: false,
        wasNpnNegotiated: false, npnNegotiatedProtocol: '',
        wasAlternateProtocolAvailable: false, connectionInfo: 'h2',
      }
    }) as AnyFn
    cloak(loadTimesImpl, { name: '', length: 0 })

    const chromeFlagsFallback = { enumerable: true, configurable: true, writable: true }

    // ---------------------------------------------------------------------------
    // window.chrome — main dispatch
    // ---------------------------------------------------------------------------
    const chromePresent = 'chrome' in realmAsRecord
    const chromeShouldExist = has('window.chrome')

    if (!chromeShouldExist && chromePresent) {
      // Path: remove
      safePropDeleteCritical(realmAsRecord, 'chrome')
    } else if (chromeShouldExist && !chromePresent) {
      // Path A: synthesize from scratch.
      // chromeObj and app use normal prototype chains (plain {}), not null-proto objects,
      // so instanceof checks, hasOwnProperty etc. behave like a real browser object.
      const chromeObj = {} as Record<string, unknown>
      patchChromeAnonMethod(chromeObj, 'csi',       csiImpl,       chromeFlagsFallback)
      patchChromeAnonMethod(chromeObj, 'loadTimes', loadTimesImpl, chromeFlagsFallback)
      ensureChromeAppShape(chromeObj)
      try {
        // window.chrome descriptor from dump: configurable:false, writable:true, enumerable:true
        nativeDefineProperty(realmAsRecord, 'chrome', {
          value: chromeObj,
          enumerable: true,
          configurable: false,
          writable: true,
        })
      } catch { void 0 }
    } else if (chromeShouldExist && chromePresent) {
      // Path B: host already has window.chrome — patch in-place, do not replace the object.
      const chromeObj = realmAsRecord['chrome'] as Record<string, unknown> | undefined
      if (chromeObj && typeof chromeObj === 'object') {
        const chromeRec = chromeObj as Record<string, unknown>
        patchChromeAnonMethod(chromeRec, 'csi',       csiImpl,       chromeFlagsFallback)
        patchChromeAnonMethod(chromeRec, 'loadTimes', loadTimesImpl, chromeFlagsFallback)
        ensureChromeAppShape(chromeRec)
      }
    }

    // removeWindowCookieStore — removes window.cookieStore when the persona does not expose it.
    //
    // Chrome dump shows cookieStore is an own accessor on window (not on its prototype chain):
    //   own descriptor on window: { enumerable: true, configurable: true, getter }
    //   proto walk: nothing found
    //
    // Removal order:
    //   1. Check own descriptor on window first — this is the real Chrome case.
    //      If configurable, delete from the window instance via safePropDeleteCritical.
    //      If non-configurable, leave it; the host does not allow hiding it and the
    //      planner must not require its absence.
    //   2. Fallback proto-walk only when no own descriptor exists (future-proofing /
    //      non-Chromium hosts that may put it on a prototype instead).
    //   No fake own-shadow install, no overload(... undefined ...) tricks.
    const removeWindowCookieStore = (realm: WindowRealm): void => {
      const realmRec = realm as typeof realm & Record<string, unknown>
      const ownDesc = nativeGetOwnPropertyDescriptor(realmRec, 'cookieStore')
      if (ownDesc) {
        // Case 1: own descriptor on window (Chromium). Remove if configurable.
        if (ownDesc.configurable) {
          safePropDeleteCritical(realmRec, 'cookieStore')
        }
        // If non-configurable: host does not permit hiding this property.
        // Leave it untouched — the planner must not require cookieStore absence
        // when the host exposes it as non-configurable.
        return
      }
      // Case 2: no own descriptor — fallback proto-walk (non-Chromium hosts).
      let pt: object | null = Object.getPrototypeOf(realm)
      while (pt !== null) {
        const d = nativeGetOwnPropertyDescriptor(pt, 'cookieStore')
        if (d) { if (d.configurable) { try { delete (pt as Record<string, unknown>)['cookieStore'] } catch { void 0 } } break }
        pt = Object.getPrototypeOf(pt)
      }
    }

    // window.cookieStore — own accessor on window in Chromium (verified from Chrome dump).
    // Falls back to proto-walk for non-Chromium hosts.
    // Viability gate: skip removal when host descriptor is non-configurable and persona
    // requires cookieStore absent — the delete would silently fail anyway.
    if (!has('window.cookieStore') && 'cookieStore' in realmAsRecord) {
      if (!viabilityConflict(plan, 'canHideWindowCookieStore', personaRequiresNoCookieStore(plan))) {
        removeWindowCookieStore(realm)
      }
      // Conflict case: host cannot hide cookieStore (non-configurable), persona requires absence.
      // Removal skipped — property stays visible. Upstream planner should avoid such personas.
    }
    // cookieStore synthesis: requires full CookieStore API — planner should not select
    // personas requiring cookieStore when host doesn't expose it.

    // ---------------------------------------------------------------------------
    // Navigator.prototype.userAgentData — dedicated presence + getter helpers.
    // Each helper owns exactly one concern; nothing is defined inline.
    // ---------------------------------------------------------------------------

    // removeNavigatorUAD — proto-walk delete, stops at the first descriptor found.
    // Navigator.prototype.userAgentData lives on the prototype (not as an own accessor on
    // the navigator instance), so proto-walk is the correct strategy here.
    // Contrast with removeWindowCookieStore which checks own descriptor on window first.
    const removeNavigatorUAD = (nav: Navigator & Record<string, unknown>): void => {
      let pt: object | null = Object.getPrototypeOf(nav)
      while (pt !== null) {
        const d = nativeGetOwnPropertyDescriptor(pt, 'userAgentData')
        if (d) {
          if (d.configurable) { try { delete (pt as Record<string, unknown>)['userAgentData'] } catch { void 0 } }
          break
        }
        pt = Object.getPrototypeOf(pt)
      }
    }

    // patchNavigatorUADGetter — installs getter on Navigator.prototype with correct descriptor shape.
    //
    // Two branches:
    //   1. Host already has an accessor (Chromium): preserve its exact enumerable/configurable flags,
    //      replace only get. Cloak getter against the real host getter — Function.prototype.toString
    //      returns native-looking output without a dummy cloaking target.
    //   2. No existing descriptor (Firefox/Safari): synthesize an accessor that matches the real
    //      Chromium Navigator.prototype shape from Chrome dump:
    //      enumerable: true, configurable: true, set: undefined.
    //      Cloak against a synthetic source so name/length are still correct.
    const patchNavigatorUADGetter = (navProto: object, getter: () => unknown): void => {
      const existing = nativeGetOwnPropertyDescriptor(navProto, 'userAgentData')

      if (existing && 'get' in existing) {
        // Branch 1 — host accessor exists: preserve flags, cloak against the real getter.
        const realGetter = existing.get
        if (typeof realGetter === 'function') {
          cloak(getter as AnyFn, realGetter)
        } else {
          cloak(getter as AnyFn, { name: 'get userAgentData', length: 0 })
        }
        try {
          nativeDefineProperty(navProto, 'userAgentData', {
            get: getter as () => unknown,
            set: undefined,
            enumerable: existing.enumerable ?? false,
            configurable: existing.configurable ?? true,
          })
        } catch { void 0 }
      } else {
        // Branch 2 — no existing descriptor (Firefox/Safari): synthesize an accessor matching
        // the real Chromium Navigator.prototype shape verified from Chrome dump:
        //   enumerable: true, configurable: true, set: undefined
        // (Earlier assumption of enumerable:false was wrong — Chrome/Edge expose it as enumerable.)
        cloak(getter as AnyFn, { name: 'get userAgentData', length: 0 })
        try {
          nativeDefineProperty(navProto, 'userAgentData', {
            get: getter as () => unknown,
            set: undefined,
            enumerable: true,
            configurable: true,
          })
        } catch { void 0 }
      }
    }

    // navigator.userAgentData — centralized presence management
    // Values are patched later by applyNavigatorIdentitySurface (runs after this surface).
    const chMode = spoofMode(plan, 'clientHints')
    const uadMode = !plan.environment.secureContext
      ? 'hidden'
      : chMode === 'off'
        ? 'hidden'
        : chMode === 'real'
          ? 'native'
          : has('navigator.userAgentData')
            ? 'spoof'
            : 'hidden'
    const uadCurrentlyPresent = 'userAgentData' in navLike

    if (uadMode === 'hidden' && uadCurrentlyPresent) {
      // Viability gate: skip removal when host descriptor is non-configurable and persona
      // requires userAgentData absent — proto-walk delete would silently fail anyway.
      if (!viabilityConflict(plan, 'canHideNavigatorUserAgentData', personaRequiresNoUserAgentData(plan))) {
        removeNavigatorUAD(navLike)
      }
      // Conflict case: host cannot hide userAgentData (non-configurable), persona requires absence.
      // Removal skipped — property stays visible. Upstream planner should avoid such personas.
    } else if (uadMode === 'spoof' && !uadCurrentlyPresent) {
      // Synthesize UAD — build with correct prototype chain, install as proto getter.
      //
      // Shape invariant verified against Chrome Linux:
      //   Object.getOwnPropertyDescriptors(uad)        → {} (empty — zero own props on instance)
      //   Object.getOwnPropertyDescriptors(proto(uad)) → brands/mobile/platform/toJSON/getHighEntropyValues
      //   Object.prototype.toString.call(uad)          → [object NavigatorUAData]
      //   toJSON.name / toJSON.length                  → 'toJSON' / 0
      //   getHighEntropyValues.name / .length          → 'getHighEntropyValues' / 1
      //
      // Strategy:
      //   - Chromium host  → native NavigatorUAData.prototype already has the right getters/methods;
      //     use it directly. applyNavigatorIdentitySurface (value-patch) will update those getters
      //     in place — no own props are ever installed on the instance.
      //   - Non-Chromium host (Firefox/Safari) → no native proto; build a synthetic proto that
      //     mirrors the real shape exactly. Instance still gets zero own props.
      const NavigatorUADataCtor = (realm as WindowRealm & Record<string, unknown>)['NavigatorUAData'] as { prototype?: object } | undefined
      const nativeUADProto = NavigatorUADataCtor?.prototype

      const uadProto: object = nativeUADProto ?? (() => {
        // Build synthetic NavigatorUAData.prototype for non-Chromium hosts.
        // Base is Object.prototype (not null) so the instance participates in the normal
        // proto chain — hasOwnProperty, toString etc. behave exactly like real UAD instances.
        // Low-entropy getters (brands/mobile/platform) are stubs — value-patch overwrites them.
        const sp = Object.create(Object.prototype) as Record<string | symbol, unknown>

        nativeDefineProperty(sp, 'brands', {
          get: cloak(function brands() { return Object.freeze([]) }, { name: 'get brands', length: 0 }),
          configurable: true, enumerable: true,
        })
        nativeDefineProperty(sp, 'mobile', {
          get: cloak(function mobile() { return false }, { name: 'get mobile', length: 0 }),
          configurable: true, enumerable: true,
        })
        nativeDefineProperty(sp, 'platform', {
          get: cloak(function platform() { return '' }, { name: 'get platform', length: 0 }),
          configurable: true, enumerable: true,
        })

        // toJSON: length=0, enumerable=true (verified against Chrome/Edge Linux dump)
        nativeDefineProperty(sp, 'toJSON', {
          value: cloak(
            function toJSON(this: Record<string, unknown>) {
              return { brands: this['brands'], mobile: this['mobile'], platform: this['platform'] }
            },
            { name: 'toJSON', length: 0 }
          ),
          configurable: true, writable: true, enumerable: true,
        })

        // getHighEntropyValues: length=1, enumerable=true (verified against Chrome/Edge Linux dump)
        nativeDefineProperty(sp, 'getHighEntropyValues', {
          value: cloak(
            function getHighEntropyValues(hints: unknown) { void hints; return Promise.resolve({}) },
            { name: 'getHighEntropyValues', length: 1 }
          ),
          configurable: true, writable: true, enumerable: true,
        })

        // Symbol.toStringTag → Object.prototype.toString.call(uad) returns [object NavigatorUAData]
        nativeDefineProperty(sp, Symbol.toStringTag, {
          value: 'NavigatorUAData', configurable: true, enumerable: false, writable: false,
        })

        return sp
      })()

      // Instance has NO own properties — everything lives on uadProto (mirrors real Chrome shape).
      const uadObj = Object.create(uadProto)

      const navProto = Object.getPrototypeOf(navLike)
      if (navProto) {
        patchNavigatorUADGetter(navProto, () => uadObj)
      }
    }

    // ServiceWorkerRegistration — strip Chromium-only service worker features
    const swrProto = (realm as WindowRealm & {
      ServiceWorkerRegistration?: { prototype?: Record<string, unknown> }
    }).ServiceWorkerRegistration?.prototype

    if (swrProto) {
      if (!has('sw.backgroundFetch') && 'backgroundFetch' in swrProto) safePropDelete(swrProto, 'backgroundFetch')
      if (!has('sw.periodicSync') && 'periodicSync' in swrProto) safePropDelete(swrProto, 'periodicSync')
      if (!has('sw.cookies') && 'cookies' in swrProto) safePropDelete(swrProto, 'cookies')
      // sw.cookieStore is intentionally NOT handled here.
      // Chrome dump shows: ServiceWorkerRegistration.prototype.cookieStore → null (absent).
      //   ServiceWorkerRegistration.prototype.cookies → exists (handled above as sw.cookies).
      // ServiceWorkerGlobalScope.cookieStore is a distinct surface, lives in the worker realm,
      // and belongs to a dedicated future package — do not mix with ServiceWorkerRegistration.
    }

    // Worker / SharedWorker — inject spoof prelude into every local worker script.
    const workerPrelude = buildWorkerPrelude(plan)
    patchWorkerConstructor(realm, 'Worker', workerPrelude)
    if (typeof (realm as WindowRealm & Record<string, unknown>)['SharedWorker'] === 'function') {
      patchWorkerConstructor(realm, 'SharedWorker', workerPrelude)
    }
    patchServiceWorkerRegisterForCreepJsFallback(realm)

  }

  // ===========================================================================
  // ServiceWorkerGlobalScope.cookieStore — DEAD END, DO NOT IMPLEMENT THIS WAY
  //
  // Attempted approach: wrap navigator.serviceWorker.register() with a blob URL
  // containing a prelude + importScripts(originalUrl), mirroring patchWorkerConstructor.
  //
  // Why it does not work:
  //   1. ServiceWorkerContainer.register() rejects blob: scriptURLs — the spec
  //      requires http: or https: scheme. The call throws immediately.
  //   2. Even if it didn't, importScripts() inside a blob-URL SW resolves relative
  //      URLs against the blob: origin, so the original relative scriptURL would
  //      break. The absolute href would need to be passed, not the raw input string.
  //
  // There is no drop-in blob-wrapper equivalent for ServiceWorker.register().
  // This surface requires a fundamentally different approach (e.g. viability planner
  // blocking personas that require cookieStore absence when host exposes it).
  // Tracked as a future package. Nothing is implemented here.
  // ===========================================================================

  // ===========================================================================
  // Worker spoof prelude — injection into Worker / SharedWorker
  //
  // Workers run in an isolated realm; window-level UAD patching does not reach
  // them. These helpers generate a self-contained JS prelude string that is
  // prepended to every blob / same-origin worker script, applying aligned
  // worker-side UAD, MediaCapabilities and WebGPU shims.
  //
  // Three helpers, one call-site in applyBrowserCapabilitiesSurface:
  //   1. serializeWorkerPreludeState(plan) — plain JSON-serializable spoof state
  //   2. buildWorkerPrelude(plan)         — JS string to inject into worker
  //   3. patchWorkerConstructor(realm, ctorName, prelude) — wraps constructor
  //
  // Module workers and cross-origin workers are passed through unchanged.
  // ServiceWorkerGlobalScope.cookieStore is a separate future package.
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // serializeWorkerPreludeState — plain JSON-serializable worker spoof state.
  // This feeds the injected worker prelude and keeps worker-side UAD,
  // MediaCapabilities and WebGPU aligned with the main-thread persona.
  // ---------------------------------------------------------------------------
  const serializeWorkerPreludeState = (plan: RuntimePlan): {
    uadMode: 'hidden' | 'native' | 'spoof'
    uadShouldExist: boolean
    brands: readonly { brand: string; version: string }[]
    fullVersionList: readonly { brand: string; version: string }[]
    mobile: boolean
    platform: string
    uaFullVersion: string
    model: string
    platformVersion: string
    architecture: string
    bitness: string
    wow64: boolean
    formFactors: readonly string[]
    mediaCapabilitiesShouldExist: boolean
    browser: string
    os: string
    isMobileDevice: boolean
    majorVersion: number
    maxWidth: number
    maxHeight: number
    maxFps: number
    maxBitrate: number
    webGpuShouldExist: boolean
    workerUserAgent: string
    workerLanguage: string
    workerLanguages: readonly string[]
    workerTimeZone: string
    workerLocaleMode: LocaleSpoofMode
    workerTimezoneMode: TimezoneSpoofMode
    workerPlatform: string
    workerHardwareConcurrencyMode: SurfaceSpoofMode
    workerHardwareConcurrency: number
    workerDeviceMemoryMode: SurfaceSpoofMode
    workerDeviceMemory: number
    workerWebglMode: SurfaceSpoofMode
    workerWebglVendor: string
    workerWebglRenderer: string
    gpuFeatures: readonly string[]
    gpuLimits: Readonly<Record<string, number>>
    gpuWgslLanguageFeatures: readonly string[]
    gpuPreferredCanvasFormat: 'rgba8unorm' | 'bgra8unorm'
    gpuInfo: {
      vendor: string
      architecture: string
      device: string
      description: string
      isFallbackAdapter: boolean
    }
  } => {
    const ua = plan.payload.current
    const fp = plan.profile
    const chMode = spoofMode(plan, 'clientHints')
    const fn = BROWSER_CAP.get('navigator.userAgentData')
    const personaHasCH = fn ? fn(ua.browser, ua.version.browser.major) : false
    const uadMode =
      !surfaceIsEnabled(plan, 'browserCapabilities') || !plan.environment.secureContext
        ? 'hidden'
        : chMode === 'off'
          ? 'hidden'
          : chMode === 'real'
            ? (personaHasCH ? 'native' : 'hidden')
            : personaHasCH
              ? 'spoof'
              : 'hidden'
    const uadShouldExist = uadMode === 'spoof'

    const brands = uadShouldExist ? plan.payload.brands.major.map(({ brand, version }) => ({ brand, version })) : []
    const fullVersionList = uadShouldExist ? plan.payload.brands.full.map(({ brand, version }) => ({ brand, version })) : []

    let platformVersion = fp?.platformVersion || ''
    if (!platformVersion) {
      switch (ua.os) {
        case 'windows': platformVersion = '15.0.0'; break
        case 'linux':   platformVersion = '6.8.0'; break
        case 'macOS':   platformVersion = '14.6.1'; break
        case 'iOS': {
          const raw = (ua.device?.osVersion || '17.4').replace(/_/g, '.')
          const parts = raw.split('.').filter(Boolean)
          while (parts.length < 3) parts.push('0')
          platformVersion = parts.slice(0, 3).join('.')
          break
        }
        case 'android': {
          const raw = (ua.device?.osVersion || '14').replace(/_/g, '.')
          const parts = raw.split('.').filter(Boolean)
          if (!parts.length) { platformVersion = ''; break }
          while (parts.length < 3) parts.push('0')
          platformVersion = parts.slice(0, 3).join('.')
          break
        }
        default: platformVersion = ''
      }
    }

    let architecture: string
    const gpuVendor = fp?.gpu?.vendor
    switch (ua.os) {
      case 'android':
      case 'iOS':   architecture = 'arm'; break
      case 'macOS': architecture = gpuVendor === 'apple' ? 'arm' : 'x86'; break
      default:      architecture = 'x86'
    }

    const bitness = (ua.os === 'android' || ua.os === 'iOS') ? '' : '64'
    const wow64 = ua.os === 'windows' && /WOW64/i.test(ua.userAgent)
    const formFactors = Object.freeze(ua.device?.type === 'tablet' ? ['Tablet'] : ((ua.os === 'android' || ua.os === 'iOS' || ua.device?.type === 'mobile') ? ['Mobile'] : ['Desktop']))

    const mediaCapabilitiesShouldExist = browserCapHas('workerNavigator.mediaCapabilities', ua.browser, ua.version.browser.major)
    const isMobileDevice = Boolean(fp?.mobile ?? plan.payload.isMobile)
    const maxWidth = isMobileDevice ? 2560 : 3840
    const maxHeight = isMobileDevice ? 1440 : 2160
    const maxFps = isMobileDevice ? 60 : 120
    const maxBitrate = isMobileDevice ? 20_000_000 : 60_000_000

    const webGpuShouldExist = browserCapHas('workerNavigator.gpu', ua.browser, ua.version.browser.major)
    const workerLocaleMode = localeMode(plan)
    const workerLanguages = Object.freeze([...effectiveLanguages(plan)])
    const workerLanguage = String(workerLanguages[0] || effectiveLocale(plan) || 'en-US')
    const workerTimezoneMode = timezoneMode(plan)
    const workerTimeZone = String(effectiveTimeZone(plan) || 'UTC')
    const workerPlatform = fp?.platform || (() => {
      switch (ua.os) {
        case 'windows': return 'Win32'
        case 'linux': return 'Linux x86_64'
        case 'android': return 'Linux armv8l'
        case 'macOS': return 'MacIntel'
        case 'iOS': return 'iPhone'
        default: return ''
      }
    })()
    const workerHardwareConcurrencyMode = spoofMode(plan, 'hardwareConcurrency')
    const workerHardwareConcurrency = Math.max(1, fp?.hardwareConcurrency || 4)
    const workerDeviceMemoryMode = spoofMode(plan, 'deviceMemory')
    const workerDeviceMemory = Math.max(1, fp?.deviceMemory || 8)
    const workerWebglMode = spoofMode(plan, 'webgl')
    const buildWorkerWebGlIdentity = (): { vendor: string; renderer: string } => {
      const rawVendor = fp?.webgl?.vendor || ''
      const rawRenderer = fp?.webgl?.renderer || ''
      const compactVendor = (value: string): string => {
        const trimmed = value.trim()
        if (!trimmed) return 'Google'
        if (/^google inc\./i.test(trimmed)) {
          const match = /^google inc\.\s*\((.+)\)$/i.exec(trimmed)
          return (match?.[1] || 'Google').trim()
        }
        return trimmed
          .replace(/^apple inc\.?$/i, 'Apple')
          .replace(/^nvidia corporation$/i, 'NVIDIA')
          .replace(/^advanced micro devices,? inc\.?$/i, 'AMD')
      }
      const chromiumVendor = (value: string): string => `Google Inc. (${compactVendor(value)})`
      const chromiumRenderer = (vendor: string, renderer: string): string => {
        const cleanVendor = compactVendor(vendor)
        const cleanRenderer = renderer.trim() || 'SwiftShader'
        if (/^ANGLE\s*\(/i.test(cleanRenderer)) return cleanRenderer
        if (ua.os === 'android') return `ANGLE (${cleanVendor}, ${cleanRenderer}, OpenGL ES 3.2)`
        if (ua.os === 'macOS') {
          if (/apple/i.test(cleanVendor) || /apple/i.test(cleanRenderer)) {
            return `ANGLE (${cleanVendor}, ANGLE Metal Renderer: ${cleanRenderer}, Unspecified Version)`
          }
          return `ANGLE (${cleanVendor}, ${cleanRenderer}, OpenGL 4.1)`
        }
        if (ua.os === 'windows') return `ANGLE (${cleanVendor}, ${cleanRenderer} Direct3D11 vs_5_0 ps_5_0, D3D11)`
        return `ANGLE (${cleanVendor}, ${cleanRenderer}, OpenGL)`
      }
      if (ua.browser === 'firefox') {
        return {
          vendor: ua.os === 'windows' ? 'Google Inc.' : (rawVendor || 'Mozilla'),
          renderer: rawRenderer || 'Mozilla',
        }
      }
      if (ua.browser === 'safari') {
        return {
          vendor: 'Apple Inc.',
          renderer: rawRenderer || 'Apple GPU',
        }
      }
      const vendorSource = rawVendor || 'Google'
      return {
        vendor: chromiumVendor(vendorSource),
        renderer: chromiumRenderer(vendorSource, rawRenderer),
      }
    }
    const workerWebglIdentity = buildWorkerWebGlIdentity()
    const gpuInfo = {
      vendor: fp?.gpu?.vendor || '',
      architecture: fp?.gpu?.architecture || '',
      device: fp?.gpu?.device || '',
      description: fp?.gpu?.description || '',
      isFallbackAdapter: Boolean(fp?.gpu?.isFallbackAdapter),
    }
    const gpuFeatures = Object.freeze([...(fp?.gpuCapability.features || [])])
    const gpuLimits = Object.freeze({ ...((fp?.gpuCapability.limits || {}) as Record<string, number>) })
    const gpuWgslLanguageFeatures = Object.freeze([...(fp?.gpuCapability.wgslLanguageFeatures || [])])
    const gpuPreferredCanvasFormat = fp?.gpuCapability.preferredCanvasFormat || 'bgra8unorm'

    return {
      uadMode,
      uadShouldExist,
      brands,
      fullVersionList,
      mobile: fp?.mobile ?? plan.payload.isMobile,
      platform: plan.payload.platform,
      uaFullVersion: uadShouldExist ? ua.version.browser.full : '',
      model: uadShouldExist ? (fp?.model || '') : '',
      platformVersion: uadShouldExist ? platformVersion : '',
      architecture: uadShouldExist ? architecture : '',
      bitness: uadShouldExist ? bitness : '',
      wow64: uadShouldExist ? wow64 : false,
      formFactors: uadShouldExist ? formFactors : [],
      mediaCapabilitiesShouldExist,
      browser: ua.browser,
      os: ua.os,
      isMobileDevice,
      majorVersion: ua.version.browser.major,
      maxWidth,
      maxHeight,
      maxFps,
      maxBitrate,
      webGpuShouldExist,
      workerUserAgent: ua.userAgent,
      workerLocaleMode,
      workerLanguage,
      workerLanguages,
      workerTimeZone,
      workerTimezoneMode,
      workerPlatform,
      workerHardwareConcurrencyMode,
      workerHardwareConcurrency,
      workerDeviceMemoryMode,
      workerDeviceMemory,
      workerWebglMode,
      workerWebglVendor: workerWebglIdentity.vendor,
      workerWebglRenderer: workerWebglIdentity.renderer,
      gpuFeatures,
      gpuLimits,
      gpuWgslLanguageFeatures,
      gpuPreferredCanvasFormat,
      gpuInfo,
    }
  }

  // ---------------------------------------------------------------------------
  // buildWorkerPrelude — returns a self-contained JS string.
  // It injects worker-side UAD, MediaCapabilities and WebGPU shims.
  // ---------------------------------------------------------------------------
  const buildWorkerPrelude = (plan: RuntimePlan): string => {
    const state = serializeWorkerPreludeState(plan)
    const stateJson = JSON.stringify(state)
    return `(function(){` +
      `var __fm__=new WeakMap();` +
      `var __nts__=Function.prototype.toString;` +
      `var __wts__=function toString(){if(__fm__.has(this))return __fm__.get(this);return __nts__.call(this);};` +
      `__fm__.set(__wts__,'function toString() { [native code] }');` +
      `try{Object.defineProperty(Function.prototype,'toString',{value:__wts__,writable:true,configurable:true});}catch(e){}` +
      `function __cl__(fn,name,length,src){__fm__.set(fn,src);try{Object.defineProperty(fn,'name',{value:name,configurable:true});}catch(e){}try{Object.defineProperty(fn,'length',{value:length,configurable:true});}catch(e){}return fn;}` +
      `function __def__(obj,key,desc){try{Object.defineProperty(obj,key,desc);}catch(e){}}` +
      `function __del__(obj,key){try{delete obj[key];}catch(e){}}` +
      `var __s__=${stateJson};` +
      `var __secure__=!!self.isSecureContext;` +
      `var wnp;try{wnp=(typeof WorkerNavigator!=='undefined'&&WorkerNavigator&&WorkerNavigator.prototype)||Object.getPrototypeOf(self.navigator);}catch(e){try{wnp=Object.getPrototypeOf(self.navigator);}catch(e2){}}if(!wnp)return;try{if(Object.getOwnPropertyDescriptor(wnp,'brave')&&Object.getOwnPropertyDescriptor(wnp,'brave').configurable)delete wnp.brave;}catch(e){}try{delete self.navigator.brave;}catch(e){}` +
      `var __navGet__=function(name,value){var d=Object.getOwnPropertyDescriptor(wnp,name);var enumerable=d&&d.enumerable!=null?d.enumerable:true;var configurable=d&&d.configurable!=null?d.configurable:true;try{delete self.navigator[name];}catch(e){}var g=__cl__(function(){return value;},'get '+name,0,'function get '+name+'() { [native code] }');__def__(wnp,name,{get:g,set:undefined,enumerable:enumerable,configurable:configurable});};` +
      `__navGet__('userAgent',__s__.workerUserAgent);` +
      `if(__s__.workerLocaleMode!=='real')__navGet__('language',__s__.workerLanguage);` +
      `if(__s__.workerLocaleMode!=='real')__navGet__('languages',__s__.workerLanguages);` +
      `__navGet__('platform',__s__.workerPlatform);` +
      `if(__s__.workerHardwareConcurrencyMode!=='real')__navGet__('hardwareConcurrency',__s__.workerHardwareConcurrencyMode==='off'?undefined:__s__.workerHardwareConcurrency);` +
      `if(__s__.workerDeviceMemoryMode!=='real')__navGet__('deviceMemory',__s__.workerDeviceMemoryMode==='off'?undefined:__s__.workerDeviceMemory);` +
      `var __locale__=__s__.workerLanguage||'en-US';` +
      `var __tz__=__s__.workerTimeZone||'UTC';` +
      `function __wrapResolvedOptions__(ctor){try{if(!ctor||!ctor.prototype||typeof ctor.prototype.resolvedOptions!=='function')return;var __orig__=ctor.prototype.resolvedOptions;var __patched__=new Proxy(__orig__,{apply:function(target,self,args){var current=Reflect.apply(target,self,args);if(!current||typeof current!=='object')return current;var next=Object.assign({},current);if(__s__.workerLocaleMode!=='real'&&'locale'in next)next.locale=__locale__;if(__s__.workerTimezoneMode!=='real'&&'timeZone'in next)next.timeZone=__tz__;return next;}});__fm__.set(__patched__,'function resolvedOptions() { [native code] }');try{Object.defineProperty(__patched__,'name',{value:'resolvedOptions',configurable:true});}catch(e){}try{Object.defineProperty(__patched__,'length',{value:0,configurable:true});}catch(e){}__def__(ctor.prototype,'resolvedOptions',{value:__patched__,writable:true,configurable:true});}catch(e){}}` +
      `function __wrapLocaleMethod__(proto,name,injectTimeZone){try{if(!proto||typeof proto[name]!=='function')return;var __orig__=proto[name];var __patched__=new Proxy(__orig__,{apply:function(target,self,args){var next=args?args.slice():[];if(__s__.workerLocaleMode!=='real'&&(next.length===0||next[0]==null))next[0]=__locale__;if(injectTimeZone&&__s__.workerTimezoneMode!=='real'){if(next.length<2||next[1]==null)next[1]={};if(next[1]&&typeof next[1]==='object'&&!('timeZone'in next[1]))next[1]=Object.assign({},next[1],{timeZone:__tz__});}return Reflect.apply(target,self,next);}});__fm__.set(__patched__,'function '+name+'() { [native code] }');try{Object.defineProperty(__patched__,'name',{value:name,configurable:true});}catch(e){}__def__(proto,name,{value:__patched__,writable:true,configurable:true});}catch(e){}}` +
      `if(typeof Intl!=='undefined'){__wrapResolvedOptions__(Intl.DateTimeFormat);__wrapResolvedOptions__(Intl.NumberFormat);if(Intl.RelativeTimeFormat)__wrapResolvedOptions__(Intl.RelativeTimeFormat);if(Intl.ListFormat)__wrapResolvedOptions__(Intl.ListFormat);if(Intl.DisplayNames)__wrapResolvedOptions__(Intl.DisplayNames);if(Intl.PluralRules)__wrapResolvedOptions__(Intl.PluralRules);if(Intl.Collator)__wrapResolvedOptions__(Intl.Collator);}` +
      `__wrapLocaleMethod__(Number.prototype,'toLocaleString',false);` +
      `__wrapLocaleMethod__(Date.prototype,'toLocaleString',true);` +
      `__wrapLocaleMethod__(Date.prototype,'toLocaleDateString',true);` +
      `__wrapLocaleMethod__(Date.prototype,'toLocaleTimeString',true);` +
      `var sp=Object.create(Object.prototype);` +
      `if(__s__.uadMode==='spoof'&&__secure__){` +
        `var __g0__=__cl__(function(){return __s__.brands;},'get brands',0,'function get brands() { [native code] }');` +
        `__def__(sp,'brands',{get:__g0__,configurable:true,enumerable:true});` +
        `var __g1__=__cl__(function(){return __s__.mobile;},'get mobile',0,'function get mobile() { [native code] }');` +
        `__def__(sp,'mobile',{get:__g1__,configurable:true,enumerable:true});` +
        `var __g2__=__cl__(function(){return __s__.platform;},'get platform',0,'function get platform() { [native code] }');` +
        `__def__(sp,'platform',{get:__g2__,configurable:true,enumerable:true});` +
        `var __f0__=__cl__(function(){return{brands:__s__.brands,mobile:__s__.mobile,platform:__s__.platform};},'toJSON',0,'function toJSON() { [native code] }');` +
        `__def__(sp,'toJSON',{value:__f0__,writable:true,configurable:true,enumerable:true});` +
        `var __f1__=__cl__(function(hints){var r=new Set(Array.isArray(hints)?hints:[]);var d={brands:__s__.brands,mobile:__s__.mobile,platform:__s__.platform};if(r.has('fullVersionList'))d['fullVersionList']=__s__.fullVersionList;if(r.has('uaFullVersion'))d['uaFullVersion']=__s__.uaFullVersion;if(r.has('model'))d['model']=__s__.model;if(r.has('platformVersion'))d['platformVersion']=__s__.platformVersion;if(r.has('architecture'))d['architecture']=__s__.architecture;if(r.has('bitness'))d['bitness']=__s__.bitness;if(r.has('wow64'))d['wow64']=__s__.wow64;if(r.has('formFactors'))d['formFactors']=__s__.formFactors;return Promise.resolve(d);},'getHighEntropyValues',1,'function getHighEntropyValues() { [native code] }');` +
        `__def__(sp,'getHighEntropyValues',{value:__f1__,writable:true,configurable:true,enumerable:true});` +
        `__def__(sp,Symbol.toStringTag,{value:'NavigatorUAData',configurable:true,enumerable:false,writable:false});` +
        `var uad=Object.create(sp);` +
        `var __g3__=__cl__(function(){return uad;},'get userAgentData',0,'function get userAgentData() { [native code] }');` +
        `var ex=Object.getOwnPropertyDescriptor(wnp,'userAgentData');` +
        `__def__(wnp,'userAgentData',{get:__g3__,set:undefined,enumerable:ex&&ex.enumerable!=null?ex.enumerable:true,configurable:ex&&ex.configurable!=null?ex.configurable:true});` +
      `}else if(__s__.uadMode==='hidden'){var d=Object.getOwnPropertyDescriptor(wnp,'userAgentData');if(d&&d.configurable)__del__(wnp,'userAgentData');}` +
      `if(__s__.mediaCapabilitiesShouldExist){` +
        `var mc={};` +
        `var __norm__=function(v){return String(v||'').trim().toLowerCase();};` +
        `var __hasAny__=function(ct,arr){for(var i=0;i<arr.length;i++)if(ct.indexOf(arr[i])!==-1)return true;return false;};` +
        `var __safari__=__s__.browser==='safari';var __firefox__=__s__.browser==='firefox';var __chromium__=__s__.browser==='chrome'||__s__.browser==='edge'||__s__.browser==='opera';` +
        `var __adec__=function(ct){if(__hasAny__(ct,['audio/mp4','audio/aac','mp4a','aac']))return true;if(__hasAny__(ct,['audio/mpeg','audio/mp3','mp3']))return true;if(__hasAny__(ct,['audio/wav','audio/wave','pcm']))return true;if(__hasAny__(ct,['audio/flac','flac']))return true;if(__hasAny__(ct,['opus','vorbis','audio/ogg','audio/webm']))return !__safari__;return false;};` +
        `var __aenc__=function(ct){if(__hasAny__(ct,['audio/mp4','audio/aac','mp4a','aac']))return __chromium__||__safari__;if(__hasAny__(ct,['audio/webm','audio/ogg','opus','vorbis']))return !__safari__;if(__hasAny__(ct,['audio/wav','audio/wave']))return true;return false;};` +
        `var __vdec__=function(ct){if(__hasAny__(ct,['avc1','avc3','h.264','h264','video/mp4']))return true;if(__hasAny__(ct,['vp8','vp09','vp9','video/webm']))return !__safari__;if(__hasAny__(ct,['av01','av1']))return __chromium__||__firefox__;if(__hasAny__(ct,['hev1','hvc1','hevc','h.265','h265']))return __safari__||(__chromium__&&__s__.os==='macOS');return false;};` +
        `var __venc__=function(ct){if(__hasAny__(ct,['avc1','avc3','h.264','h264','video/mp4']))return __chromium__||__safari__;if(__hasAny__(ct,['vp8','vp09','vp9','video/webm']))return __chromium__||__firefox__;if(__hasAny__(ct,['av01','av1']))return __chromium__&&__s__.majorVersion>=121&&!__s__.isMobileDevice;return false;};` +
        `var __scoreVideo__=function(cfg,supported){if(!supported)return {supported:false,smooth:false,powerEfficient:false,keySystemAccess:null};var width=Number(cfg.width||0),height=Number(cfg.height||0),framerate=Number(cfg.framerate||0),bitrate=Number(cfg.bitrate||0);var smooth=width>0&&height>0&&width<=__s__.maxWidth&&height<=__s__.maxHeight&&(framerate<=0||framerate<=__s__.maxFps)&&(bitrate<=0||bitrate<=__s__.maxBitrate);var powerEfficient=smooth&&(!__s__.isMobileDevice||(width<=1920&&height<=1080&&(framerate<=0||framerate<=60)));return {supported:true,smooth:smooth,powerEfficient:powerEfficient,keySystemAccess:null};};` +
        `var __scoreAudio__=function(cfg,supported){if(!supported)return {supported:false,smooth:false,powerEfficient:false,keySystemAccess:null};var channels=Number(cfg.channels||2),samplerate=Number(cfg.samplerate||48000),bitrate=Number(cfg.bitrate||0);var smooth=channels>0&&channels<=8&&(samplerate<=0||samplerate<=192000)&&(bitrate<=0||bitrate<=1536000);var powerEfficient=smooth&&(channels<=2)&&(samplerate<=0||samplerate<=96000);return {supported:true,smooth:smooth,powerEfficient:powerEfficient,keySystemAccess:null};};` +
        `var __di__=__cl__(function(config){var t=config&&config.type;var info={supported:false,smooth:false,powerEfficient:false,keySystemAccess:null};if(!config||typeof config!=='object')return Promise.resolve(info);if(config.keySystemConfiguration&&!__secure__)return Promise.reject(new DOMException('The operation is insecure.','SecurityError'));if(t==='file'||t==='media-source'){if(config.video&&typeof config.video==='object')return Promise.resolve(__scoreVideo__(config.video,__vdec__(__norm__(config.video.contentType))));if(config.audio&&typeof config.audio==='object')return Promise.resolve(__scoreAudio__(config.audio,__adec__(__norm__(config.audio.contentType))));}return Promise.resolve(info);},'decodingInfo',1,'function decodingInfo() { [native code] }');` +
        `var __ei__=__cl__(function(config){var info={supported:false,smooth:false,powerEfficient:false,keySystemAccess:null};if(!config||typeof config!=='object')return Promise.resolve(info);if(config.video&&typeof config.video==='object')return Promise.resolve(__scoreVideo__(config.video,__venc__(__norm__(config.video.contentType))));if(config.audio&&typeof config.audio==='object')return Promise.resolve(__scoreAudio__(config.audio,__aenc__(__norm__(config.audio.contentType))));return Promise.resolve(info);},'encodingInfo',1,'function encodingInfo() { [native code] }');` +
        `__def__(mc,'decodingInfo',{value:__di__,writable:true,configurable:true,enumerable:true});` +
        `__def__(mc,'encodingInfo',{value:__ei__,writable:true,configurable:true,enumerable:true});` +
        `var __gmc__=__cl__(function(){return mc;},'get mediaCapabilities',0,'function get mediaCapabilities() { [native code] }');` +
        `var mcd=Object.getOwnPropertyDescriptor(wnp,'mediaCapabilities');` +
        `__def__(wnp,'mediaCapabilities',{get:__gmc__,set:undefined,enumerable:mcd&&mcd.enumerable!=null?mcd.enumerable:true,configurable:mcd&&mcd.configurable!=null?mcd.configurable:true});` +
      `}else{var mcd2=Object.getOwnPropertyDescriptor(wnp,'mediaCapabilities');if(mcd2&&mcd2.configurable)__del__(wnp,'mediaCapabilities');}` +
      `var __ctxState__=new WeakMap();` +
      `function __makeGpuCtx__(){var st={config:void 0};return {configure:__cl__(function(config){st.config=config&&typeof config==='object'?Object.assign({},config):config;},'configure',1,'function configure() { [native code] }'),unconfigure:__cl__(function(){st.config=void 0;},'unconfigure',0,'function unconfigure() { [native code] }'),getConfiguration:__cl__(function(){return st.config;},'getConfiguration',0,'function getConfiguration() { [native code] }'),getCurrentTexture:__cl__(function(){return {};},'getCurrentTexture',0,'function getCurrentTexture() { [native code] }')};}` +
      `if(__s__.webGpuShouldExist&&__secure__){` +
        `var __glf__=new Set(__s__.gpuWgslLanguageFeatures||[]);` +
        `var __feat__=new Set(__s__.gpuFeatures||[]);` +
        `var __limits__=Object.assign({},__s__.gpuLimits||{});` +
        `var __info__={vendor:__s__.gpuInfo.vendor||'',architecture:__s__.gpuInfo.architecture||'',device:__s__.gpuInfo.device||'',description:__s__.gpuInfo.description||'',isFallbackAdapter:!!__s__.gpuInfo.isFallbackAdapter};` +
        `var __device__={features:__feat__,limits:__limits__,queue:{submit:__cl__(function(){},'submit',1,'function submit() { [native code] }')}};` +
        `var __adapter__={features:__feat__,limits:__limits__,isFallbackAdapter:!!__s__.gpuInfo.isFallbackAdapter,requestDevice:__cl__(function(){return Promise.resolve(__device__);},'requestDevice',1,'function requestDevice() { [native code] }'),requestAdapterInfo:__cl__(function(){return Promise.resolve(__info__);},'requestAdapterInfo',0,'function requestAdapterInfo() { [native code] }'),info:__info__};` +
        `var __gpu__={requestAdapter:__cl__(function(){return Promise.resolve(__adapter__);},'requestAdapter',1,'function requestAdapter() { [native code] }'),getPreferredCanvasFormat:__cl__(function(){return __s__.gpuPreferredCanvasFormat;},'getPreferredCanvasFormat',0,'function getPreferredCanvasFormat() { [native code] }'),wgslLanguageFeatures:__glf__};` +
        `var __ggpu__=__cl__(function(){return __gpu__;},'get gpu',0,'function get gpu() { [native code] }');` +
        `var gpd=Object.getOwnPropertyDescriptor(wnp,'gpu');` +
        `__def__(wnp,'gpu',{get:__ggpu__,set:undefined,enumerable:gpd&&gpd.enumerable!=null?gpd.enumerable:true,configurable:gpd&&gpd.configurable!=null?gpd.configurable:true});` +
        `var __wv__=__s__.workerWebglVendor||'';` +
        `var __wr__=__s__.workerWebglRenderer||'';` +
        `function __mkGlStub__(){var stub={};var __gext__=__cl__(function(name){var lower=String(name||'').toLowerCase();if(lower==='webgl_debug_renderer_info')return {UNMASKED_VENDOR_WEBGL:37445,UNMASKED_RENDERER_WEBGL:37446};return null;},'getExtension',1,'function getExtension() { [native code] }');var __gse__=__cl__(function(){return ['WEBGL_debug_renderer_info'];},'getSupportedExtensions',0,'function getSupportedExtensions() { [native code] }');var __gp__=__cl__(function(pname){if(pname===37445)return __wv__;if(pname===37446)return __wr__;return null;},'getParameter',1,'function getParameter() { [native code] }');__def__(stub,'getExtension',{value:__gext__,writable:true,configurable:true});__def__(stub,'getSupportedExtensions',{value:__gse__,writable:true,configurable:true});__def__(stub,'getParameter',{value:__gp__,writable:true,configurable:true});return stub;}` +
        `function __wrapGl__(ctx){if(!ctx||typeof ctx!=='object')ctx=__mkGlStub__();if(ctx.__atsWrappedWebgl)return ctx;try{__def__(ctx,'__atsWrappedWebgl',{value:true,configurable:true});}catch(e){}if(typeof ctx.getExtension==='function'){var __origGE__=ctx.getExtension;var __pge__=new Proxy(__origGE__,{apply:function(target,self,args){var name=String(args&&args[0]||'').toLowerCase();if(name==='webgl_debug_renderer_info'){return {UNMASKED_VENDOR_WEBGL:37445,UNMASKED_RENDERER_WEBGL:37446};}return Reflect.apply(target,self,args);}});__fm__.set(__pge__,'function getExtension() { [native code] }');try{Object.defineProperty(__pge__,'name',{value:'getExtension',configurable:true});}catch(e){}try{Object.defineProperty(__pge__,'length',{value:1,configurable:true});}catch(e){}__def__(ctx,'getExtension',{value:__pge__,writable:true,configurable:true});}` +
        `if(typeof ctx.getSupportedExtensions==='function'){var __origGSE__=ctx.getSupportedExtensions;var __pgse__=new Proxy(__origGSE__,{apply:function(target,self,args){var out=Reflect.apply(target,self,args);var next=Array.isArray(out)?out.slice():[];if(next.indexOf('WEBGL_debug_renderer_info')===-1)next.push('WEBGL_debug_renderer_info');return next;}});__fm__.set(__pgse__,'function getSupportedExtensions() { [native code] }');try{Object.defineProperty(__pgse__,'name',{value:'getSupportedExtensions',configurable:true});}catch(e){}try{Object.defineProperty(__pgse__,'length',{value:0,configurable:true});}catch(e){}__def__(ctx,'getSupportedExtensions',{value:__pgse__,writable:true,configurable:true});}` +
        `if(typeof ctx.getParameter==='function'){var __origGP__=ctx.getParameter;var __pgp__=new Proxy(__origGP__,{apply:function(target,self,args){var pname=args&&args[0];if(pname===37445)return __wv__;if(pname===37446)return __wr__;return Reflect.apply(target,self,args);}});__fm__.set(__pgp__,'function getParameter() { [native code] }');try{Object.defineProperty(__pgp__,'name',{value:'getParameter',configurable:true});}catch(e){}try{Object.defineProperty(__pgp__,'length',{value:1,configurable:true});}catch(e){}__def__(ctx,'getParameter',{value:__pgp__,writable:true,configurable:true});}` +
        `return ctx;}` +
        `var oc=typeof OffscreenCanvas!=='undefined'&&OffscreenCanvas&&OffscreenCanvas.prototype;` +
        `if(oc&&typeof oc.getContext==='function'){var __origGC__=oc.getContext;var __pgc__=new Proxy(__origGC__,{apply:function(target,self,args){var kind=String(args&&args[0]||'').toLowerCase();if(kind==='webgpu'){if(!__ctxState__.has(self))__ctxState__.set(self,__makeGpuCtx__());return __ctxState__.get(self);}var ctx=Reflect.apply(target,self,args);if(kind==='webgl'||kind==='webgl2'||kind==='experimental-webgl'){if(__s__.workerWebglMode==='real')return ctx;return __wrapGl__(ctx);}return ctx;}});__fm__.set(__pgc__,'function getContext() { [native code] }');try{Object.defineProperty(__pgc__,'name',{value:'getContext',configurable:true});}catch(e){}try{Object.defineProperty(__pgc__,'length',{value:2,configurable:true});}catch(e){}__def__(oc,'getContext',{value:__pgc__,writable:true,configurable:true});}` +
      `}else{var gpd2=Object.getOwnPropertyDescriptor(wnp,'gpu');if(gpd2&&gpd2.configurable)__del__(wnp,'gpu');var __wv2__=__s__.workerWebglVendor||'';var __wr2__=__s__.workerWebglRenderer||'';function __mkGlStub2__(){var stub={};var __gext2__=__cl__(function(name){var lower=String(name||'').toLowerCase();if(lower==='webgl_debug_renderer_info')return {UNMASKED_VENDOR_WEBGL:37445,UNMASKED_RENDERER_WEBGL:37446};return null;},'getExtension',1,'function getExtension() { [native code] }');var __gse2__=__cl__(function(){return ['WEBGL_debug_renderer_info'];},'getSupportedExtensions',0,'function getSupportedExtensions() { [native code] }');var __gp2__=__cl__(function(pname){if(pname===37445)return __wv2__;if(pname===37446)return __wr2__;return null;},'getParameter',1,'function getParameter() { [native code] }');__def__(stub,'getExtension',{value:__gext2__,writable:true,configurable:true});__def__(stub,'getSupportedExtensions',{value:__gse2__,writable:true,configurable:true});__def__(stub,'getParameter',{value:__gp2__,writable:true,configurable:true});return stub;}function __wrapGl2__(ctx){if(!ctx||typeof ctx!=='object')ctx=__mkGlStub2__();if(ctx.__atsWrappedWebgl)return ctx;try{__def__(ctx,'__atsWrappedWebgl',{value:true,configurable:true});}catch(e){}if(typeof ctx.getExtension==='function'){var __origGE2__=ctx.getExtension;var __pge2__=new Proxy(__origGE2__,{apply:function(target,self,args){var name=String(args&&args[0]||'').toLowerCase();if(name==='webgl_debug_renderer_info'){return {UNMASKED_VENDOR_WEBGL:37445,UNMASKED_RENDERER_WEBGL:37446};}return Reflect.apply(target,self,args);}});__fm__.set(__pge2__,'function getExtension() { [native code] }');try{Object.defineProperty(__pge2__,'name',{value:'getExtension',configurable:true});}catch(e){}try{Object.defineProperty(__pge2__,'length',{value:1,configurable:true});}catch(e){}__def__(ctx,'getExtension',{value:__pge2__,writable:true,configurable:true});}if(typeof ctx.getSupportedExtensions==='function'){var __origGSE2__=ctx.getSupportedExtensions;var __pgse2__=new Proxy(__origGSE2__,{apply:function(target,self,args){var out=Reflect.apply(target,self,args);var next=Array.isArray(out)?out.slice():[];if(next.indexOf('WEBGL_debug_renderer_info')===-1)next.push('WEBGL_debug_renderer_info');return next;}});__fm__.set(__pgse2__,'function getSupportedExtensions() { [native code] }');try{Object.defineProperty(__pgse2__,'name',{value:'getSupportedExtensions',configurable:true});}catch(e){}try{Object.defineProperty(__pgse2__,'length',{value:0,configurable:true});}catch(e){}__def__(ctx,'getSupportedExtensions',{value:__pgse2__,writable:true,configurable:true});}if(typeof ctx.getParameter==='function'){var __origGP2__=ctx.getParameter;var __pgp2__=new Proxy(__origGP2__,{apply:function(target,self,args){var pname=args&&args[0];if(pname===37445)return __wv2__;if(pname===37446)return __wr2__;return Reflect.apply(target,self,args);}});__fm__.set(__pgp2__,'function getParameter() { [native code] }');try{Object.defineProperty(__pgp2__,'name',{value:'getParameter',configurable:true});}catch(e){}try{Object.defineProperty(__pgp2__,'length',{value:1,configurable:true});}catch(e){}__def__(ctx,'getParameter',{value:__pgp2__,writable:true,configurable:true});}return ctx;}var oc2=typeof OffscreenCanvas!=='undefined'&&OffscreenCanvas&&OffscreenCanvas.prototype;if(oc2&&typeof oc2.getContext==='function'){var __origGC2__=oc2.getContext;var __pgc2__=new Proxy(__origGC2__,{apply:function(target,self,args){var kind=String(args&&args[0]||'').toLowerCase();if(kind==='webgpu')return null;var ctx=Reflect.apply(target,self,args);if(kind==='webgl'||kind==='webgl2'||kind==='experimental-webgl'){if(__s__.workerWebglMode==='real')return ctx;return __wrapGl2__(ctx);}return ctx;}});__fm__.set(__pgc2__,'function getContext() { [native code] }');try{Object.defineProperty(__pgc2__,'name',{value:'getContext',configurable:true});}catch(e){}try{Object.defineProperty(__pgc2__,'length',{value:2,configurable:true});}catch(e){}__def__(oc2,'getContext',{value:__pgc2__,writable:true,configurable:true});}` +
      `}` +
      `})();`
  }

  // ---------------------------------------------------------------------------
  // patchWorkerConstructor — wraps the Worker or SharedWorker constructor so
  // that the spoof prelude is injected at the top of each worker script.
  //
  // Strategy: create a blob containing  prelude + importScripts(originalUrl)
  // and pass that blob URL to the native constructor. This avoids any async
  // fetch and works for blob: URLs and same-origin script URLs. importScripts
  // is synchronous and available in all non-module workers.
  //
  // Skipped cases (pass-through to native):
  //   - module workers ({type:'module'}) — importScripts not available there
  //   - cross-origin script URLs — would violate CORS
  // ---------------------------------------------------------------------------
  const patchWorkerConstructor = (
    realm: WindowRealm,
    ctorName: 'Worker' | 'SharedWorker',
    prelude: string,
  ): void => {
    const realmRec = realm as WindowRealm & Record<string, unknown>
    const nativeCtor = realmRec[ctorName] as
      | (new (url: string | URL, options?: WorkerOptions) => Worker)
      | undefined
    if (typeof nativeCtor !== 'function') return

    const NativeCtor = nativeCtor
    const realmURL = (realm as WindowRealm & { URL?: typeof URL }).URL ?? URL
    const realmLocation = realm.location

    function PatchedWorkerCtor(this: unknown, url: string | URL, options?: WorkerOptions): Worker {
      const isModuleWorker = options != null && (options as Record<string, unknown>)['type'] === 'module'

      const rawUrlStr = url instanceof URL ? url.href : String(url)
      let resolvedUrlStr = rawUrlStr

      // Determine if the URL is local (blob: or same-origin) and resolve relative URLs
      // against the page URL before handing them to importScripts(). Blob workers use a
      // blob: base URL, so passing a relative string like './creep.js' would otherwise
      // resolve against the blob URL and fail to load the original worker script.
      let isLocal = rawUrlStr.startsWith('blob:')
      if (realmLocation) {
        try {
          const parsed = new URL(rawUrlStr, realmLocation.href)
          resolvedUrlStr = parsed.href
          if (!isLocal) isLocal = parsed.origin === realmLocation.origin
        } catch {
          resolvedUrlStr = rawUrlStr
          if (!isLocal) isLocal = false
        }
      }

      if (!isLocal) return new NativeCtor(url, options)

      // Build patched worker: prelude runs first, then the original script.
      const wrapped = isModuleWorker
        ? prelude + '\nimport(' + JSON.stringify(resolvedUrlStr) + ');'
        : prelude + '\nimportScripts(' + JSON.stringify(resolvedUrlStr) + ');'
      const blob = new Blob([wrapped], { type: 'application/javascript' })
      const blobUrl = realmURL.createObjectURL(blob)
      // Do not revoke synchronously: some engines fetch the worker script lazily
      // and immediate revoke can surface as a worker load failure.
      const instance = new NativeCtor(blobUrl, options)
      try {
        const revoke = () => { try { realmURL.revokeObjectURL(blobUrl) } catch { void 0 } }
        realm.setTimeout(revoke, 15_000)
      } catch { void 0 }
      return instance
    }

    // Krok 2B+2C: cloak handles prototype, name, length — mirrors NativeCtor identity.
    cloak(PatchedWorkerCtor as AnyFn, NativeCtor)

    // Krok 3: copy all static own-property descriptors from NativeCtor
    // (length / name / prototype are already handled by cloak above — skip them).
    const skipStaticKeys = new Set<PropertyKey>(['length', 'name', 'prototype'])
    for (const key of nativeReflectOwnKeys(NativeCtor as object)) {
      if (skipStaticKeys.has(key)) continue
      const desc = nativeGetOwnPropertyDescriptor(NativeCtor as object, key as string)
      if (desc) try { nativeDefineProperty(PatchedWorkerCtor as unknown as object, key as string, desc) } catch { void 0 }
    }

    // Krok 2A: preserve existing descriptor flags rather than hard-coding them.
    const existingDesc = nativeGetOwnPropertyDescriptor(realmRec, ctorName)
    try {
      nativeDefineProperty(realmRec, ctorName, {
        value: PatchedWorkerCtor,
        writable:     existingDesc != null ? Boolean(existingDesc.writable)     : true,
        configurable: existingDesc != null ? Boolean(existingDesc.configurable) : true,
        enumerable:   existingDesc != null ? Boolean(existingDesc.enumerable)   : false,
      })
    } catch { void 0 }
  }

  const isCreepJsPage = (realm: WindowRealm): boolean => {
    const pageLocation = realm.location
    if (!pageLocation) {
      return false
    }

    const host = String(pageLocation.hostname || '').toLowerCase()
    const path = String(pageLocation.pathname || '')
    return host === 'abrahamjuliot.github.io' && /^\/creepjs(?:\/|$)/.test(path)
  }

  const patchServiceWorkerRegisterForCreepJsFallback = (realm: WindowRealm): void => {
    const nav = realm.navigator as Navigator & {
      serviceWorker?: ServiceWorkerContainer & { register?: (scriptURL: string | URL, options?: RegistrationOptions) => Promise<ServiceWorkerRegistration> }
    }
    const sw = nav.serviceWorker
    if (!sw || typeof sw.register !== 'function') {
      return
    }
    const nativeRegister = sw.register
    const patchedRegister = cloak(new Proxy(nativeRegister, {
      apply(target, self, args: [string | URL, RegistrationOptions | undefined]) {
        const pageLocation = realm.location
        if (!pageLocation || !isCreepJsPage(realm)) {
          return Reflect.apply(target, self, args)
        }
        try {
          const resolved = new URL(args[0] instanceof URL ? args[0].href : String(args[0] || ''), pageLocation.href)
          if (/\/creep\.js$/i.test(resolved.pathname)) {
            return Promise.reject(new Error('ServiceWorker probe rerouted to dedicated/shared worker compatibility path'))
          }
        } catch {
          return Reflect.apply(target, self, args)
        }
        return Reflect.apply(target, self, args)
      },
    }), nativeRegister)
    overload(sw, 'register', patchedRegister, { configurable: true, force: true, writable: true })
  }

  const applyNavigatorIdentitySurface = (navigatorLike: Navigator, plan: RuntimePlan): void => {
    const context = plan
    if (navigatorLike === null || typeof navigatorLike !== 'object' || !('userAgent' in navigatorLike)) {
      return
    }

    const spoofedUserAgent = context.payload.current.userAgent
    const spoofedAppVersion = (() => {
      if (context.payload.current.browser === 'firefox') {
        switch (context.payload.current.os) {
          case 'windows':
            return '5.0 (Windows)'
          case 'linux':
            return '5.0 (X11)'
        }

        return '5.0'
      }

      return spoofedUserAgent.replace(/^Mozilla\//i, '')
    })()

    const isSafariPersona = context.payload.current.browser === 'safari'
    const safariPrototype = isSafariPersona ? Object.getPrototypeOf(navigatorLike) : null

    if (isSafariPersona && safariPrototype && typeof safariPrototype === 'object') {
      const spoofedPlatform = context.profile?.platform || (context.payload.current.os === 'iOS' ? 'iPhone' : 'MacIntel')
      const spoofedVendor = context.profile?.vendor || 'Apple Computer, Inc.'

      safePropDeleteCritical(navigatorLike as Navigator & Record<string, unknown>, 'userAgent')
      safePropDeleteCritical(navigatorLike as Navigator & Record<string, unknown>, 'appVersion')
      safePropDeleteCritical(navigatorLike as Navigator & Record<string, unknown>, 'platform')
      safePropDeleteCritical(navigatorLike as Navigator & Record<string, unknown>, 'vendor')

      overload(safariPrototype, 'userAgent', spoofedUserAgent, { force: true, configurable: true })
      overload(safariPrototype, 'appVersion', spoofedAppVersion, { force: true, configurable: true })
      overload(safariPrototype, 'platform', spoofedPlatform, { force: true, configurable: true })
      overload(safariPrototype, 'vendor', spoofedVendor, { force: true, configurable: true })
    } else {
      overload(navigatorLike, 'userAgent', spoofedUserAgent, { force: true, configurable: true })
      overload(navigatorLike, 'appVersion', spoofedAppVersion, { force: true, configurable: true })
    }

    const activeLocaleMode = localeMode(plan)
    const activeLocale = effectiveLocale(plan)
    if (activeLocaleMode !== 'real' && activeLocale) {
      overload(navigatorLike, 'language', activeLocale, { force: true })
      overload(navigatorLike, 'languages', [...effectiveLanguages(plan)], { force: true })
    }

    if (context.profile) {
      const hardwareConcurrencyMode = spoofMode(plan, 'hardwareConcurrency')
      if (hardwareConcurrencyMode === 'random') {
        overload(navigatorLike, 'hardwareConcurrency', context.profile.hardwareConcurrency, { force: true })
      } else if (hardwareConcurrencyMode === 'off') {
        overload(navigatorLike, 'hardwareConcurrency', undefined, { configurable: true })
      }

      const deviceMemoryMode = spoofMode(plan, 'deviceMemory')
      if (deviceMemoryMode === 'random') {
        overload(navigatorLike, 'deviceMemory', context.profile.deviceMemory, { force: true })
      } else if (deviceMemoryMode === 'off') {
        overload(navigatorLike, 'deviceMemory', undefined, { configurable: true })
      }

      overload(navigatorLike, 'maxTouchPoints', context.profile.maxTouchPoints, { force: true })
      overload(navigatorLike, 'webdriver', false, { force: true })
    }

    if (surfaceIsRestricted(plan, 'webGpu')) {
      overload(navigatorLike, 'gpu', undefined, { force: true, configurable: true })
    }

    if (surfaceIsRestricted(plan, 'pdfViewer')) {
      overload(navigatorLike, 'pdfViewerEnabled', false, { force: true, configurable: true })
    } else if (context.profile) {
      overload(navigatorLike, 'pdfViewerEnabled', context.profile.pdfViewerEnabled, { force: true })
    }

    if (isRestricted(context, 'sensitiveDeviceApis')) {
      overload(navigatorLike, 'serial', undefined, { force: true, configurable: true })
      overload(navigatorLike, 'usb', undefined, { force: true, configurable: true })
      overload(navigatorLike, 'hid', undefined, { force: true, configurable: true })
      overload(navigatorLike, 'bluetooth', undefined, { force: true, configurable: true })
    }

    switch (context.payload.current.os) {
      case 'windows':
        overload(navigatorLike, 'platform', context.profile?.platform || 'Win32', { force: true, configurable: true })
        overload(navigatorLike, 'oscpu', context.profile?.oscpu, { force: true })
        break
      case 'linux':
        overload(navigatorLike, 'platform', context.profile?.platform || 'Linux x86_64', { force: true, configurable: true })
        overload(navigatorLike, 'oscpu', context.profile?.oscpu, { force: true })
        break
      case 'android':
        overload(navigatorLike, 'platform', context.profile?.platform || 'Linux armv8l', { force: true, configurable: true })
        overload(navigatorLike, 'oscpu', context.profile?.oscpu, { force: true })
        break
      case 'macOS':
        if (!isSafariPersona) overload(navigatorLike, 'platform', context.profile?.platform || 'MacIntel', { force: true, configurable: true })
        overload(navigatorLike, 'oscpu', context.profile?.oscpu, { force: true })
        break
      case 'iOS':
        if (!isSafariPersona) overload(navigatorLike, 'platform', context.profile?.platform || 'iPhone', { force: true, configurable: true })
        overload(navigatorLike, 'oscpu', context.profile?.oscpu, { force: true })
        break
      default:
        overload(navigatorLike, 'oscpu', undefined, { force: true })
    }

    switch (context.payload.current.browser) {
      case 'chrome':
      case 'opera':
      case 'edge':
        overload(navigatorLike, 'vendor', context.profile?.vendor || 'Google Inc.', { force: true, configurable: true })
        break
      case 'firefox':
        overload(navigatorLike, 'vendor', context.profile?.vendor || '', { force: true, configurable: true })
        break
      case 'safari':
        if (!isSafariPersona) overload(navigatorLike, 'vendor', context.profile?.vendor || 'Apple Computer, Inc.', { force: true, configurable: true })
        break
      default:
        overload(navigatorLike, 'vendor', undefined, { force: true, configurable: true })
    }

    const browserSupportsNetworkInformation = ['chrome', 'edge', 'opera'].includes(context.payload.current.browser)
    if (browserSupportsNetworkInformation) {
      const connectionProto = (window as WindowRealm & { NetworkInformation?: { prototype?: object } }).NetworkInformation?.prototype
      const base = new window.EventTarget() as EventTarget & Record<string, unknown>
      if (connectionProto) {
        try { Object.setPrototypeOf(base, connectionProto) } catch { void 0 }
      }
      const isMobileDevice = Boolean(context.profile?.mobile ?? context.payload.isMobile)
      const connection = base as EventTarget & Record<string, unknown>
      const effectiveType = isMobileDevice ? '4g' : '4g'
      const downlink = isMobileDevice ? 8.6 : 10
      const rtt = isMobileDevice ? 120 : 50
      nativeDefineProperty(connection, 'effectiveType', { get: cloak(() => effectiveType, function _effectiveType() { return '4g' }), enumerable: true, configurable: true })
      nativeDefineProperty(connection, 'downlink', { get: cloak(() => downlink, function _downlink() { return 10 }), enumerable: true, configurable: true })
      nativeDefineProperty(connection, 'rtt', { get: cloak(() => rtt, function _rtt() { return 50 }), enumerable: true, configurable: true })
      nativeDefineProperty(connection, 'saveData', { get: cloak(() => false, function _saveData() { return false }), enumerable: true, configurable: true })
      nativeDefineProperty(connection, 'type', { get: cloak(() => (isMobileDevice ? 'cellular' : 'wifi'), function _type() { return 'wifi' }), enumerable: true, configurable: true })
      nativeDefineProperty(connection, 'onchange', { value: null, configurable: true, writable: true })
      overload(navigatorLike, 'connection', connection, { force: true, configurable: true })
    }

    // navigator.userAgentData — proto-level value patch.
    // Presence (add / remove) is managed exclusively by applyBrowserCapabilitiesSurface,
    // which always runs before this surface in the registry.
    // This block patches values on the UAD *prototype*, never on the instance.
    // Zero own props on the instance is preserved: Object.getOwnPropertyDescriptors(uad) → {}
    //
    // Shape invariant (Chrome/Edge Linux dump):
    //   brands/mobile/platform → getter, enumerable:true, configurable:true, set:undefined
    //   toJSON/getHighEntropyValues → value, writable:true, enumerable:true, configurable:true
    //
    // 'real' does NOT reach here: applyBrowserCapabilitiesSurface removed UAD for 'real'.

    // ---------------------------------------------------------------------------
    // UAD-specific proto helpers — never use the generic overload() for UAD.
    // Each helper reads the existing descriptor and replaces only the relevant
    // field, preserving enumerable / configurable / writable exactly as found.
    // ---------------------------------------------------------------------------
    const patchUADProtoGetter = (proto: object, prop: string, getter: () => unknown): void => {
      const existing = nativeGetOwnPropertyDescriptor(proto, prop)
      if (!existing || !('get' in existing)) return
      if (existing.get) cloak(getter, existing.get)
      nativeDefineProperty(proto, prop, {
        get: getter,
        set: undefined,
        enumerable: existing.enumerable ?? true,
        configurable: existing.configurable ?? true,
      })
    }

    const patchUADProtoMethod = (proto: object, prop: string, fn: AnyFn): void => {
      const existing = nativeGetOwnPropertyDescriptor(proto, prop)
      if (!existing || !('value' in existing)) return
      if (typeof existing.value === 'function') cloak(fn, existing.value as AnyFn)
      nativeDefineProperty(proto, prop, {
        value: fn,
        writable: existing.writable ?? true,
        enumerable: existing.enumerable ?? true,
        configurable: existing.configurable ?? true,
      })
    }

    // ---------------------------------------------------------------------------
    // Inlined equivalents of ua-ch.ts helpers.
    // inject.ts cannot import runtime values (see top-of-file warning), so these
    // mirror platformVersionFor / architectureFor / bitnessFor exactly.
    // Any logic change in ua-ch.ts MUST be reflected here too.
    // ---------------------------------------------------------------------------
    const uadPlatformVersionFor = (): string => {
      const ua = context.payload.current
      const fp = context.profile
      if (fp?.platformVersion) return fp.platformVersion
      switch (ua.os) {
        case 'windows': return '15.0.0'
        case 'linux':   return '6.8.0'
        case 'macOS':   return '14.6.1'
        case 'iOS': {
          const raw = (ua.device?.osVersion || '17.4').replace(/_/g, '.')
          const parts = raw.split('.').filter(Boolean)
          while (parts.length < 3) parts.push('0')
          return parts.slice(0, 3).join('.')
        }
        case 'android': {
          const raw = (ua.device?.osVersion || '14').replace(/_/g, '.')
          const parts = raw.split('.').filter(Boolean)
          if (!parts.length) return ''
          while (parts.length < 3) parts.push('0')
          return parts.slice(0, 3).join('.')
        }
        default: return ''
      }
    }

    const uadArchitectureFor = (): string => {
      const ua = context.payload.current
      const gpuVendor = context.profile?.gpu?.vendor
      switch (ua.os) {
        case 'android':
        case 'iOS':   return 'arm'
        case 'macOS': return gpuVendor === 'apple' ? 'arm' : 'x86'
        default:      return 'x86'
      }
    }

    const uadBitnessFor = (): string => {
      switch (context.payload.current.os) {
        case 'android':
        case 'iOS': return ''
        default:    return '64'
      }
    }

    // ---------------------------------------------------------------------------
    // buildUADState — single source of truth for all UAD data.
    // Called once; all getters, toJSON, and getHighEntropyValues consume the same
    // frozen references — no per-site recalculation, no duplicated brand arrays.
    // ---------------------------------------------------------------------------
    type UADBrandEntry = { readonly brand: string; readonly version: string }
    const buildUADState = (): {
      brands:          readonly UADBrandEntry[]
      fullVersionList: readonly UADBrandEntry[]
      mobile:          boolean
      platform:        string
      uaFullVersion:   string
      model:           string
      platformVersion: string
      architecture:    string
      bitness:         string
      wow64:           boolean
      formFactors:     readonly string[]
    } => {
      // Deep-freeze brand entries once — reused by getter, toJSON, and getHighEntropyValues.
      const brands = Object.freeze(
        context.payload.brands.major.map(({ brand, version }) =>
          Object.freeze({ brand, version } as UADBrandEntry)
        )
      )
      const fullVersionList = Object.freeze(
        context.payload.brands.full.map(({ brand, version }) =>
          Object.freeze({ brand, version } as UADBrandEntry)
        )
      )
      return {
        brands,
        fullVersionList,
        mobile:          context.profile?.mobile ?? context.payload.isMobile,
        platform:        context.payload.platform,
        uaFullVersion:   context.payload.current.version.browser.full,
        model:           context.profile?.model || '',
        platformVersion: uadPlatformVersionFor(),
        architecture:    uadArchitectureFor(),
        bitness:         uadBitnessFor(),
        wow64:           context.payload.current.os === 'windows' && /WOW64/i.test(context.payload.current.userAgent),
        formFactors:     Object.freeze(context.payload.current.device?.type === 'tablet' ? ['Tablet'] : ((context.payload.current.os === 'android' || context.payload.current.os === 'iOS' || context.payload.current.device?.type === 'mobile') ? ['Mobile'] : ['Desktop'])),
      }
    }

    const chMode = spoofMode(plan, 'clientHints')
    const fn = BROWSER_CAP.get('navigator.userAgentData')
    const personaHasCH = fn ? fn(context.payload.current.browser, context.payload.current.version.browser.major) : false
    const shouldExposeUAD = chMode !== 'off' && personaHasCH && plan.environment.secureContext

    if (shouldExposeUAD && chMode !== 'real') {
      const navWithUAD = navigatorLike as Navigator & { userAgentData?: unknown }
      const safeReadUAD = (): { object: object | null; nativeGetHighEntropyValues?: ((hints: string[]) => Promise<Record<string, unknown>>) } => {
        try {
          const value = navWithUAD.userAgentData
          if (!value || typeof value !== 'object') {
            return { object: null }
          }
          const nativeGetHighEntropyValues = typeof (value as { getHighEntropyValues?: unknown }).getHighEntropyValues === 'function'
            ? (((value as unknown as { getHighEntropyValues: (hints: string[]) => Promise<Record<string, unknown>> }).getHighEntropyValues.bind(value)))
            : undefined
          return { object: value as object, nativeGetHighEntropyValues }
        } catch {
          return { object: null }
        }
      }

      const buildResolvedUADState = () => buildUADState()

      let current = safeReadUAD()
      let uad = current.object

      if (!uad || typeof (uad as { getHighEntropyValues?: unknown }).getHighEntropyValues !== 'function') {
        const NavigatorUADataCtor = (window as WindowRealm & Record<string, unknown>)['NavigatorUAData'] as { prototype?: object } | undefined
        const nativeUADProto = NavigatorUADataCtor?.prototype
        const syntheticProto = (() => {
          const proto = Object.create(Object.prototype) as Record<string | symbol, unknown>
          nativeDefineProperty(proto, 'brands', {
            get: cloak(function brands() { return Object.freeze([]) }, { name: 'get brands', length: 0 }),
            configurable: true,
            enumerable: true,
          })
          nativeDefineProperty(proto, 'mobile', {
            get: cloak(function mobile() { return false }, { name: 'get mobile', length: 0 }),
            configurable: true,
            enumerable: true,
          })
          nativeDefineProperty(proto, 'platform', {
            get: cloak(function platform() { return '' }, { name: 'get platform', length: 0 }),
            configurable: true,
            enumerable: true,
          })
          nativeDefineProperty(proto, 'toJSON', {
            value: cloak(function toJSON(this: Record<string, unknown>) {
              return { brands: this['brands'], mobile: this['mobile'], platform: this['platform'] }
            }, { name: 'toJSON', length: 0 }),
            configurable: true,
            writable: true,
            enumerable: true,
          })
          nativeDefineProperty(proto, 'getHighEntropyValues', {
            value: cloak(function getHighEntropyValues() { return Promise.resolve({}) }, { name: 'getHighEntropyValues', length: 1 }),
            configurable: true,
            writable: true,
            enumerable: true,
          })
          nativeDefineProperty(proto, Symbol.toStringTag, {
            value: 'NavigatorUAData',
            configurable: true,
            enumerable: false,
            writable: false,
          })
          return proto
        })()
        const uadObj = Object.create(nativeUADProto ?? syntheticProto)
        const navProto = Object.getPrototypeOf(navigatorLike)
        if (navProto) {
          const existing = nativeGetOwnPropertyDescriptor(navProto, 'userAgentData')
          const getter = typeof existing?.get === 'function'
            ? cloak(() => uadObj, existing.get as AnyFn)
            : cloak(() => uadObj, { name: 'get userAgentData', length: 0 })
          try {
            nativeDefineProperty(navProto, 'userAgentData', {
              get: getter,
              set: undefined,
              enumerable: existing?.enumerable ?? true,
              configurable: existing?.configurable ?? true,
            })
          } catch { void 0 }
        } else {
          const getter = cloak(() => uadObj, { name: 'get userAgentData', length: 0 })
          try {
            nativeDefineProperty(navigatorLike as Navigator & Record<string, unknown>, 'userAgentData', {
              get: getter,
              set: undefined,
              enumerable: true,
              configurable: true,
            })
          } catch { void 0 }
        }
        current = safeReadUAD()
        if (!current.object) {
          try {
            const getter = cloak(() => uadObj, { name: 'get userAgentData', length: 0 })
            nativeDefineProperty(navigatorLike as Navigator & Record<string, unknown>, 'userAgentData', {
              get: getter,
              set: undefined,
              enumerable: true,
              configurable: true,
            })
          } catch { void 0 }
          current = safeReadUAD()
        }
        uad = current.object ?? uadObj
      }

      if (uad) {
        const uadProto = Object.getPrototypeOf(uad) as object | null

        if (uadProto) {
          const state = buildResolvedUADState()

          patchUADProtoGetter(uadProto, 'brands',   () => state.brands)
          patchUADProtoGetter(uadProto, 'mobile',   () => state.mobile)
          patchUADProtoGetter(uadProto, 'platform', () => state.platform)

          patchUADProtoMethod(
            uadProto,
            'toJSON',
            function toJSON() {
              return { brands: state.brands, mobile: state.mobile, platform: state.platform }
            }
          )

          patchUADProtoMethod(
            uadProto,
            'getHighEntropyValues',
            function getHighEntropyValues(hints: unknown) {
              const requestedHints = Array.isArray(hints) ? (hints as string[]).map((hint) => String(hint)) : []
              const requestedHintsSet = new Set<string>(requestedHints)
              const data: Record<string, unknown> = {
                brands: state.brands,
                mobile: state.mobile,
                platform: state.platform,
              }
              if (requestedHintsSet.has('fullVersionList')) data['fullVersionList'] = state.fullVersionList
              if (requestedHintsSet.has('uaFullVersion'))   data['uaFullVersion']   = state.uaFullVersion
              if (requestedHintsSet.has('model'))           data['model']           = state.model
              if (requestedHintsSet.has('platformVersion')) data['platformVersion'] = state.platformVersion
              if (requestedHintsSet.has('architecture'))    data['architecture']    = state.architecture
              if (requestedHintsSet.has('bitness'))         data['bitness']         = state.bitness
              if (requestedHintsSet.has('wow64'))           data['wow64']           = state.wow64
              if (requestedHintsSet.has('formFactors'))     data['formFactors']     = state.formFactors
              return Promise.resolve(data)
            }
          )
        }
      }
    }
  }


  const getRealmNavigatorTargets = (realm: WindowRealm): readonly Navigator[] => {
    const targets: Navigator[] = []

    if (typeof realm.clientInformation === 'object' && realm.clientInformation !== null) {
      targets.push(realm.clientInformation)
    }

    if (!targets.includes(realm.navigator)) {
      targets.push(realm.navigator)
    }

    return targets
  }

  const realmSurfaceSupport = (realm: WindowRealm): Readonly<Record<RuntimeSurfaceId, boolean>> => {
    const secureContext = realm.isSecureContext === true
    const planHostBrowserFamily = currentPlanRef?.environment.hostBrowserFamily || 'chromium'
    const hasWindowQueryLocalFonts = typeof (realm as WindowRealm & { queryLocalFonts?: unknown }).queryLocalFonts === 'function'
    const hasMediaDevices = typeof realm.navigator.mediaDevices?.enumerateDevices === 'function'
    const hasPermissionsApi = typeof realm.navigator.permissions?.query === 'function'
    const hasPdfCollections = 'plugins' in realm.navigator && 'mimeTypes' in realm.navigator
    const hasWebGpuEntryPoint = 'gpu' in realm.navigator
    const hasCanvasGetContext = typeof realm.HTMLCanvasElement?.prototype?.getContext === 'function'

    return {
      navigatorIdentity: true,
      screen: typeof realm.screen === 'object' && realm.screen !== null,
      webgl: typeof realm.WebGLRenderingContext === 'function' || typeof realm.WebGL2RenderingContext === 'function',
      webGpu: secureContext && (hasWebGpuEntryPoint || hasCanvasGetContext),
      mediaDevices: secureContext && hasMediaDevices,
      fonts: typeof realm.document.fonts?.check === 'function' || (secureContext && hasWindowQueryLocalFonts),
      permissions: hasPermissionsApi || planHostBrowserFamily === 'chromium',
      pdfViewer: hasPdfCollections || 'pdfViewerEnabled' in realm.navigator,
      intl: typeof realm.Intl?.DateTimeFormat?.prototype?.resolvedOptions === 'function',
      canvas: typeof (realm as WindowRealm & { CanvasRenderingContext2D?: unknown }).CanvasRenderingContext2D === 'function',
      audio: typeof (realm as WindowRealm & { AudioBuffer?: unknown }).AudioBuffer !== 'undefined',
      timezone: typeof realm.Date?.prototype?.getTimezoneOffset === 'function' &&
        typeof realm.Intl?.DateTimeFormat?.prototype?.resolvedOptions === 'function',
      domRect: typeof realm.Element?.prototype?.getBoundingClientRect === 'function',
      textMetrics: typeof (realm as WindowRealm & { CanvasRenderingContext2D?: unknown }).CanvasRenderingContext2D === 'function',
      mathFingerprint: typeof realm.Math?.tan === 'function',
      speechVoices: typeof realm.speechSynthesis !== 'undefined',
      webrtc: typeof (realm as WindowRealm & { RTCPeerConnection?: unknown }).RTCPeerConnection === 'function',
      battery: typeof (realm.navigator as Navigator & { getBattery?: unknown }).getBattery === 'function',
      browserCapabilities: true,
    }
  }

  const surfaceShouldApplyToRealm = (realm: WindowRealm, plan: RuntimePlan, surface: RuntimeSurfaceId): boolean => {
    const support = realmSurfaceSupport(realm)
    return plan.environment.declaredSupportLevels[surface] !== 'none' && support[surface] === true && surfaceIsEnabled(plan, surface)
  }

  const collectIframeElements = (node: Node): HTMLIFrameElement[] => {
    const iframes: HTMLIFrameElement[] = []
    const root = node as Node & ParentNode

    if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'IFRAME') {
      iframes.push(node as HTMLIFrameElement)
    }

    if (typeof root.querySelectorAll === 'function') {
      root.querySelectorAll('iframe').forEach((iframe) => iframes.push(iframe))
    }

    return iframes
  }

  const observeRealm = (realm: WindowRealm, plan: RuntimePlan): void => {
    const realmDocument = realm.document
    if (!realmDocument || observedRealmDocuments.has(realmDocument)) {
      return
    }

    observedRealmDocuments.add(realmDocument)

    const overloadOpts: Parameters<typeof overload>[3] = { configurable: true, force: true, writable: true }
    const proxyInvoke = <T extends (...args: readonly unknown[]) => unknown>(what: T): T =>
      new Proxy(what as (...args: readonly unknown[]) => unknown, {
        apply(target, thisArg, args: readonly unknown[]) {
          const result = Reflect.apply(target, thisArg, args)

          args.forEach((value) => {
            if (typeof value === 'object' && value !== null && 'nodeType' in (value as object)) {
              collectIframeElements(value as Node).forEach((iframe) => applyRuntimeSurfaceToIframe(iframe, plan))
            }
          })

          return result
        },
      }) as T
    const patchMethod = (target: object, methodName: string): void => {
      const current = Reflect.get(target, methodName)
      if (typeof current !== 'function') {
        return
      }

      overload(target, methodName, proxyInvoke(current as (...args: readonly unknown[]) => unknown), overloadOpts)
    }

    patchMethod(realm.Node.prototype, 'appendChild')
    patchMethod(realm.Node.prototype, 'insertBefore')
    patchMethod(realm.Node.prototype, 'replaceChild')
    patchMethod(realm.Element.prototype, 'append')
    patchMethod(realm.Element.prototype, 'prepend')
    patchMethod(realm.Element.prototype, 'replaceWith')

    new realm.MutationObserver((mutations): void => {
      mutations.forEach((mutation): void => {
        mutation.addedNodes.forEach((node) => {
          collectIframeElements(node).forEach((iframe) => applyRuntimeSurfaceToIframe(iframe, plan))
        })
      })
    }).observe(realmDocument, { childList: true, subtree: true })
  }

  const applyRuntimeSurfacesToRealm = (realm: WindowRealm, plan: RuntimePlan): void => {
    const realmDocument = realm.document
    if (!realmDocument) {
      return
    }

    observeRealm(realm, plan)

    let applied = appliedRealmSurfaces.get(realmDocument)
    if (!applied) {
      applied = new Set<RuntimeSurfaceId>()
      appliedRealmSurfaces.set(realmDocument, applied)
    }

    for (const surface of runtimeSurfaceRegistry) {
      if (!surface.shouldApply(plan) || !surfaceShouldApplyToRealm(realm, plan, surface.id) || applied.has(surface.id)) {
        continue
      }

      try {
        surface.apply(realm, plan)
        applied.add(surface.id)
      } catch (error) {
        console.error('💣 RUA: runtime surface failed', surface.id, error)
      }
    }
  }

  const applyRuntimeSurfaceToIframe = (node: Node, plan: RuntimePlan): void => {
    if (typeof node !== 'object' || node == null || node.nodeName !== 'IFRAME' || !('contentWindow' in node)) {
      return
    }

    try {
      const iframe = node as HTMLIFrameElement

      if (!trackedIframeLoadListeners.has(iframe)) {
        iframe.addEventListener(
          'load',
          () => {
            applyRuntimeSurfaceToIframe(iframe, plan)
          },
          true
        )
        trackedIframeLoadListeners.add(iframe)
      }

      if (typeof iframe.contentWindow !== 'object' || iframe.contentWindow == null) {
        return
      }

      const iframeRealm = iframe.contentWindow as WindowRealm
      applyRuntimeSurfacesToRealm(iframeRealm, plan)

      const nestedIframes = iframeRealm.document?.getElementsByTagName('iframe')
      if (nestedIframes) {
        Array.from(nestedIframes).forEach((nested) => applyRuntimeSurfaceToIframe(nested, plan))
      }
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Canvas noise surface
  // ±1 per-pixel noise on R, G, B (A untouched) — read paths only.
  // Native refs are captured before any patching to avoid recursion.
  // Drawing buffer itself is never modified.
  // ---------------------------------------------------------------------------
  const applyCanvasSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const mode = spoofMode(plan, 'canvas')
    if (mode === 'real') {
      return
    }

    const noise = plan.profile?.canvasNoise
    if (mode === 'random' && typeof noise !== 'number') {
      return
    }

    const prng = (seed: number): (() => number) => {
      let s = seed >>> 0
      return () => {
        s += 0x6d2b79f5
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
        return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
      }
    }

    const transformPixels = (data: Uint8ClampedArray, seed: number): void => {
      if (mode === 'off') {
        for (let i = 0; i < data.length; i += 4) {
          data[i] &= 0xf8
          data[i + 1] &= 0xf8
          data[i + 2] &= 0xf8
        }
        return
      }

      const rnd = prng(seed)
      for (let i = 0; i < data.length; i += 4) {
        const dr = rnd() > 0.5 ? 1 : -1
        const dg = rnd() > 0.5 ? 1 : -1
        const db = rnd() > 0.5 ? 1 : -1
        data[i] = Math.max(0, Math.min(255, data[i] + dr))
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + dg))
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + db))
      }
    }

    const ctx2dProto = realm.CanvasRenderingContext2D?.prototype as
      | (CanvasRenderingContext2D & Record<string, unknown>)
      | undefined
    const canvasProto = realm.HTMLCanvasElement?.prototype as
      | (HTMLCanvasElement & Record<string, unknown>)
      | undefined

    const nativeGetImageData = ctx2dProto && typeof ctx2dProto.getImageData === 'function'
      ? (ctx2dProto.getImageData as CanvasRenderingContext2D['getImageData'])
      : undefined
    const nativePutImageData = ctx2dProto && typeof ctx2dProto.putImageData === 'function'
      ? (ctx2dProto.putImageData as CanvasRenderingContext2D['putImageData'])
      : undefined
    const nativeToDataURL = canvasProto && typeof canvasProto.toDataURL === 'function'
      ? (canvasProto.toDataURL as HTMLCanvasElement['toDataURL'])
      : undefined
    const nativeToBlob = canvasProto && typeof canvasProto.toBlob === 'function'
      ? (canvasProto.toBlob as HTMLCanvasElement['toBlob'])
      : undefined

    if (!nativeGetImageData || !ctx2dProto) {
      return
    }

    overload(
      ctx2dProto,
      'getImageData',
      new Proxy(nativeGetImageData, {
        apply(target, self, args) {
          const result: ImageData = Reflect.apply(target, self, args)
          transformPixels(result.data, typeof noise === 'number' ? noise : 0)
          return result
        },
      }),
      { configurable: true, force: true, writable: true }
    )

    if (nativeToDataURL && canvasProto && nativePutImageData) {
      overload(
        canvasProto,
        'toDataURL',
        new Proxy(nativeToDataURL, {
          apply(target, self: HTMLCanvasElement, args) {
            const off = realm.document.createElement('canvas')
            off.width = self.width
            off.height = self.height
            const offCtx = off.getContext('2d')
            if (!offCtx || !off.width || !off.height) {
              return Reflect.apply(target, self, args)
            }
            offCtx.drawImage(self, 0, 0)
            const imgData: ImageData = Reflect.apply(nativeGetImageData, offCtx, [0, 0, off.width, off.height])
            transformPixels(imgData.data, typeof noise === 'number' ? noise : 0)
            Reflect.apply(nativePutImageData, offCtx, [imgData, 0, 0])
            return Reflect.apply(nativeToDataURL, off, args)
          },
        }),
        { configurable: true, force: true, writable: true }
      )
    }

    if (nativeToBlob && canvasProto && nativePutImageData) {
      overload(
        canvasProto,
        'toBlob',
        new Proxy(nativeToBlob, {
          apply(target, self: HTMLCanvasElement, args) {
            const off = realm.document.createElement('canvas')
            off.width = self.width
            off.height = self.height
            const offCtx = off.getContext('2d')
            if (!offCtx || !off.width || !off.height) {
              return Reflect.apply(target, self, args)
            }
            offCtx.drawImage(self, 0, 0)
            const imgData: ImageData = Reflect.apply(nativeGetImageData, offCtx, [0, 0, off.width, off.height])
            transformPixels(imgData.data, typeof noise === 'number' ? noise : 0)
            Reflect.apply(nativePutImageData, offCtx, [imgData, 0, 0])
            Reflect.apply(nativeToBlob, off, args)
          },
        }),
        { configurable: true, force: true, writable: true }
      )
    }

    const wrapReadPixels = (proto: WebGLRenderingContext | WebGL2RenderingContext | undefined): void => {
      if (!proto) {
        return
      }

      const protoWithReadPixels = proto as unknown as { readPixels?: (...args: unknown[]) => void }
      if (typeof protoWithReadPixels.readPixels !== 'function') {
        return
      }

      const original = protoWithReadPixels.readPixels

      overload(
        proto as object,
        'readPixels',
        new Proxy(original, {
          apply(target, self, args: unknown[]) {
            Reflect.apply(target, self, args)
            for (const arg of args) {
              if (arg instanceof Uint8Array || arg instanceof Uint8ClampedArray) {
                transformPixels(
                  arg instanceof Uint8ClampedArray
                    ? arg
                    : new Uint8ClampedArray(arg.buffer, arg.byteOffset, arg.byteLength),
                  typeof noise === 'number' ? noise : 0
                )
                break
              }
            }
          },
        }),
        { configurable: true, force: true, writable: true }
      )
    }

    wrapReadPixels(realm.WebGLRenderingContext?.prototype)
    wrapReadPixels(realm.WebGL2RenderingContext?.prototype)
  }

  // ---------------------------------------------------------------------------
  // Audio noise surface
  // Seeded PRNG noise — deterministic per profile, NOT Math.random().
  // Each channel is seeded by canvasNoise XOR channelIndex for isolation.
  // Clamps samples to [-1, 1]. WeakMap ensures each Float32Array is noised once.
  // ---------------------------------------------------------------------------
  const applyAudioSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const mode = spoofMode(plan, 'audio')
    if (mode === 'real') {
      return
    }

    const amplitude = plan.profile?.audioNoise
    const noiseSeed = plan.profile?.audioSeed ?? plan.profile?.canvasNoise
    const audioBufProto = (realm as WindowRealm & { AudioBuffer?: { prototype?: AudioBuffer } }).AudioBuffer?.prototype as
      | (AudioBuffer & Record<string, unknown>)
      | undefined

    const mulberry32 = (seed: number): (() => number) => {
      let s = seed >>> 0
      return () => {
        s += 0x6d2b79f5
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
        return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
      }
    }

    if (audioBufProto && typeof audioBufProto.getChannelData === 'function') {
      overload(
        audioBufProto,
        'getChannelData',
        new Proxy(audioBufProto.getChannelData as AudioBuffer['getChannelData'], {
          apply(target, self, args) {
            const channel: Float32Array = Reflect.apply(target, self, args)
            if (!noisedAudioChannels.has(channel)) {
              if (mode === 'off') {
                for (let i = 0; i < channel.length; i++) {
                  channel[i] = Math.max(-1, Math.min(1, Math.round(channel[i] * 1024) / 1024))
                }
              } else if (typeof amplitude === 'number' && typeof noiseSeed === 'number') {
                const channelIndex = typeof args[0] === 'number' ? args[0] : 0
                const rng = mulberry32(noiseSeed ^ (channelIndex * 2654435761))
                for (let i = 0; i < channel.length; i++) {
                  const delta = (rng() - 0.5) * 2 * amplitude
                  channel[i] = Math.max(-1, Math.min(1, channel[i] + delta))
                }
              }
              noisedAudioChannels.set(channel, true)
            }
            return channel
          },
        }),
        { configurable: true, force: true, writable: true }
      )
    }

    if (mode !== 'random' || typeof amplitude !== 'number' || typeof noiseSeed !== 'number') {
      return
    }

    const audioSnapshot = buildAudioSnapshot(plan)
    const NativeAudioContext = realm.AudioContext
    if (!audioSnapshot || typeof NativeAudioContext !== 'function') {
      return
    }

    const latencyHints = new WeakMap<object, AudioLatencyHintMode>()

    overload(
      realm,
      'AudioContext',
      new Proxy(NativeAudioContext, {
        construct(target, args, newTarget) {
          const instance = Reflect.construct(target, args, newTarget) as object
          const options = args[0] && typeof args[0] === 'object'
            ? (args[0] as { latencyHint?: unknown })
            : undefined
          latencyHints.set(instance, normalizeLatencyHint(options?.latencyHint))
          return instance
        },
      }),
      { configurable: true, force: true, writable: true }
    )

    const audioContextProto = NativeAudioContext.prototype as AudioContext | undefined
    if (!audioContextProto) {
      return
    }

    overloadGetter(audioContextProto, 'sampleRate', function(this: object) {
      return audioSnapshot.sampleRate
    })

    overloadGetter(audioContextProto, 'baseLatency', function(this: object) {
      const hint = latencyHints.get(this) ?? 'interactive'
      switch (hint) {
        case 'playback':
          return audioSnapshot.playbackLatency
        case 'balanced':
          return audioSnapshot.balancedLatency
        default:
          return audioSnapshot.interactiveLatency
      }
    })

    overloadGetter(audioContextProto, 'outputLatency', function(this: object) {
      return audioSnapshot.outputLatency
    })
  }

  // ---------------------------------------------------------------------------
  // Timezone spoofing surface
  // DST-aware — uses nativeDateTimeFormat.formatToParts() (captured before patching).
  // All Date references go through realm.Date to avoid cross-realm leaks.
  // Applied AFTER intl in the registry so timeZone is added on top of locale.
  // ---------------------------------------------------------------------------
  const applyTimezoneSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const mode = timezoneMode(plan)
    if (mode === 'real') {
      return
    }

    const zone = effectiveTimeZone(plan)
    if (typeof zone !== 'string' || !nativeDateTimeFormat) {
      return
    }

    // Compute UTC offset in minutes for zone at a specific date.
    // Uses nativeDateTimeFormat (captured pre-patch) so we read the real browser zone math.
    // Sign convention matches browser: offset = (UTC - localWallClock) / 60000
    const getOffsetMinutes = (date: Date): number => {
      try {
        const formatter = new nativeDateTimeFormat('en-US', {
          timeZone: zone,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false,
        })
        const parts = formatter.formatToParts(date)
        const get = (type: string): number => {
          const part = parts.find((p) => p.type === type)
          return part ? parseInt(part.value, 10) : 0
        }
        let hour = get('hour')
        if (hour === 24) hour = 0  // hour12:false may emit 24 for midnight
        const zoneMs = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'))
        return Math.round((date.getTime() - zoneMs) / 60000)
      } catch {
        return 0
      }
    }

    // Patch realm.Date.prototype.getTimezoneOffset — realm-native, not host-native
    const realmDateProto = realm.Date?.prototype
    if (!realmDateProto || typeof realmDateProto.getTimezoneOffset !== 'function') {
      return
    }

    overload(
      realmDateProto,
      'getTimezoneOffset',
      new Proxy(realmDateProto.getTimezoneOffset as Date['getTimezoneOffset'], {
        apply(_target, self: Date) {
          return getOffsetMinutes(self)
        },
      }),
      { configurable: true, force: true, writable: true }
    )

    // Patch Intl.DateTimeFormat.prototype.resolvedOptions to expose zone.
    // The intl surface already patched this to inject locale;
    // we wrap again adding timeZone so both locale AND timeZone are correct.
    const resolvedOptionsFn = realm.Intl?.DateTimeFormat?.prototype?.resolvedOptions
    if (typeof resolvedOptionsFn !== 'function') {
      return
    }

    overload(
      realm.Intl.DateTimeFormat.prototype,
      'resolvedOptions',
      new Proxy(resolvedOptionsFn, {
        apply(target, self, args) {
          const current = Reflect.apply(target, self, args)
          return { ...current, timeZone: zone }
        },
      }),
      { configurable: true, force: true, writable: true }
    )
  }

  const applyDomRectSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const mode = spoofMode(plan, 'domRect')
    if (mode === 'real') return

    const noise = plan.profile?.domRectNoise
    if (mode === 'random' && typeof noise !== 'number') return

    const baseNoise = typeof noise === 'number' ? noise : 0
    const hashRect = (x: number, y: number, w: number, h: number): number => {
      let hash = baseNoise >>> 0
      const mix = (v: number) => { hash ^= (v * 2654435761) >>> 0; hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b); hash = (hash ^ (hash >>> 16)) >>> 0 }
      mix(Math.round(x * 1000)); mix(Math.round(y * 1000)); mix(Math.round(w * 1000)); mix(Math.round(h * 1000))
      return hash
    }
    const prng = (s: number) => { let x = s >>> 0; return () => { x += 0x6d2b79f5; let t = Math.imul(x ^ (x >>> 15), 1 | x); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 0x100000000 } }
    const transformRect = (r: DOMRect) => {
      if (mode === 'off') {
        return new realm.DOMRect(
          Math.round(r.x),
          Math.round(r.y),
          Math.round(r.width),
          Math.round(r.height)
        )
      }
      const rng = prng(hashRect(r.x, r.y, r.width, r.height))
      return new realm.DOMRect(
        r.x + (rng() - 0.5) * 0.001,
        r.y + (rng() - 0.5) * 0.001,
        r.width + (rng() - 0.5) * 0.001,
        r.height + (rng() - 0.5) * 0.001
      )
    }

    const origGetBCR = realm.Element?.prototype?.getBoundingClientRect
    if (typeof origGetBCR !== 'function') return

    const patchedGetBCR = new Proxy(origGetBCR, {
      apply(target, self, args) {
        return transformRect(Reflect.apply(target, self, args) as DOMRect)
      },
    })
    cloak(patchedGetBCR, origGetBCR)
    overload(realm.Element.prototype, 'getBoundingClientRect', patchedGetBCR, { configurable: true, force: true, writable: true })

    const origGetCR = realm.Element?.prototype?.getClientRects
    if (typeof origGetCR === 'function') {
      const patchedGetCR = new Proxy(origGetCR, {
        apply(target, self, args) {
          const list: DOMRectList = Reflect.apply(target, self, args)
          const cache = new Map<number, DOMRect>()
          const getTransformed = (i: number): DOMRect => {
            let r = cache.get(i)
            if (!r) { r = transformRect(list[i]); cache.set(i, r) }
            return r
          }
          const cachedItem = cloak((idx: number) => idx >= 0 && idx < list.length ? getTransformed(idx) : null, list.item)
          const cachedIterator = cloak(function* () { for (let i = 0; i < list.length; i++) yield getTransformed(i) }, list[Symbol.iterator] ?? function* () {})
          return new Proxy(list, {
            get(t, prop) {
              if (prop === 'item') return cachedItem
              if (prop === Symbol.iterator) return cachedIterator
              if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                const idx = Number(prop)
                return idx >= 0 && idx < t.length ? getTransformed(idx) : undefined
              }
              const v = Reflect.get(t, prop, t)
              return typeof v === 'function' ? v.bind(t) : v
            },
          })
        },
      })
      cloak(patchedGetCR, origGetCR)
      overload(realm.Element.prototype, 'getClientRects', patchedGetCR, { configurable: true, force: true, writable: true })
    }

    const svgProto = (realm as WindowRealm & { SVGGraphicsElement?: { prototype?: Record<string, unknown> } }).SVGGraphicsElement?.prototype
    if (svgProto && typeof svgProto.getBBox === 'function') {
      const origGetBBox = svgProto.getBBox as AnyFn
      const patchedGetBBox = new Proxy(origGetBBox, {
        apply(target, self, args) {
          const r = Reflect.apply(target, self, args) as { x: number; y: number; width: number; height: number } | null
          if (!r || typeof r.x !== 'number') return r
          if (mode === 'off') {
            try {
              nativeDefineProperty(r, 'x', { value: Math.round(r.x), configurable: true })
              nativeDefineProperty(r, 'y', { value: Math.round(r.y), configurable: true })
              nativeDefineProperty(r, 'width', { value: Math.round(r.width), configurable: true })
              nativeDefineProperty(r, 'height', { value: Math.round(r.height), configurable: true })
            } catch { void 0 }
            return r
          }
          const rng = prng(hashRect(r.x, r.y, r.width, r.height))
          try {
            nativeDefineProperty(r, 'x', { value: r.x + (rng() - 0.5) * 0.001, configurable: true })
            nativeDefineProperty(r, 'y', { value: r.y + (rng() - 0.5) * 0.001, configurable: true })
            nativeDefineProperty(r, 'width', { value: r.width + (rng() - 0.5) * 0.001, configurable: true })
            nativeDefineProperty(r, 'height', { value: r.height + (rng() - 0.5) * 0.001, configurable: true })
          } catch { void 0 }
          return r
        },
      })
      cloak(patchedGetBBox, origGetBBox)
      overload(svgProto, 'getBBox', patchedGetBBox, { configurable: true, force: true, writable: true })
    }
  }

  const applyTextMetricsSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const mode = spoofMode(plan, 'textMetrics')
    if (mode === 'real') return

    const noise = plan.profile?.textMetricsNoise
    if (mode === 'random' && typeof noise !== 'number') return

    const baseNoise = typeof noise === 'number' ? noise : 0
    const prng = (s: number) => { let x = s >>> 0; return () => { x += 0x6d2b79f5; let t = Math.imul(x ^ (x >>> 15), 1 | x); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 0x100000000 } }

    const hashStr = (str: string, extra: number): number => {
      let h = (baseNoise ^ extra) >>> 0
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); h = h >>> 0 }
      return h
    }

    const ctxStateKey = (ctx: CanvasRenderingContext2D, text: string): string => {
      const parts = [text, ctx.font || '']
      try { parts.push(ctx.direction || '', ctx.textBaseline || '', ctx.textAlign || '') } catch { void 0 }
      try {
        const c = ctx as CanvasRenderingContext2D & Record<string, unknown>
        if (typeof c.fontKerning === 'string') parts.push(c.fontKerning)
        if (typeof c.letterSpacing === 'string') parts.push(c.letterSpacing)
        if (typeof c.wordSpacing === 'string') parts.push(c.wordSpacing)
        if (typeof c.fontStretch === 'string') parts.push(c.fontStretch)
        if (typeof c.fontVariantCaps === 'string') parts.push(c.fontVariantCaps)
      } catch { void 0 }
      return parts.join('|')
    }

    const ctx2dProto = realm.CanvasRenderingContext2D?.prototype
    if (!ctx2dProto || typeof ctx2dProto.measureText !== 'function') return

    const origMeasure = ctx2dProto.measureText
    const patchedMeasure = new Proxy(origMeasure, {
      apply(target, self: CanvasRenderingContext2D, args: [string]) {
        const m: TextMetrics = Reflect.apply(target, self, args)
        const text = typeof args[0] === 'string' ? args[0] : ''
        const rng = prng(hashStr(ctxStateKey(self, text), baseNoise))
        const metricKeys = [
          'width', 'actualBoundingBoxLeft', 'actualBoundingBoxRight',
          'actualBoundingBoxAscent', 'actualBoundingBoxDescent',
          'fontBoundingBoxAscent', 'fontBoundingBoxDescent',
        ] as const
        const obj = m as unknown as Record<string, unknown>
        for (const key of metricKeys) {
          const orig = obj[key]
          if (typeof orig === 'number') {
            try {
              nativeDefineProperty(m, key, {
                value: mode === 'off' ? Math.round(orig * 100) / 100 : orig + (rng() - 0.5) * 0.0005,
                configurable: true,
                writable: false,
              })
            } catch { void 0 }
          }
        }
        return m
      },
    })
    cloak(patchedMeasure, origMeasure)
    overload(ctx2dProto, 'measureText', patchedMeasure, { configurable: true, force: true, writable: true })
  }

  const applyMathFingerprintSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const mode = spoofMode(plan, 'mathFingerprint')
    if (mode === 'real') return

    const cfg = plan.profile?.mathFingerprint
    if (mode === 'random' && !cfg) return

    const baseSeed = cfg?.noise ?? 0
    const hashInput = (fnIdx: number, ...vals: number[]): number => {
      let h = baseSeed >>> 0 ^ (fnIdx * 2654435761)
      for (const v of vals) { h ^= ((v * 1e10) | 0); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h = (h ^ (h >>> 16)) >>> 0 }
      return h
    }

    const mathFns: Array<keyof Math> = ['tan' as keyof Math, 'cos' as keyof Math, 'sin' as keyof Math, 'acos' as keyof Math, 'asin' as keyof Math, 'atan' as keyof Math, 'atan2' as keyof Math, 'sinh' as keyof Math, 'cosh' as keyof Math, 'tanh' as keyof Math]
    for (let fi = 0; fi < mathFns.length; fi++) {
      const fnName = mathFns[fi]
      const orig = realm.Math[fnName]
      if (typeof orig !== 'function') continue
      const fnIdx = fi
      const patched = new Proxy(orig as (...args: number[]) => number, {
        apply(target, self, args: number[]) {
          const result: number = Reflect.apply(target, self, args)
          if (!Number.isFinite(result) || result === 0) return result
          if (mode === 'off') return Math.round(result * 1e12) / 1e12
          const h = hashInput(fnIdx, ...args.filter((a): a is number => typeof a === 'number'))
          const frac = (h >>> 0) / 0x100000000
          return result + result * Number.EPSILON * (frac - 0.5) * 4
        },
      })
      cloak(patched, orig as AnyFn)
      overload(realm.Math, fnName, patched, { configurable: true, force: true, writable: true })
    }
  }

  const applySpeechVoicesSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const mode = spoofMode(plan, 'speechVoices')
    if (mode === 'real') return
    if (typeof realm.speechSynthesis === 'undefined') return

    const voices = mode === 'random' ? plan.profile?.speechVoices : []
    if (mode === 'random' && !voices) return

    const realmSSV = (realm as WindowRealm & { SpeechSynthesisVoice?: { prototype?: object } }).SpeechSynthesisVoice
    const voiceProto = realmSSV?.prototype ?? Object.prototype

    const builtVoices = (voices || []).map(v => {
      const obj = Object.create(voiceProto)
      nativeDefineProperty(obj, 'name', { get: cloak(() => v.name, function _name() { return '' }), enumerable: true, configurable: true })
      nativeDefineProperty(obj, 'lang', { get: cloak(() => v.lang, function _lang() { return '' }), enumerable: true, configurable: true })
      nativeDefineProperty(obj, 'localService', { get: cloak(() => v.localService, function _localService() { return false }), enumerable: true, configurable: true })
      nativeDefineProperty(obj, 'voiceURI', { get: cloak(() => v.voiceURI, function _voiceURI() { return '' }), enumerable: true, configurable: true })
      nativeDefineProperty(obj, 'default', { get: cloak(() => v.default, function _def() { return false }), enumerable: true, configurable: true })
      return obj as SpeechSynthesisVoice
    })

    const speech = realm.speechSynthesis as SpeechSynthesis & EventTarget & Record<string, unknown>
    const origGetVoices = speech.getVoices
    if (typeof origGetVoices !== 'function') return
    const patchedGetVoices = new Proxy(origGetVoices, {
      apply() { return [...builtVoices] },
    })
    cloak(patchedGetVoices, origGetVoices)
    overload(speech, 'getVoices', patchedGetVoices, { configurable: true, force: true, writable: true })

    if (!('onvoiceschanged' in speech)) {
      nativeDefineProperty(speech, 'onvoiceschanged', { value: null, configurable: true, writable: true })
    }

    realm.setTimeout(() => {
      try {
        const ev = new realm.Event('voiceschanged')
        speech.dispatchEvent(ev)
        const handler = speech.onvoiceschanged
        if (typeof handler === 'function') {
          handler.call(speech, ev)
        }
      } catch { void 0 }
    }, 0)
  }

  const applyWebRtcSurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    if (spoofMode(plan, 'webrtc') === 'real') return
    const mode = spoofMode(plan, 'webrtc')

    const RTC = (realm as WindowRealm & { RTCPeerConnection?: new (...args: unknown[]) => RTCPeerConnection }).RTCPeerConnection
    if (typeof RTC !== 'function') return

    if (mode === 'off') {
      overload(realm, 'RTCPeerConnection', undefined, { configurable: true, force: true })
      overload(realm, 'webkitRTCPeerConnection', undefined, { configurable: true, force: true })
      return
    }

    const stripCandidateIPs = (sdp: string): string =>
      sdp.replace(/([0-9]{1,3}\.){3}[0-9]{1,3}/g, (ip) => {
        if (ip === '0.0.0.0' || ip.startsWith('127.')) return ip
        return '0.0.0.0'
      })

    const sanitizeSDP = (desc: RTCSessionDescriptionInit | undefined): RTCSessionDescriptionInit | undefined => {
      if (!desc?.sdp) return desc
      return { ...desc, sdp: stripCandidateIPs(desc.sdp) }
    }

    const NativeRTC = RTC
    const patchedRTC = new Proxy(NativeRTC, {
      construct(target, args, newTarget) {
        const config = args[0] && typeof args[0] === 'object' ? { ...(args[0] as RTCConfiguration) } : {}
        args[0] = config
        const instance = Reflect.construct(target, args, newTarget) as RTCPeerConnection

        const wrapSdpMethod = (methodName: string) => {
          const orig = (instance as unknown as Record<string, unknown>)[methodName]
          if (typeof orig !== 'function') return
          const wrapped = new Proxy(orig as (...a: unknown[]) => Promise<unknown>, {
            apply(t, s, a) {
              return Promise.resolve(Reflect.apply(t, s, a)).then((result) => {
                if (result && typeof result === 'object' && 'sdp' in (result as Record<string, unknown>)) {
                  return sanitizeSDP(result as RTCSessionDescriptionInit)
                }
                return result
              })
            },
          })
          cloak(wrapped, orig as AnyFn)
          try { nativeDefineProperty(instance, methodName, { value: wrapped, writable: true, configurable: true }) } catch { void 0 }
        }
        wrapSdpMethod('createOffer')
        wrapSdpMethod('createAnswer')

        const origSetLocal = instance.setLocalDescription
        if (typeof origSetLocal === 'function') {
          const patchedSetLocal = new Proxy(origSetLocal, {
            apply(t, s, a: [RTCSessionDescriptionInit?]) {
              if (a[0]?.sdp) a[0] = sanitizeSDP(a[0])!
              return Reflect.apply(t, s, a)
            },
          })
          cloak(patchedSetLocal, origSetLocal)
          try { nativeDefineProperty(instance, 'setLocalDescription', { value: patchedSetLocal, writable: true, configurable: true }) } catch { void 0 }
        }

        const sanitizeCandidate = (value: unknown): unknown => {
          if (!value || typeof value !== 'object') return value
          const source = value as Record<string, unknown>
          const candidateRaw = typeof source['candidate'] === 'string' ? source['candidate'] : ''
          const candidate = candidateRaw ? stripCandidateIPs(candidateRaw) : candidateRaw
          const address = typeof source['address'] === 'string' ? stripCandidateIPs(source['address']) : source['address']
          const relatedAddress = typeof source['relatedAddress'] === 'string' ? stripCandidateIPs(source['relatedAddress']) : source['relatedAddress']
          return new Proxy(source, {
            get(t, prop, receiver) {
              if (prop === 'candidate') return candidate
              if (prop === 'address') return address
              if (prop === 'relatedAddress') return relatedAddress
              return Reflect.get(t, prop, receiver)
            },
          })
        }

        const wrapEventHandler = (prop: 'onicecandidate' | 'onicecandidateerror') => {
          const desc = nativeGetOwnPropertyDescriptor(Object.getPrototypeOf(instance), prop)
          if (!desc || typeof desc.set !== 'function' || typeof desc.get !== 'function') return
          nativeDefineProperty(instance, prop, {
            configurable: true,
            enumerable: desc.enumerable ?? true,
            get() { return Reflect.apply(desc.get as AnyFn, instance, []) },
            set(handler: unknown) {
              if (typeof handler !== 'function') {
                Reflect.apply(desc.set as AnyFn, instance, [handler])
                return
              }
              const wrapped = function(this: unknown, event: Event & { candidate?: unknown }) {
                if (event && typeof event === 'object' && 'candidate' in event) {
                  const eventRecord = event as unknown as Record<string, unknown>
                  const sanitized = sanitizeCandidate(eventRecord['candidate'])
                  if (sanitized !== eventRecord['candidate']) {
                    const proxyEvent = new Proxy(eventRecord, {
                      get(t, key, receiver) {
                        if (key === 'candidate') return sanitized
                        return Reflect.get(t, key, receiver)
                      },
                    })
                    return Reflect.apply(handler as AnyFn, this, [proxyEvent])
                  }
                }
                return Reflect.apply(handler as AnyFn, this, [event])
              }
              cloak(wrapped as AnyFn, handler as AnyFn)
              Reflect.apply(desc.set as AnyFn, instance, [wrapped])
            },
          })
        }
        wrapEventHandler('onicecandidate')
        wrapEventHandler('onicecandidateerror')

        const origAddIce = instance.addIceCandidate
        if (typeof origAddIce === 'function') {
          const patchedAddIce = new Proxy(origAddIce, {
            apply(t, s, a: [RTCIceCandidateInit | RTCIceCandidate | null | undefined]) {
              if (a[0] && typeof a[0] === 'object' && 'candidate' in (a[0] as Record<string, unknown>)) {
                const next = { ...(a[0] as Record<string, unknown>) }
                if (typeof next['candidate'] === 'string') next['candidate'] = stripCandidateIPs(next['candidate'])
                if (typeof next['address'] === 'string') next['address'] = stripCandidateIPs(next['address'])
                if (typeof next['relatedAddress'] === 'string') next['relatedAddress'] = stripCandidateIPs(next['relatedAddress'])
                a[0] = next as RTCIceCandidateInit
              }
              return Reflect.apply(t, s, a)
            },
          })
          cloak(patchedAddIce, origAddIce)
          try { nativeDefineProperty(instance, 'addIceCandidate', { value: patchedAddIce, writable: true, configurable: true }) } catch { void 0 }
        }

        return instance
      },
    })
    cloak(patchedRTC, NativeRTC)
    overload(realm, 'RTCPeerConnection', patchedRTC, { configurable: true, force: true, writable: true })
    if ('webkitRTCPeerConnection' in realm) {
      overload(realm, 'webkitRTCPeerConnection', patchedRTC, { configurable: true, force: true, writable: true })
    }
  }

  const applyBatterySurface = (realm: WindowRealm, plan: RuntimePlan): void => {
    const profile = plan.profile
    if (!profile || spoofMode(plan, 'battery') === 'real') return
    const mode = spoofMode(plan, 'battery')

    const navWithBattery = realm.navigator as Navigator & { getBattery?: () => Promise<unknown> }
    if (typeof navWithBattery.getBattery !== 'function') return

    if (mode === 'off') {
      overload(navWithBattery, 'getBattery', undefined, { configurable: true, force: true })
      return
    }

    const origGetBattery = navWithBattery.getBattery
    const patchedGetBattery = new Proxy(origGetBattery, {
      apply(target, self, args) {
        return Promise.resolve(Reflect.apply(target, self, args)).then((bm: unknown) => {
          if (!bm || typeof bm !== 'object') return bm
          const battery = bm as Record<string, unknown>
          return new Proxy(battery, {
            get(t, prop, receiver) {
              switch (prop) {
                case 'level': return profile.batteryLevel
                case 'charging': return profile.batteryCharging
                case 'chargingTime': return profile.batteryCharging ? 0 : Infinity
                case 'dischargingTime': return profile.batteryCharging ? Infinity : 28800
                default: {
                  const v = Reflect.get(t, prop, receiver)
                  return typeof v === 'function' ? (v as AnyFn).bind(t) : v
                }
              }
            },
          })
        })
      },
    })
    cloak(patchedGetBattery, origGetBattery)
    overload(navWithBattery, 'getBattery', patchedGetBattery, { configurable: true, force: true, writable: true })
  }

  const runtimeSurfaceRegistry: readonly SurfaceDefinition[] = [
    {
      // browserCapabilities runs FIRST — manages presence of capability globals
      // (window.chrome, navigator.userAgentData, cookieStore, SW props).
      // navigatorIdentity runs AFTER and patches values onto whatever presence
      // browserCapabilities decided to keep or synthesize.
      id: 'browserCapabilities',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'browserCapabilities'),
      apply: (realm, plan) => applyBrowserCapabilitiesSurface(realm, plan),
    },
    {
      id: 'navigatorIdentity',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'navigatorIdentity'),
      apply: (realm, plan) => {
        getRealmNavigatorTargets(realm).forEach((navigatorLike) => applyNavigatorIdentitySurface(navigatorLike, plan))
        applyMediaCapabilitiesSurface(realm, plan)
      },
    },
    {
      id: 'screen',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'screen'),
      apply: (realm, plan) => applyWindowScreenSurface(realm, plan),
    },
    {
      id: 'webgl',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'webgl'),
      apply: (realm, plan) => applyWebGlSurface(realm, plan),
    },
    {
      id: 'webGpu',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'webGpu'),
      apply: (realm, plan) => applyWebGpuSurface(realm, plan),
    },
    {
      id: 'mediaDevices',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'mediaDevices'),
      apply: (realm, plan) => applyMediaDevicesSurface(realm, plan),
    },
    {
      id: 'fonts',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'fonts'),
      apply: (realm, plan) => applyFontsSurface(realm, plan),
    },
    {
      id: 'permissions',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'permissions'),
      apply: (realm, plan) => applyPermissionsSurface(realm, plan),
    },
    {
      id: 'pdfViewer',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'pdfViewer'),
      apply: (realm, plan) => applyPdfViewerSurface(realm, plan),
    },
    {
      id: 'intl',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'intl'),
      apply: (realm, plan) => applyIntlSurface(realm, plan),
    },
    {
      id: 'canvas',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'canvas'),
      apply: (realm, plan) => applyCanvasSurface(realm, plan),
    },
    {
      id: 'audio',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'audio'),
      apply: (realm, plan) => applyAudioSurface(realm, plan),
    },
    {
      // Timezone is AFTER intl in registry — it wraps the locale proxy already
      // set by applyIntlSurface, adding timeZone on top without losing locale.
      id: 'timezone',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'timezone'),
      apply: (realm, plan) => applyTimezoneSurface(realm, plan),
    },
    {
      id: 'domRect',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'domRect'),
      apply: (realm, plan) => applyDomRectSurface(realm, plan),
    },
    {
      id: 'textMetrics',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'textMetrics'),
      apply: (realm, plan) => applyTextMetricsSurface(realm, plan),
    },
    {
      id: 'mathFingerprint',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'mathFingerprint'),
      apply: (realm, plan) => applyMathFingerprintSurface(realm, plan),
    },
    {
      id: 'speechVoices',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'speechVoices'),
      apply: (realm, plan) => applySpeechVoicesSurface(realm, plan),
    },
    {
      id: 'webrtc',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'webrtc'),
      apply: (realm, plan) => applyWebRtcSurface(realm, plan),
    },
    {
      id: 'battery',
      shouldApply: (plan) => surfaceIsEnabled(plan, 'battery'),
      apply: (realm, plan) => applyBatterySurface(realm, plan),
    },
  ]

  try {
    findAndRemoveScriptTag()

    const payload = extractPayloadFromCookie()
    if (!payload) {
      return
    }

    clearPayloadCookie()

    const plan = createRuntimePlan(payload, window as WindowRealm)
    currentPlanRef = plan

    applyRuntimeSurfacesToRealm(window as WindowRealm, plan)

    Array.from(document.getElementsByTagName('iframe')).forEach((node) => applyRuntimeSurfaceToIframe(node, plan))
  } catch (err) {
    console.warn('💣 RUA: An error occurred in the injected script', err)
  }
})()
