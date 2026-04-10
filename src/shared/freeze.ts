/** Deeply freezes any value. */
export const deepFreeze = <T>(v: T): T => {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    for (const key of Reflect.ownKeys(v)) {
      const value = (v as Record<PropertyKey, unknown>)[key]
      if (value && typeof value === 'object') {
        deepFreeze(value)
      }
    }

    Object.freeze(v)
  }

  return v
}
