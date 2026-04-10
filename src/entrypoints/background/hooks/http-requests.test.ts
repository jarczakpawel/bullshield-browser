import { beforeEach, describe, expect, it, vi } from "vitest"
import { setRequestHeaders } from "./http-requests"
import { buildFingerprintProfile } from "~/shared/fingerprint/profile"
import type { ReadonlyUserAgentState } from "~/shared/types"

const updateDynamicRules = vi.fn<(payload: unknown) => Promise<void>>(async () => undefined)

globalThis.chrome = {
  declarativeNetRequest: {
    ResourceType: { MAIN_FRAME: "main_frame", SUB_FRAME: "sub_frame", XMLHTTPREQUEST: "xmlhttprequest" },
    updateDynamicRules,
  },
} as unknown as typeof chrome

const makeUA = (browser: ReadonlyUserAgentState["browser"]): ReadonlyUserAgentState => {
  const base: ReadonlyUserAgentState = {
    userAgent: `Mozilla/5.0 test ${browser}`,
    browser,
    os: browser === "safari" ? "macOS" : browser === "firefox" ? "linux" : "windows",
    version: {
      browser: { major: 133, full: "133.0.0.0" },
      underHood: { major: 133, full: "133.0.0.0" },
    },
  } as ReadonlyUserAgentState

  return {
    ...base,
    fingerprint: buildFingerprintProfile(base),
  }
}

describe("setRequestHeaders client hints coherence", () => {
  beforeEach(() => {
    updateDynamicRules.mockClear()
  })

  it("real + firefox persona strips Chromium CH headers", async () => {
    await setRequestHeaders(makeUA("firefox"), "real")
    const payload = updateDynamicRules.mock.calls[0]?.[0] as {
      removeRuleIds: number[]
      addRules: Array<{ id: number; action: { requestHeaders: Array<{ operation: string }> } }>
    } | undefined

    expect(payload).toBeTruthy()
    expect(payload?.removeRuleIds).toEqual([1, 2])
    expect(payload?.addRules).toHaveLength(2)
    const chRule = payload?.addRules.find((r) => r.id === 2)
    expect(chRule).toBeTruthy()
    expect(chRule?.action.requestHeaders.every((h) => h.operation === "remove")).toBe(true)
  })

  it("real + chrome persona leaves CH unmanaged by DNR", async () => {
    await setRequestHeaders(makeUA("chrome"), "real")
    const payload = updateDynamicRules.mock.calls[0]?.[0] as {
      addRules: Array<{ id: number }>
    } | undefined

    expect(payload).toBeTruthy()
    expect(payload?.addRules).toHaveLength(1)
    expect(payload?.addRules[0]?.id).toBe(1)
  })
})
