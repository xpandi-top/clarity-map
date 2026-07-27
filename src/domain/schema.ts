/**
 * Bump when the persisted shape changes, and add a migration step.
 *
 * 1 — first release.
 * 2 — dimensions gained `comparativeQuestion`, the wording used when weighing
 *     two thoughts against each other.
 */
export const SCHEMA_VERSION = 2

export const STORAGE_KEY = 'clarity-map-storage'
