import { SCHEMA_VERSION } from '../domain/schema'
import { createInitialDataState } from './initialState'
import type { DataState } from './types'

/**
 * Brings a persisted snapshot up to the current schema version.
 *
 * Only version 1 exists today, but the function is wired up so future versions
 * have a single place to add a step, and so unreadable snapshots fall back to a
 * clean state instead of crashing the app on load.
 */
export function migratePersistedState(persisted: unknown, version: number): DataState {
  const base = createInitialDataState()
  if (typeof persisted !== 'object' || persisted === null) return base

  let state = { ...base, ...(persisted as Partial<DataState>) } as DataState
  const from = Number.isFinite(version) ? version : 0

  // Step 0 → 1: snapshots written before versioning existed.
  if (from < 1) {
    state = { ...state, schemaVersion: 1 }
  }

  // Future steps go here, each guarded by the version it upgrades from.

  return { ...state, schemaVersion: SCHEMA_VERSION }
}
