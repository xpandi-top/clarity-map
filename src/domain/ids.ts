let counter = 0

/**
 * Prefixed unique id. `crypto.randomUUID` when available, otherwise a
 * timestamp/counter fallback so tests and older browsers still work.
 */
export function createId(prefix = 'id'): string {
  const globalCrypto = globalThis.crypto
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return `${prefix}_${globalCrypto.randomUUID()}`
  }
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
