import { createDefaultDimensions } from '../domain/defaults'
import { backfillBuiltInPrompts } from '../domain/prompts'
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

  // Step 1 → 2: built-in dimensions gained a comparative question. Without
  // this, existing workspaces fall back to generated wording on the Compare
  // screen even though better wording ships with the app.
  if (from < 2) {
    const defaults = createDefaultDimensions()
    const dimensionsByWorkspace: DataState['dimensionsByWorkspace'] = {}
    for (const [workspaceId, dimensions] of Object.entries(state.dimensionsByWorkspace ?? {})) {
      dimensionsByWorkspace[workspaceId] = backfillBuiltInPrompts(dimensions, defaults)
    }
    state = { ...state, dimensionsByWorkspace }
  }

  // Future steps go here, each guarded by the version it upgrades from.

  return { ...state, schemaVersion: SCHEMA_VERSION }
}
